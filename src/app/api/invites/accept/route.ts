import { NextRequest, NextResponse } from "next/server";
import { ensureUser, getAuthUserIdFromRequest } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Accept an invite: ensure the signed-in user exists (with the invited
 * role if they're brand new), add them as a member of the child, and
 * mark the invite used.
 */
export async function POST(req: NextRequest) {
  const userId = await getAuthUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json(
      { error: "Please sign in to accept this invite." },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : null;
  if (!token) {
    return NextResponse.json({ error: "Missing invite token" }, { status: 400 });
  }

  const { data: invite } = await supabaseAdmin
    .from("invites")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (!invite) {
    return NextResponse.json(
      { error: "This invite link is not valid." },
      { status: 404 },
    );
  }

  // Make sure the user has an app row. If they're new, adopt the
  // invited role; existing users keep whatever role they already have.
  const user = await ensureUser(userId, invite.role);
  if (!user) {
    return NextResponse.json(
      { error: "Could not set up your account." },
      { status: 500 },
    );
  }

  // Add membership (idempotent — unique on child_id + user_id).
  const { error: memberErr } = await supabaseAdmin
    .from("child_members")
    .upsert(
      { child_id: invite.child_id, user_id: user.id, role: invite.role },
      { onConflict: "child_id,user_id" },
    );
  if (memberErr) {
    return NextResponse.json({ error: memberErr.message }, { status: 500 });
  }

  if (!invite.accepted) {
    await supabaseAdmin
      .from("invites")
      .update({ accepted: true })
      .eq("id", invite.id);
  }

  return NextResponse.json({ child_id: invite.child_id });
}
