import { NextRequest, NextResponse } from "next/server";
import { ensureUser, getAuthFromRequest } from "@/lib/auth";
import type { Role } from "@/lib/types";

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let role: Role | undefined;
  try {
    const body = await req.json();
    if (body?.role === "teacher" || body?.role === "parent") {
      role = body.role;
    }
  } catch {
    // no body — just refreshes email/name
  }

  try {
    const user = await ensureUser(auth.userId, role, auth.accessToken);
    if (!user) {
      return NextResponse.json(
        { error: "Choose a role to finish setting up your account." },
        { status: 400 },
      );
    }
    return NextResponse.json({ user });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to sync user" },
      { status: 500 },
    );
  }
}
