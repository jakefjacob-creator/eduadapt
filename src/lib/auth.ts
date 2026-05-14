import { auth, currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "./supabase";
import type { Child, Role, User } from "./types";

/** Clerk user id for the current request, or null if signed out. */
export function getAuthUserId(): string | null {
  return auth().userId;
}

/**
 * Ensure a row exists in `users` for the signed-in Clerk user.
 * Pulls email + name from Clerk. Only sets `role` when explicitly
 * provided (during onboarding) — never overwrites an existing role.
 */
export async function ensureUser(role?: Role): Promise<User | null> {
  const userId = getAuthUserId();
  if (!userId) return null;

  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  const clerkUser = await currentUser();
  const email =
    clerkUser?.primaryEmailAddress?.emailAddress ||
    clerkUser?.emailAddresses?.[0]?.emailAddress ||
    existing?.email ||
    "";
  const name =
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") ||
    existing?.name ||
    null;

  if (!existing) {
    if (!role) {
      // User exists in Clerk but hasn't chosen a role yet.
      return null;
    }
    const { data, error } = await supabaseAdmin
      .from("users")
      .insert({ id: userId, email, name, role })
      .select("*")
      .single();
    if (error) throw new Error(`Failed to create user: ${error.message}`);
    return data as User;
  }

  // Keep email/name fresh; apply role only if caller passed one.
  const patch: Partial<User> = { email, name };
  if (role) patch.role = role;
  const { data, error } = await supabaseAdmin
    .from("users")
    .update(patch)
    .eq("id", userId)
    .select("*")
    .single();
  if (error) throw new Error(`Failed to update user: ${error.message}`);
  return data as User;
}

/** The current app user row, or null if signed out / not onboarded. */
export async function getDbUser(): Promise<User | null> {
  const userId = getAuthUserId();
  if (!userId) return null;
  const { data } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  return (data as User) ?? null;
}

export interface ChildAccess {
  user: User;
  child: Child;
  memberRole: Role;
}

/**
 * Resolve the current user's access to a child. Returns null if the
 * user is signed out, not onboarded, or not a member of that child.
 */
export async function getChildAccess(
  childId: string,
): Promise<ChildAccess | null> {
  const user = await getDbUser();
  if (!user) return null;

  const { data: membership } = await supabaseAdmin
    .from("child_members")
    .select("role")
    .eq("child_id", childId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return null;

  const { data: child } = await supabaseAdmin
    .from("children")
    .select("*")
    .eq("id", childId)
    .maybeSingle();
  if (!child) return null;

  return { user, child: child as Child, memberRole: membership.role as Role };
}
