"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type Step = 0 | 1 | 2;

const QUIZ_FIELDS: {
  name: string;
  label: string;
  hint: string;
  placeholder: string;
}[] = [
  {
    name: "communication_style",
    label: "Communication style",
    hint: "How does this child best receive and express information?",
    placeholder:
      "e.g. Responds well to short, literal instructions. Uses some Makaton. Needs processing time before answering — avoid rapid questioning.",
  },
  {
    name: "engagement_triggers",
    label: "Engagement triggers",
    hint: "What reliably draws this child in or motivates them?",
    placeholder:
      "e.g. Dinosaurs, anything with a clear 'win', practical hands-on tasks, working alongside a trusted adult.",
  },
  {
    name: "sensory_considerations",
    label: "Sensory considerations",
    hint: "Sensory needs that affect how materials should look or feel.",
    placeholder:
      "e.g. Sensitive to busy pages — prefers lots of white space. Dislikes bright colours. Fidget tool helps focus.",
  },
  {
    name: "emotional_regulation",
    label: "Emotional regulation needs",
    hint: "What helps this child stay regulated, and what to watch for.",
    placeholder:
      "e.g. Anxious about getting things wrong — low-stakes entry points help. Benefits from 'now and next'. Movement breaks every 10 minutes.",
  },
  {
    name: "interests",
    label: "Interests & motivators",
    hint: "Specific interests we can weave into materials.",
    placeholder: "e.g. Minecraft, football (Liverpool FC), space, drawing comics.",
  },
  {
    name: "things_to_avoid",
    label: "Things to avoid",
    hint: "Anything that should never appear in this child's materials.",
    placeholder:
      "e.g. Timed tests, references to spiders, group competition, long unbroken paragraphs.",
  },
];

const READING_AGE_OPTIONS = [
  "Well below chronological age",
  "Slightly below chronological age",
  "Around chronological age",
  "Above chronological age",
  "Pre-reader / emerging",
  "Not sure yet",
];

export default function ChildCreateForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [basics, setBasics] = useState({ name: "", age: "", year_group: "" });
  const [ehcpName, setEhcpName] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<Record<string, string>>({
    communication_style: "",
    engagement_triggers: "",
    sensory_considerations: "",
    emotional_regulation: "",
    interests: "",
    things_to_avoid: "",
    reading_age_estimate: "",
  });

  const canLeaveStep0 = basics.name.trim().length > 0;

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("name", basics.name);
      form.set("age", basics.age);
      form.set("year_group", basics.year_group);
      for (const [k, v] of Object.entries(quiz)) form.set(k, v);
      const file = fileRef.current?.files?.[0];
      if (file) form.set("ehcp", file);

      const res = await fetch("/api/children", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create profile");

      router.push(
        `/dashboard/children/${data.id}${
          data.ehcpWarning
            ? `?notice=${encodeURIComponent(data.ehcpWarning)}`
            : ""
        }`,
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <div className="card p-6 md:p-8">
      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-2">
        {["Basics", "EHCP", "Onboarding quiz"].map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <span
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold ${
                i <= step
                  ? "bg-coral text-white"
                  : "bg-sand text-muted"
              }`}
            >
              {i + 1}
            </span>
            <span
              className={`text-sm font-semibold ${
                i <= step ? "text-ink" : "text-muted"
              }`}
            >
              {label}
            </span>
            {i < 2 && <div className="h-px flex-1 bg-clay" />}
          </div>
        ))}
      </div>

      {/* Step 0 — basics */}
      {step === 0 && (
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="name">
              Child&rsquo;s name *
            </label>
            <input
              id="name"
              className="input"
              value={basics.name}
              onChange={(e) =>
                setBasics({ ...basics, name: e.target.value })
              }
              placeholder="First name is fine"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="age">
                Age
              </label>
              <input
                id="age"
                type="number"
                min={2}
                max={25}
                className="input"
                value={basics.age}
                onChange={(e) =>
                  setBasics({ ...basics, age: e.target.value })
                }
                placeholder="e.g. 8"
              />
            </div>
            <div>
              <label className="label" htmlFor="year_group">
                Year group
              </label>
              <input
                id="year_group"
                className="input"
                value={basics.year_group}
                onChange={(e) =>
                  setBasics({ ...basics, year_group: e.target.value })
                }
                placeholder="e.g. Year 4"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 1 — EHCP */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Upload {basics.name || "the child"}&rsquo;s EHCP as a PDF or Word
            document. EduAdapt will read it and extract their key needs to
            inform every adaptation. You can skip this and add it later.
          </p>
          <label
            htmlFor="ehcp"
            className="grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-clay bg-sand/40 px-6 py-10 text-center transition-colors hover:border-coral hover:bg-sand"
          >
            <div className="text-3xl">📄</div>
            <span className="mt-2 font-semibold">
              {ehcpName ? ehcpName : "Click to choose the EHCP file"}
            </span>
            <span className="mt-1 text-xs text-muted">
              PDF or .docx — up to ~15MB
            </span>
            <input
              ref={fileRef}
              id="ehcp"
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) =>
                setEhcpName(e.target.files?.[0]?.name ?? null)
              }
            />
          </label>
          {ehcpName && (
            <button
              type="button"
              className="text-sm font-semibold text-coral-dark underline"
              onClick={() => {
                if (fileRef.current) fileRef.current.value = "";
                setEhcpName(null);
              }}
            >
              Remove file
            </button>
          )}
        </div>
      )}

      {/* Step 2 — quiz */}
      {step === 2 && (
        <div className="space-y-5">
          <p className="text-sm text-muted">
            This short profile is the heart of EduAdapt — the more specific you
            are, the more genuinely individual every adaptation becomes.
          </p>

          <div>
            <label className="label" htmlFor="reading_age_estimate">
              Reading age estimate
            </label>
            <p className="mb-1.5 text-xs text-muted">
              Roughly where is this child&rsquo;s reading compared to their age?
            </p>
            <select
              id="reading_age_estimate"
              className="input"
              value={quiz.reading_age_estimate}
              onChange={(e) =>
                setQuiz({ ...quiz, reading_age_estimate: e.target.value })
              }
            >
              <option value="">Choose one…</option>
              {READING_AGE_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          {QUIZ_FIELDS.map((f) => (
            <div key={f.name}>
              <label className="label" htmlFor={f.name}>
                {f.label}
              </label>
              <p className="mb-1.5 text-xs text-muted">{f.hint}</p>
              <textarea
                id={f.name}
                className="input min-h-[80px] resize-y"
                value={quiz[f.name]}
                onChange={(e) =>
                  setQuiz({ ...quiz, [f.name]: e.target.value })
                }
                placeholder={f.placeholder}
              />
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-5 rounded-2xl bg-coral-light/40 px-4 py-3 text-sm font-semibold text-coral-dark">
          {error}
        </p>
      )}

      {/* Nav */}
      <div className="mt-7 flex items-center justify-between gap-3">
        <button
          type="button"
          className="btn-ghost"
          onClick={() =>
            step === 0
              ? router.push("/dashboard")
              : setStep((step - 1) as Step)
          }
          disabled={submitting}
        >
          {step === 0 ? "Cancel" : "Back"}
        </button>

        {step < 2 ? (
          <button
            type="button"
            className="btn-primary"
            disabled={step === 0 && !canLeaveStep0}
            onClick={() => setStep((step + 1) as Step)}
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            className="btn-primary"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? "Creating profile & reading EHCP…"
              : "Create profile"}
          </button>
        )}
      </div>
    </div>
  );
}
