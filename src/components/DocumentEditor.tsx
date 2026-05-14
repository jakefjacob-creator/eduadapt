"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authFetch } from "@/lib/api";

export default function DocumentEditor({
  documentId,
  initialTitle,
  initialContent,
  outputFileUrl,
}: {
  documentId: string;
  initialTitle: string;
  initialContent: string;
  outputFileUrl: string | null;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [fileUrl, setFileUrl] = useState(outputFileUrl);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const dirty = title !== initialTitle || content !== initialContent;

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await authFetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, output_text: content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save");
      setFileUrl(data.document.output_file_url);
      setSavedAt(new Date().toLocaleTimeString());
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              className="input text-lg font-bold"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          ) : (
            <h2 className="text-xl font-extrabold">{title}</h2>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          {fileUrl && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              ⬇ Download PDF
            </a>
          )}
          {editing ? (
            <button
              type="button"
              className="btn-primary"
              onClick={save}
              disabled={busy || (!dirty && !!savedAt)}
            >
              {busy ? "Saving & re-rendering PDF…" : "Save changes"}
            </button>
          ) : (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setEditing(true)}
            >
              ✏️ Edit
            </button>
          )}
        </div>
      </div>

      {savedAt && !editing && (
        <p className="mt-2 text-xs font-semibold text-sage-dark">
          Saved at {savedAt} — PDF re-rendered.
        </p>
      )}
      {error && (
        <p className="mt-3 rounded-2xl bg-coral-light/40 px-4 py-2 text-sm font-semibold text-coral-dark">
          {error}
        </p>
      )}

      <div className="mt-4">
        {editing ? (
          <textarea
            className="input min-h-[480px] resize-y font-mono text-sm leading-relaxed"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        ) : (
          <div className="rounded-2xl border border-clay/60 bg-white p-5">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink">
              {content}
            </pre>
          </div>
        )}
      </div>

      {editing && (
        <p className="mt-2 text-xs text-muted">
          Use # for headings, - for bullet points, 1. for numbered steps.
          Saving re-renders the downloadable PDF.
        </p>
      )}
    </div>
  );
}
