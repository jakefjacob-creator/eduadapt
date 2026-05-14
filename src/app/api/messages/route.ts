import { NextRequest, NextResponse } from "next/server";
import { getChildAccess } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

/** Post a message to a child's shared teacher ↔ parent thread. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const childId = typeof body.child_id === "string" ? body.child_id : null;
  const content =
    typeof body.content === "string" ? body.content.trim() : "";

  if (!childId || !content) {
    return NextResponse.json(
      { error: "A child and message content are required." },
      { status: 400 },
    );
  }
  if (content.length > 4000) {
    return NextResponse.json(
      { error: "Message is too long." },
      { status: 400 },
    );
  }

  const access = await getChildAccess(childId);
  if (!access) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("messages")
    .insert({
      child_id: childId,
      sender_id: access.user.id,
      content,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ message: data });
}

/** Fetch the message thread for a child. */
export async function GET(req: NextRequest) {
  const childId = req.nextUrl.searchParams.get("child_id");
  if (!childId) {
    return NextResponse.json({ error: "child_id is required" }, { status: 400 });
  }

  const access = await getChildAccess(childId);
  if (!access) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("messages")
    .select("*")
    .eq("child_id", childId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ messages: data });
}
