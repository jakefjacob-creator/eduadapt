import { NextRequest, NextResponse } from "next/server";
import { getDbUser, getAuthFromRequest } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { extractFromFile } from "@/lib/extract";
import { extractEhcpNeeds } from "@/lib/claude";
import { uploadBuffer, storageKey } from "@/lib/storage";
import type { QuizResults } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const user = await getDbUser(auth.userId, auth.accessToken);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected form data" }, { status: 400 });
  }

  const name = (form.get("name") as string | null)?.trim();
  if (!name) {
    return NextResponse.json(
      { error: "A name is required." },
      { status: 400 },
    );
  }

  const ageRaw = (form.get("age") as string | null)?.trim();
  const age = ageRaw && !Number.isNaN(Number(ageRaw)) ? Number(ageRaw) : null;
  const yearGroup =
    (form.get("year_group") as string | null)?.trim() || null;

  const quiz: QuizResults = {
    communication_style:
      (form.get("communication_style") as string | null)?.trim() || "",
    engagement_triggers:
      (form.get("engagement_triggers") as string | null)?.trim() || "",
    sensory_considerations:
      (form.get("sensory_considerations") as string | null)?.trim() || "",
    reading_age_estimate:
      (form.get("reading_age_estimate") as string | null)?.trim() || "",
    emotional_regulation:
      (form.get("emotional_regulation") as string | null)?.trim() || "",
    interests: (form.get("interests") as string | null)?.trim() || "",
    things_to_avoid:
      (form.get("things_to_avoid") as string | null)?.trim() || "",
  };
  const quizProvided = Object.values(quiz).some((v) => v.length > 0);

  const { data: child, error: childErr } = await supabaseAdmin
    .from("children")
    .insert({
      name,
      age,
      year_group: yearGroup,
      quiz_results: quizProvided ? quiz : null,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (childErr || !child) {
    return NextResponse.json(
      { error: childErr?.message || "Could not create child" },
      { status: 500 },
    );
  }

  const { error: memberErr } = await supabaseAdmin
    .from("child_members")
    .insert({ child_id: child.id, user_id: user.id, role: user.role });
  if (memberErr) {
    await supabaseAdmin.from("children").delete().eq("id", child.id);
    return NextResponse.json({ error: memberErr.message }, { status: 500 });
  }

  const ehcpFile = form.get("ehcp") as File | null;
  let ehcpWarning: string | null = null;

  if (ehcpFile && ehcpFile.size > 0) {
    try {
      const buffer = Buffer.from(await ehcpFile.arrayBuffer());
      const extracted = await extractFromFile(
        buffer,
        ehcpFile.type,
        ehcpFile.name,
      );
      if (!extracted.text || extracted.text.length < 40) {
        throw new Error(
          "Couldn't read enough text from that EHCP file. Try a text-based PDF or Word document.",
        );
      }

      const url = await uploadBuffer(
        storageKey(child.id, "source", ehcpFile.name),
        buffer,
        ehcpFile.type || "application/pdf",
      );

      const summary = await extractEhcpNeeds(extracted.text);

      await supabaseAdmin
        .from("children")
        .update({
          ehcp_text: extracted.text,
          ehcp_summary: summary,
        })
        .eq("id", child.id);

      await supabaseAdmin.from("documents").insert({
        child_id: child.id,
        uploaded_by: user.id,
        title: `EHCP — ${name}`,
        original_filename: ehcpFile.name,
        original_file_url: url,
        original_text: extracted.text,
        document_type: "support_document",
        output_kind: null,
        status: "ready",
        adaptation_notes:
          "Original EHCP on file. Its needs are extracted into this child's profile and inform every adaptation.",
      });
    } catch (err) {
      ehcpWarning =
        err instanceof Error
          ? err.message
          : "The EHCP could not be processed — you can add it again later.";
    }
  }

  return NextResponse.json({ id: child.id, ehcpWarning });
}
