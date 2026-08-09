import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { useAuth } from "../lib/useAuth.js";
import { listProjectParticipants } from "../lib/projectPhotoLog.js";
import { notifyMention } from "../lib/notifications.js";
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

// Ephemeral, category-scoped live chat -- deliberately NOT persisted
// anywhere (no table, no history). Uses Supabase Realtime Broadcast:
// messages are relayed only to whoever's currently connected to this
// project+category channel, then gone. @mentions additionally fire a
// push notification (via the send-mention-notification Edge Function)
// so the mentioned person hears about it even with the app closed.
export default function CategoryChat({ project, category }) {
  const { appUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [connected, setConnected] = useState(false);
  const [participants, setParticipants] = useState([]); // {id, name}
  const [mentionQuery, setMentionQuery] = useState(null); // string | null -- non-null while typing "@..."
  const [draftMentions, setDraftMentions] = useState([]); // [{id, name}] inserted into the current draft
  const channelRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const selfName = appUser?.employee?.full_name || appUser?.employee_code || "—";

  useEffect(() => {
    listProjectParticipants(project.id).then(setParticipants).catch(() => {});
  }, [project.id]);

  useEffect(() => {
    setMessages([]);
    setConnected(false);
    setDraftMentions([]);
    const channel = supabase.channel(channelName(project.id, category), {
      config: { presence: { key: appUser?.id } },
    });

    channel
      .on("broadcast", { event: "message" }, ({ payload }) => {
        setMessages((prev) => [...prev.slice(-199), payload]);
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const present = Object.values(state)
          .flat()
          .map((p) => ({ id: p.user_id, name: p.name }))
          .filter((p) => p.id);
        setParticipants((prev) => {
          const merged = new Map(prev.map((p) => [p.id, p.name]));
          present.forEach((p) => merged.set(p.id, p.name));
          return [...merged.entries()].map(([id, name]) => ({ id, name }));
        });
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          setConnected(true);
          await channel.track({ user_id: appUser?.id, name: selfName });
        }
      });

    channelRef.current = channel;
    return () => {
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

  function send() {
    const trimmed = text.trim();
    if (!trimmed || !channelRef.current) return;

    const mentionsInText = draftMentions.filter((m) => trimmed.includes(`@${m.name}`));
    const payload = {
      text: trimmed,
      name: selfName,
      role: appUser?.roles?.role_name || "",
      at: new Date().toISOString(),
      mentions: mentionsInText,
    };
    channelRef.current.send({ type: "broadcast", event: "message", payload });
    setMessages((prev) => [...prev.slice(-199), payload]);

    mentionsInText.forEach((m) => {
      notifyMention({ projectId: project.id, category, recipientUserId: m.id, messageText: trimmed });
    });

    setText("");
    setDraftMentions([]);
    setMentionQuery(null);
  }

  return (
    <div className="flex flex-col" style={{ height: "55vh" }}>
      <div ref={listRef} className="flex-1 overflow-y-auto space-y-2.5 pb-3">
        {messages.length === 0 && (
          <p className="text-xs text-text-tertiary text-center py-8">
            {connected ? "No messages yet — say something. Nothing here is saved." : "Connecting..."}
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className="bg-panel border border-hair-soft rounded-control px-3 py-2">
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
