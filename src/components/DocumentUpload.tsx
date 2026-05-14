"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export default function DocumentUpload({
  childId,
  childName,
}: {
  childId: string;
  childName: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("child_id", childId);
      form.set("file", file);
      const res = await fetch("/api/documents", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Adaptation failed");
      router.push(`/dashboard/children/${childId}/documents/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <div className="card p-6">
      <h2 className="text-lg font-bold">Adapt a document</h2>
      <p className="mt-1 text-sm text-muted">
        Upload a worksheet, lesson plan or support document. EduAdapt will
        adapt it specifically for {childName} and give you an editable,
        downloadable PDF.
      </p>

      <label
        htmlFor="doc-file"
        className={`mt-4 grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
          busy
            ? "border-clay bg-sand/40 opacity-60"
            : "border-clay bg-sand/40 hover:border-coral hover:bg-sand"
        }`}
      >
        <div className="text-3xl">{fileName ? "📎" : "⬆️"}</div>
        <span className="mt-2 font-semibold">
          {fileName ?? "Click to choose a file"}
        </span>
        <span className="mt-1 text-xs text-muted">
          PDF, Word .docx, image (JPG/PNG of a printed sheet), or plain text
        </span>
        <input
          ref={fileRef}
          id="doc-file"
          type="file"
          accept=".pdf,.docx,.txt,.md,.jpg,.jpeg,.png,.webp,image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          className="hidden"
          disabled={busy}
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        />
      </label>

      {error && (
        <p className="mt-3 rounded-2xl bg-coral-light/40 px-4 py-2.5 text-sm font-semibold text-coral-dark">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleUpload}
        disabled={busy || !fileName}
        className="btn-primary mt-4 w-full"
      >
        {busy ? `Adapting for ${childName}…` : "Adapt this document"}
      </button>
      {busy && (
        <p className="mt-2 text-center text-xs text-muted">
          Reading the document and tailoring it to {childName}&rsquo;s
          profile — this usually takes 15–40 seconds.
        </p>
      )}
    </div>
  );
}
