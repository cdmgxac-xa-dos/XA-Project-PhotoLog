import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { useAuth } from "../lib/useAuth.js";
import Button from "./Button.jsx";

function channelName(projectId, category) {
  return `photolog-chat:${projectId}:${category.replace(/\s+/g, "_")}`;
}

// Ephemeral, category-scoped live chat -- deliberately NOT persisted
// anywhere (no table, no history). Uses Supabase Realtime Broadcast:
// messages are relayed only to whoever's currently connected to this
// project+category channel, then gone. Switching category or
// reconnecting always starts from an empty history, by design.
export default function CategoryChat({ project, category }) {
  const { appUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [connected, setConnected] = useState(false);
  const channelRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    setMessages([]);
    setConnected(false);
    const channel = supabase.channel(channelName(project.id, category));
    channel
      .on("broadcast", { event: "message" }, ({ payload }) => {
        setMessages((prev) => [...prev.slice(-199), payload]);
      })
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [project.id, category]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  function send() {
    const trimmed = text.trim();
    if (!trimmed || !channelRef.current) return;
    const payload = {
      text: trimmed,
      name: appUser?.employee?.full_name || appUser?.employee_code || "—",
      role: appUser?.roles?.role_name || "",
      at: new Date().toISOString(),
    };
    channelRef.current.send({ type: "broadcast", event: "message", payload });
    setMessages((prev) => [...prev.slice(-199), payload]);
    setText("");
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
            <p className="text-sm text-text-primary mt-1 break-words">{m.text}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2 pt-2 border-t border-hair-soft">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={`Message about ${category}...`}
          className="flex-1 bg-void border border-hair rounded-control px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand-blue"
        />
        <Button size="md" onClick={send} disabled={!text.trim()}>Send</Button>
      </div>
    </div>
  );
}
