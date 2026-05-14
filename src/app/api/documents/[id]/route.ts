import { NextRequest, NextResponse } from "next/server";
import { getChildAccess } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { generatePdf } from "@/lib/pdf";
import { uploadBuffer, storageKey } from "@/lib/storage";
import type { DocumentRow } from "@/lib/types";

export const runtime = "nodejs";

async function loadDocWithAccess(id: string) {
  const { data: doc } = await supabaseAdmin
    .from("documents")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!doc) return { error: "Document not found", status: 404 as const };

  const access = await getChildAccess(doc.child_id);
  if (!access) return { error: "Access denied", status: 403 as const };

  return { doc: doc as DocumentRow, access };
}

/** Fetch a single document. */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const result = await loadDocWithAccess(params.id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ document: result.doc });
}

/** Edit a generated document's content and re-render its PDF. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const result = await loadDocWithAccess(params.id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const { doc, access } = result;

  const body = await req.json().catch(() => ({}));
  const outputText =
    typeof body.output_text === "string" ? body.output_text : null;
  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim()
      : doc.title;

  if (!outputText || !outputText.trim()) {
    return NextResponse.json(
      { error: "Document content cannot be empty." },
      { status: 400 },
    );
  }

  const subtitle = `Edited for ${access.child.name}${
    doc.document_type ? ` · ${doc.document_type.replace("_", " ")}` : ""
  }`;

  const pdfBytes = await generatePdf({
    title: title || "Document",
    subtitle,
    body: outputText,
  });
  const outputUrl = await uploadBuffer(
    storageKey(doc.child_id, "output", `${title || "document"}.pdf`),
    pdfBytes,
    "application/pdf",
  );

  const { data: updated, error } = await supabaseAdmin
    .from("documents")
    .update({ output_text: outputText, title, output_file_url: outputUrl })
    .eq("id", doc.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ document: updated });
}
