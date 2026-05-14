import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getChildAccess, getAuthFromRequest } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import type { Role } from "@/lib/types";

export const runtime = "nodejs";

function appUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const childId = typeof body.child_id === "string" ? body.child_id : null;
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const role: Role = body.role === "teacher" ? "teacher" : "parent";

  if (!childId || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "A child and a valid email address are required." },
      { status: 400 },
    );
  }

  const access = await getChildAccess(childId, auth.userId, auth.accessToken);
  if (!access) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const { data: existing } = await supabaseAdmin
    .from("invites")
    .select("*")
    .eq("child_id", childId)
    .eq("email", email)
    .eq("accepted", false)
    .maybeSingle();

  let invite = existing;
  if (!invite) {
    const token = randomBytes(24).toString("hex");
    const { data, error } = await supabaseAdmin
      .from("invites")
      .insert({
        child_id: childId,
        email,
        token,
        role,
        invited_by: access.user.id,
      })
      .select("*")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    invite = data;
  }

  return NextResponse.json({
    invite,
    link: `${appUrl()}/invite/${invite.token}`,
  });
}

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const childId = req.nextUrl.searchParams.get("child_id");
  if (!childId) {
    return NextResponse.json({ error: "child_id is required" }, { status: 400 });
  }
  const access = await getChildAccess(childId, auth.userId, auth.accessToken);
  if (!access) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }
  const { data } = await supabaseAdmin
    .from("invites")
    .select("*")
    .eq("child_id", childId)
    .order("created_at", { ascending: false });
  return NextResponse.json({ invites: data ?? [] });
}
