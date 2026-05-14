import { NextRequest, NextResponse } from "next/server";
import { getChildAccess, getAuthUserIdFromRequest } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { updateLearningProfile, type FeedbackEntry } from "@/lib/claude";
import type { Child, DocumentRow } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Record a 1-5 rating + note against a document, then refine the
 * child's learning profile from the full feedback history so future
 * adaptations improve.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const userId = await getAuthUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: doc } = await supabaseAdmin
    .from("documents")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const access = await getChildAccess(doc.child_id, userId);
  if (!access) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const score = Number(body.score);
  const note =
    typeof body.note === "string" ? body.note.trim().slice(0, 1000) : "";

  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return NextResponse.json(
      { error: "Score must be a whole number from 1 to 5." },
      { status: 400 },
    );
  }

  // ── Save feedback on the document ─────────────────────
  const { error: updateErr } = await supabaseAdmin
    .from("documents")
    .update({
      feedback_score: score,
      feedback_note: note || null,
      feedback_by: access.user.id,
      feedback_at: new Date().toISOString(),
    })
    .eq("id", doc.id);
  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // ── Refine the learning profile from all feedback ─────
  let learningProfileUpdated = false;
  try {
    const { data: rated } = await supabaseAdmin
      .from("documents")
      .select("title, document_type, feedback_score, feedback_note")
      .eq("child_id", doc.child_id)
      .not("feedback_score", "is", null)
      .order("feedback_at", { ascending: true });

    const feedback: FeedbackEntry[] = (rated ?? []).map(
      (r: Partial<DocumentRow>) => ({
        title: r.title || "Untitled document",
        document_type: r.document_type ?? null,
        score: r.feedback_score as number,
        note: r.feedback_note ?? null,
      }),
    );

    if (feedback.length > 0) {
      const profile = await updateLearningProfile(
        access.child as Child,
        feedback,
      );
      await supabaseAdmin
        .from("children")
        .update({ learning_profile: profile })
        .eq("id", doc.child_id);
      learningProfileUpdated = true;
    }
  } catch {
    // Feedback is saved regardless; profile refinement is best-effort.
  }

  return NextResponse.json({ ok: true, learningProfileUpdated });
}
