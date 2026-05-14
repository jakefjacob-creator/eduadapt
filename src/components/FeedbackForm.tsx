"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const SCALE = [
  { score: 1, label: "Didn't work" },
  { score: 2, label: "Needs work" },
  { score: 3, label: "Okay" },
  { score: 4, label: "Good" },
  { score: 5, label: "Perfect for them" },
];

export default function FeedbackForm({
  documentId,
  initialScore,
  initialNote,
}: {
  documentId: string;
  initialScore: number | null;
  initialNote: string | null;
}) {
  const router = useRouter();
  const [score, setScore] = useState<number | null>(initialScore);
  const [note, setNote] = useState(initialNote ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [profileUpdated, setProfileUpdated] = useState(false);

  async function submit() {
    if (!score) {
      setError("Pick a rating from 1 to 5.");
      return;
    }
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      const res = await fetch(`/api/documents/${documentId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save feedback");
      setDone(true);
      setProfileUpdated(Boolean(data.learningProfileUpdated));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6">
      <h2 className="text-lg font-bold">How well did this work?</h2>
      <p className="mt-1 text-sm text-muted">
        Your feedback is saved against this child&rsquo;s profile and shapes
        every future adaptation. Be honest — that&rsquo;s how it improves.
      </p>

      <div className="mt-4 grid grid-cols-5 gap-2">
        {SCALE.map((s) => (
          <button
            key={s.score}
            type="button"
            onClick={() => setScore(s.score)}
            className={`flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 text-center transition-all ${
              score === s.score
                ? "border-coral bg-coral-light/40 ring-2 ring-coral/40"
                : "border-clay bg-white hover:bg-sand"
            }`}
          >
            <span className="text-lg font-extrabold">{s.score}</span>
            <span className="text-[11px] leading-tight text-muted">
              {s.label}
            </span>
          </button>
        ))}
      </div>

      <textarea
        className="input mt-4 min-h-[90px] resize-y"
        placeholder="What worked, what didn't, what to change next time…"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      {error && (
        <p className="mt-3 rounded-2xl bg-coral-light/40 px-4 py-2 text-sm font-semibold text-coral-dark">
          {error}
        </p>
      )}
      {done && (
        <p className="mt-3 rounded-2xl bg-sage-light/40 px-4 py-2 text-sm font-semibold text-sage-dark">
          Feedback saved.{" "}
          {profileUpdated
            ? "The learning profile has been refined from all feedback so far."
            : ""}
        </p>
      )}

      <button
        type="button"
        className="btn-primary mt-4 w-full"
        onClick={submit}
        disabled={busy}
      >
        {busy
          ? "Saving & refining profile…"
          : initialScore
            ? "Update feedback"
            : "Save feedback"}
      </button>
    </div>
  );
}
