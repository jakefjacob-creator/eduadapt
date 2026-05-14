"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import type { Role } from "@/lib/types";

export default function InviteAccept({
  token,
  childName,
  role,
  alreadyAccepted,
}: {
  token: string;
  childName: string;
  role: Role;
  alreadyAccepted: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not accept invite");
      router.push(`/dashboard/children/${data.child_id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  const redirect = `/invite/${token}`;

  return (
    <div className="mt-6">
      <SignedOut>
        <p className="text-sm text-muted">
          Sign in or create your free account to join {childName}&rsquo;s
          dashboard as a <strong>{role}</strong>.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={`/sign-up?redirect_url=${encodeURIComponent(redirect)}`}
            className="btn-primary"
          >
            Create account &amp; join
          </Link>
          <Link
            href={`/sign-in?redirect_url=${encodeURIComponent(redirect)}`}
            className="btn-ghost"
          >
            I already have an account
          </Link>
        </div>
      </SignedOut>

      <SignedIn>
        {error && (
          <p className="mb-3 rounded-2xl bg-coral-light/40 px-4 py-2.5 text-sm font-semibold text-coral-dark">
            {error}
          </p>
        )}
        <button
          type="button"
          className="btn-primary w-full text-base"
          onClick={accept}
          disabled={busy}
        >
          {busy
            ? "Joining…"
            : alreadyAccepted
              ? `Open ${childName}'s dashboard`
              : `Join ${childName}'s dashboard as ${role}`}
        </button>
      </SignedIn>
    </div>
  );
}
