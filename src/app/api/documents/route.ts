import { NextRequest, NextResponse } from "next/server";
import { getChildAccess } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { extractFromFile } from "@/lib/extract";
import { adaptDocument } from "@/lib/claude";
import { generatePdf } from "@/lib/pdf";
import { uploadBuffer, storageKey } from "@/lib/storage";
import type { Child } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const TYPE_LABEL: Record<string, string> = {
  worksheet: "Worksheet",
  lesson_plan: "Lesson plan",
  support_document: "Support document",
};

/**
 * Upload a document, adapt it for the child with Claude, render the
 * result to a downloadable PDF, and (for lesson plans) generate a
 * support document alongside it.
 */
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected form data" }, { status: 400 });
  }

  const childId = form.get("child_id") as string | null;
  const file = form.get("file") as File | null;

  if (!childId || !file || file.size === 0) {
    return NextResponse.json(
      { error: "A child and a file are both required." },
      { status: 400 },
    );
  }

  const access = await getChildAccess(childId);
  if (!access) {
    return NextResponse.json(
      { error: "You don't have access to this child." },
      { status: 403 },
    );
  }
  const { user, child } = access;

  // ── Extract source content ────────────────────────────
  let extracted: Awaited<ReturnType<typeof extractFromFile>>;
  let originalUrl: string;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    extracted = await extractFromFile(buffer, file.type, file.name);

    // Upload the original file for the activity feed / records.
    originalUrl = await uploadBuffer(
      storageKey(childId, "source", file.name),
      buffer,
      file.type || "application/octet-stream",
    );
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Could not read that file.",
      },
      { status: 400 },
    );
  }

  // ── Create the document row up front (status: processing) ──
  const { data: doc, error: insertErr } = await supabaseAdmin
    .from("documents")
    .insert({
      child_id: childId,
      uploaded_by: user.id,
      title: file.name,
      original_filename: file.name,
      original_file_url: originalUrl,
      original_text: extracted.text,
      status: "processing",
    })
    .select("*")
    .single();

  if (insertErr || !doc) {
    return NextResponse.json(
      { error: insertErr?.message || "Could not save document" },
      { status: 500 },
    );
  }

  // ── Adapt with Claude, render PDF, save ───────────────
  try {
    const result = await adaptDocument({
      child: child as Child,
      documentText: extracted.text,
      imageBase64: extracted.imageBase64,
      imageMediaType: extracted.imageMediaType,
      originalFilename: file.name,
    });

    const subtitle = `${
      result.output_kind === "regenerated"
        ? "Newly created"
        : "Adapted"
    } for ${child.name} · ${TYPE_LABEL[result.document_type] ?? "Document"}`;

    const pdfBytes = await generatePdf({
      title: result.title,
      subtitle,
      body: result.content,
    });
    const outputUrl = await uploadBuffer(
      storageKey(childId, "output", `${result.title}.pdf`),
      pdfBytes,
      "application/pdf",
    );

    await supabaseAdmin
      .from("documents")
      .update({
        title: result.title,
        output_text: result.content,
        output_file_url: outputUrl,
        document_type: result.document_type,
        output_kind: result.output_kind,
        adaptation_notes: result.adaptation_notes,
        status: "ready",
      })
      .eq("id", doc.id);

    // ── Support document alongside a lesson plan ────────
    if (result.support_document) {
      const sd = result.support_document;
      const sdPdf = await generatePdf({
        title: sd.title,
        subtitle: `Support document for ${child.name} · ${sd.kind}`,
        body: sd.content,
      });
      const sdUrl = await uploadBuffer(
        storageKey(childId, "output", `${sd.title}.pdf`),
        sdPdf,
        "application/pdf",
      );
      await supabaseAdmin.from("documents").insert({
        child_id: childId,
        uploaded_by: user.id,
        title: sd.title,
        original_filename: file.name,
        original_file_url: originalUrl,
        output_text: sd.content,
        output_file_url: sdUrl,
        document_type: "support_document",
        output_kind: "support_document",
        adaptation_notes: `Generated alongside "${result.title}" to help ${child.name} access the lesson.`,
        parent_document_id: doc.id,
        status: "ready",
      });
    }

    return NextResponse.json({ id: doc.id });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Adaptation failed.";
    await supabaseAdmin
      .from("documents")
      .update({ status: "error", error_message: message })
      .eq("id", doc.id);
    return NextResponse.json({ error: message, id: doc.id }, { status: 500 });
  }
}
