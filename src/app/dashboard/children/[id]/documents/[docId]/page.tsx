import { notFound } from "next/navigation";
import Link from "next/link";
import { getChildAccess } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import DocumentEditor from "@/components/DocumentEditor";
import FeedbackForm from "@/components/FeedbackForm";
import type { DocumentRow } from "@/lib/types";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  worksheet: "Worksheet",
  lesson_plan: "Lesson plan",
  support_document: "Support document",
};
const KIND_LABEL: Record<string, string> = {
  modified: "Modified original",
  regenerated: "Newly created",
  support_document: "Support document",
};

export default async function DocumentPage({
  params,
}: {
  params: { id: string; docId: string };
}) {
  const access = await getChildAccess(params.id);
  if (!access) notFound();

  const { data: doc } = await supabaseAdmin
    .from("documents")
    .select("*")
    .eq("id", params.docId)
    .eq("child_id", params.id)
    .maybeSingle();
  if (!doc) notFound();

  const document = doc as DocumentRow;

  // Any support documents generated alongside this one.
  const { data: relatedData } = await supabaseAdmin
    .from("documents")
    .select("id, title, document_type")
    .eq("parent_document_id", document.id);
  const related = relatedData ?? [];

  const backHref = `/dashboard/children/${params.id}`;

  return (
    <div>
      <Link
        href={backHref}
        className="text-sm font-semibold text-muted hover:text-ink"
      >
        ← Back to {access.child.name}
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-extrabold">{document.title}</h1>
        {document.document_type && (
          <span className="chip bg-sand text-muted">
            {TYPE_LABEL[document.document_type]}
          </span>
        )}
        {document.output_kind && (
          <span className="chip bg-sunbeam/50 text-ink">
            {KIND_LABEL[document.output_kind]}
          </span>
        )}
      </div>

      {/* Processing / error states */}
      {document.status === "processing" && (
        <div className="card mt-6 grid place-items-center p-12 text-center">
          <div className="text-4xl">⏳</div>
          <h2 className="mt-3 text-lg font-bold">Still adapting…</h2>
          <p className="mt-1 max-w-sm text-muted">
            This document is being tailored to {access.child.name}. Refresh in
            a moment to see the result.
          </p>
          <Link href={backHref} className="btn-ghost mt-5">
            Back to dashboard
          </Link>
        </div>
      )}

      {document.status === "error" && (
        <div className="card mt-6 p-6">
          <h2 className="text-lg font-bold text-coral-dark">
            ⚠️ This adaptation didn&rsquo;t complete
          </h2>
          <p className="mt-1 text-sm text-muted">
            {document.error_message ||
              "Something went wrong while adapting this document."}
          </p>
          <p className="mt-3 text-sm">
            You can upload the original file again from{" "}
            <Link href={backHref} className="font-semibold text-coral underline">
              {access.child.name}&rsquo;s dashboard
            </Link>
            .
          </p>
        </div>
      )}

      {/* Ready */}
      {document.status === "ready" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {document.output_text ? (
              <DocumentEditor
                documentId={document.id}
                initialTitle={document.title ?? "Document"}
                initialContent={document.output_text}
                outputFileUrl={document.output_file_url}
              />
            ) : (
              <div className="card p-6">
                <h2 className="text-lg font-bold">Original on file</h2>
                <p className="mt-1 text-sm text-muted">
                  {document.adaptation_notes ||
                    "This document is stored as a source reference."}
                </p>
                {document.original_file_url && (
                  <a
                    href={document.original_file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary mt-4"
                  >
                    ⬇ Download original
                  </a>
                )}
                {document.original_text && (
                  <pre className="mt-4 max-h-96 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-clay/60 bg-white p-4 font-sans text-sm text-muted">
                    {document.original_text}
                  </pre>
                )}
              </div>
            )}

            {/* Original source */}
            {document.output_text && (
              <details className="card p-6">
                <summary className="cursor-pointer text-lg font-bold">
                  Compare with the original
                </summary>
                <div className="mt-3">
                  {document.original_file_url && (
                    <a
                      href={document.original_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ghost mb-3"
                    >
                      ⬇ Download original file
                    </a>
                  )}
                  <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-clay/60 bg-white p-4 font-sans text-sm text-muted">
                    {document.original_text || "No extracted text available."}
                  </pre>
                </div>
              </details>
            )}
          </div>

          {/* Side column */}
          <div className="space-y-6">
            {document.adaptation_notes && (
              <div className="card p-6">
                <h2 className="text-lg font-bold">What changed &amp; why</h2>
                <p className="mt-2 text-sm text-muted">
                  {document.adaptation_notes}
                </p>
              </div>
            )}

            {related.length > 0 && (
              <div className="card p-6">
                <h2 className="text-lg font-bold">Generated alongside</h2>
                <ul className="mt-2 space-y-2">
                  {related.map((r) => (
                    <li key={r.id}>
                      <Link
                        href={`/dashboard/children/${params.id}/documents/${r.id}`}
                        className="flex items-center gap-2 rounded-2xl border border-clay/60 bg-white px-3 py-2 text-sm font-semibold hover:border-coral"
                      >
                        🧩 {r.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {document.output_text && (
              <FeedbackForm
                documentId={document.id}
                initialScore={document.feedback_score}
                initialNote={document.feedback_note}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
