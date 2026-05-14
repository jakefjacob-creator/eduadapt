"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authFetch } from "@/lib/api";
import type { Role } from "@/lib/types";

export default function RoleSelect() {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!role) return;
    setSaving(true);
    setError(null);
    try {
      const res = await authFetch("/api/users/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  }

  const options: { value: Role; title: string; blurb: string; emoji: string }[] =
    [
      {
        value: "teacher",
        title: "I'm a teacher",
        blurb:
          "Manage profiles for several children, adapt classroom materials, and invite each child's parent to share the dashboard.",
        emoji: "🍎",
      },
      {
        value: "parent",
        title: "I'm a parent or carer",
        blurb:
          "Build your child's profile, adapt materials for use at home, and stay connected with their teacher.",
        emoji: "🏡",
      },
    ];

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => setRole(o.value)}
            className={`card p-6 text-left transition-all ${
              role === o.value
                ? "ring-2 ring-coral border-coral"
                : "hover:shadow-lift"
            }`}
          >
            <div className="text-3xl">{o.emoji}</div>
            <h3 className="mt-3 text-lg font-bold">{o.title}</h3>
            <p className="mt-1 text-sm text-muted">{o.blurb}</p>
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-4 rounded-2xl bg-coral-light/40 px-4 py-3 text-sm font-semibold text-coral-dark">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={confirm}
        disabled={!role || saving}
        className="btn-primary mt-6 w-full text-base"
      >
        {saving ? "Setting things up…" : "Continue"}
      </button>
    </div>
  );
}
