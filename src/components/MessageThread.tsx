"use client";

import { useEffect, useRef, useState } from "react";
import { authFetch } from "@/lib/api";
import type { Message, Role } from "@/lib/types";

interface Member {
  id: string;
  name: string | null;
  role: Role;
}

export default function MessageThread({
  childId,
  currentUserId,
  members,
  initialMessages,
}: {
  childId: string;
  currentUserId: string;
  members: Member[];
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const memberMap = new Map(members.map((m) => [m.id, m]));

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const content = draft.trim();
    if (!content) return;
    setSending(true);
    setError(null);
    try {
      const res = await authFetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ child_id: childId, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send message");
      setMessages((m) => [...m, data.message as Message]);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card flex flex-col p-6">
      <h2 className="text-lg font-bold">Home ↔ school messages</h2>
      <p className="mt-1 text-sm text-muted">
        A shared thread between everyone on this child&rsquo;s dashboard.
      </p>

      <div className="mt-4 max-h-96 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <p className="rounded-2xl bg-sand/60 px-4 py-6 text-center text-sm text-muted">
            No messages yet — say hello and start the conversation.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === currentUserId;
          const sender = memberMap.get(m.sender_id);
          return (
            <div
              key={m.id}
              className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
            >
              <span className="mb-1 px-1 text-xs font-semibold text-muted">
                {mine ? "You" : sender?.name || "Member"}
                {sender ? ` · ${sender.role}` : ""}
              </span>
              <div
                className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                  mine
                    ? "bg-coral text-white"
                    : "bg-sand text-ink border border-clay/60"
                }`}
              >
                {m.content}
              </div>
              <span className="mt-1 px-1 text-[11px] text-muted">
                {new Date(m.created_at).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {error && (
        <p className="mt-3 rounded-2xl bg-coral-light/40 px-4 py-2 text-sm font-semibold text-coral-dark">
          {error}
        </p>
      )}

      <div className="mt-4 flex items-end gap-2">
        <textarea
          className="input min-h-[48px] resize-y"
          placeholder="Write a message…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button
          type="button"
          className="btn-primary shrink-0"
          onClick={send}
          disabled={sending || !draft.trim()}
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
      <p className="mt-1.5 text-[11px] text-muted">
        Tip: press ⌘/Ctrl + Enter to send.
      </p>
    </div>
  );
}
