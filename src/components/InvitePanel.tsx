"use client";

import { useState } from "react";
import { authFetch } from "@/lib/api";
import type { Invite, Role } from "@/lib/types";

interface Member {
  id: string;
  name: string | null;
  role: Role;
}

export default function InvitePanel({
  childId,
  childName,
  members,
  initialInvites,
}: {
  childId: string;
  childName: string;
  members: Member[];
  initialInvites: Invite[];
}) {
  const [invites, setInvites] = useState<Invite[]>(initialInvites);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("parent");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLink, setLastLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function createInvite() {
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    setLastLink(null);
    try {
      const res = await authFetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ child_id: childId, email, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create invite");
      setLastLink(data.link);
      setInvites((cur) => {
        const without = cur.filter((i) => i.id !== data.invite.id);
        return [data.invite as Invite, ...without];
      });
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — link is still visible to copy manually */
    }
  }

  const appOrigin =
    typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="card p-6">
      <h2 className="text-lg font-bold">Share this dashboard</h2>
      <p className="mt-1 text-sm text-muted">
        Invite {childName}&rsquo;s parent or another teacher. They&rsquo;ll get
        their own view of this profile, with the same documents, activity and
        messages.
      </p>

      {/* Who's on the dashboard */}
      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          On this dashboard
        </p>
        <ul className="mt-2 space-y-1.5">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-2 text-sm">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-sage text-[11px] font-bold text-white">
                {(m.name || "?").charAt(0).toUpperCase()}
              </span>
              <span className="font-semibold">{m.name || "Member"}</span>
              <span className="chip bg-sand text-muted">{m.role}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* New invite */}
      <div className="mt-5 space-y-2">
        <input
          className="input"
          type="email"
          placeholder="their@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="flex gap-2">
          <select
            className="input"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            <option value="parent">Invite as parent</option>
            <option value="teacher">Invite as teacher</option>
          </select>
          <button
            type="button"
            className="btn-primary shrink-0"
            onClick={createInvite}
            disabled={busy || !email.trim()}
          >
            {busy ? "…" : "Create link"}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-2xl bg-coral-light/40 px-4 py-2 text-sm font-semibold text-coral-dark">
          {error}
        </p>
      )}

      {lastLink && (
        <div className="mt-3 rounded-2xl bg-sage-light/30 p-3">
          <p className="text-xs font-semibold text-sage-dark">
            Invite link ready — send this to them:
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg bg-white px-2 py-1.5 text-xs">
              {lastLink}
            </code>
            <button
              type="button"
              className="btn-secondary px-3 py-1.5 text-sm"
              onClick={() => copy(lastLink)}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {/* Existing invites */}
      {invites.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Invites
          </p>
          <ul className="mt-2 space-y-2">
            {invites.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between gap-2 rounded-2xl bg-sand/60 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">{inv.email}</p>
                  <p className="text-xs text-muted">
                    as {inv.role} ·{" "}
                    {inv.accepted ? "✅ accepted" : "⏳ pending"}
                  </p>
                </div>
                {!inv.accepted && (
                  <button
                    type="button"
                    className="btn-ghost px-3 py-1.5 text-xs"
                    onClick={() =>
                      copy(`${appOrigin}/invite/${inv.token}`)
                    }
                  >
                    {copied ? "Copied!" : "Copy link"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
