import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { useAuth } from "../lib/useAuth.js";
import { listProjectParticipants } from "../lib/projectPhotoLog.js";
import { listChatMessages, sendChatMessage } from "../lib/chatMessages.js";
import Button from "./Button.jsx";

function channelName(projectId, category) {
  return `photolog-chat:${projectId}:${category.replace(/\s+/g, "_")}`;
}

// Splits "hey @John Dela Cruz check this" into plain-text and mention
// segments for rendering, given the known {id, name} mentions on a
// message.
function renderWithMentions(text, mentions) {
  if (!mentions || mentions.length === 0) return text;
  const names = mentions.map((m) => m.name).sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`(@(?:${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")}))`, "g");
  return text.split(pattern).map((part, i) =>
    part.startsWith("@") && names.some((n) => part === `@${n}`) ? (
      <span key={i} className="text-brand-blue font-semibold">{part}</span>
    ) : (
      part
    )
  );
}

// Category-scoped chat with bounded history: the last 50 messages per
// project+category, server-enforced (see migration
// 10_photolog_chat_persistence.sql) so it can't grow unbounded. New
// messages arrive via Realtime postgres_changes (an INSERT into
// photolog_chat_messages), not a manual broadcast -- that way the
// sender sees their own message the same way everyone else does, no
// separate optimistic-append path to keep in sync. Every message pushes
// a notification to the rest of the team (see migration
// 11_chat_notification_trigger.sql), with the title/body adjusted for
// anyone actually @mentioned -- that trigger reads the mentions we
// insert alongside the message, so there's no separate client-side call
// needed here for that.
export default function CategoryChat({ project, category }) {
  const { appUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [connected, setConnected] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sendError, setSendError] = useState("");
  const [participants, setParticipants] = useState([]); // {id, name, role}
  const [mentionQuery, setMentionQuery] = useState(null); // string | null -- non-null while typing "@..."
  const [draftMentions, setDraftMentions] = useState([]); // [{id, name}] inserted into the current draft
  const channelRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const participantsRef = useRef([]);

  const selfName = appUser?.employee?.full_name || appUser?.employee_code || "—";
  const selfRole = appUser?.roles?.role_name || "";

  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  useEffect(() => {
    listProjectParticipants(project.id)
      .then((rows) => setParticipants((prev) => mergeParticipants(prev, rows)))
      .catch(() => {});
  }, [project.id]);

  useEffect(() => {
    let cancelled = false;
    setMessages([]);
    setConnected(false);
    setDraftMentions([]);
    setSendError("");
    setLoadingHistory(true);

    listChatMessages(project.id, category)
      .then((rows) => { if (!cancelled) setMessages(rows); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingHistory(false); });

    const channel = supabase.channel(channelName(project.id, category), {
      config: { presence: { key: appUser?.id } },
    });

    channel
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "photolog_chat_messages", filter: `project_id=eq.${project.id}` },
        ({ new: row }) => {
          if (row.category !== category) return;
          const known = participantsRef.current.find((p) => p.id === row.user_id);
          const isSelf = row.user_id === appUser?.id;
          setMessages((prev) => [
            ...prev.slice(-49),
            {
              id: row.id,
              text: row.message_text,
              name: isSelf ? selfName : known?.name || "Teammate",
              role: isSelf ? selfRole : known?.role || "",
              at: row.created_at,
              mentions: row.mentions || [],
            },
          ]);
        }
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const present = Object.values(state)
          .flat()
          .map((p) => ({ id: p.user_id, name: p.name, role: p.role }))
          .filter((p) => p.id);
        setParticipants((prev) => mergeParticipants(prev, present));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          setConnected(true);
          await channel.track({ user_id: appUser?.id, name: selfName, role: selfRole });
        }
      });

    channelRef.current = channel;
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id, category]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const mentionMatches = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return participants
      .filter((p) => p.id !== appUser?.id && p.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [mentionQuery, participants, appUser?.id]);

  function handleTextChange(value) {
    setText(value);
    const cursor = inputRef.current?.selectionStart ?? value.length;
    const upToCursor = value.slice(0, cursor);
    const match = upToCursor.match(/@([^\s@]*)$/);
    setMentionQuery(match ? match[1] : null);
  }

  function pickMention(candidate) {
    const cursor = inputRef.current?.selectionStart ?? text.length;
    const upToCursor = text.slice(0, cursor);
    const replaced = upToCursor.replace(/@([^\s@]*)$/, `@${candidate.name} `);
    const newText = replaced + text.slice(cursor);
    setText(newText);
    setMentionQuery(null);
    setDraftMentions((prev) => (prev.some((m) => m.id === candidate.id) ? prev : [...prev, candidate]));
    inputRef.current?.focus();
  }

  async function send() {
    const trimmed = text.trim();
    if (!trimmed || !appUser?.id) return;
    setSendError("");

    const mentionsInText = draftMentions.filter((m) => trimmed.includes(`@${m.name}`));
    const draftText = trimmed;
    setText("");
    setDraftMentions([]);
    setMentionQuery(null);

    try {
      // Notifying the team (mention-aware) happens server-side via the
      // insert trigger -- see migration 11_chat_notification_trigger.sql.
      await sendChatMessage({ projectId: project.id, category, userId: appUser.id, text: draftText, mentions: mentionsInText });
    } catch (err) {
      setSendError(err.message || "Message failed to send.");
      setText(draftText); // give it back so nothing's lost
    }
  }

  return (
    <div className="flex flex-col" style={{ height: "55vh" }}>
      <div ref={listRef} className="flex-1 overflow-y-auto space-y-2.5 pb-3">
        {loadingHistory && <p className="text-xs text-text-tertiary text-center py-8">Loading...</p>}
        {!loadingHistory && messages.length === 0 && (
          <p className="text-xs text-text-tertiary text-center py-8">
            {connected ? "No messages yet — say something." : "Connecting..."}
          </p>
        )}
        {messages.map((m, i) => (
          <div key={m.id ?? i} className="bg-panel border border-hair-soft rounded-control px-3 py-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-semibold text-text-primary">{m.name}</span>
              <span className="text-[10px] text-text-tertiary shrink-0">
                {new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            {m.role && <p className="text-[11px] text-text-tertiary">{m.role}</p>}
            <p className="text-sm text-text-primary mt-1 break-words">{renderWithMentions(m.text, m.mentions)}</p>
          </div>
        ))}
      </div>

      <div className="relative pt-2 border-t border-hair-soft">
        {mentionQuery !== null && mentionMatches.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 mb-1 bg-panel border border-hair rounded-control shadow-panel overflow-hidden">
            {mentionMatches.map((c) => (
              <button
                key={c.id}
                onClick={() => pickMention(c)}
                className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-panel-raised"
              >
                @{c.name}
              </button>
            ))}
          </div>
        )}
        {sendError && <p className="text-xs text-status-red mb-1.5">{sendError}</p>}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && mentionQuery === null && send()}
            placeholder={`Message about ${category}... (@ to mention)`}
            className="flex-1 bg-void border border-hair rounded-control px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand-blue"
          />
          <Button size="md" onClick={send} disabled={!text.trim()}>Send</Button>
        </div>
      </div>
    </div>
  );
}

function mergeParticipants(prev, additions) {
  const merged = new Map(prev.map((p) => [p.id, p]));
  additions.forEach((p) => merged.set(p.id, { ...merged.get(p.id), ...p }));
  return [...merged.values()];
}
