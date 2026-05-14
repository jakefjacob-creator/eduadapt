import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "./supabase";
import type { Child, Role, User } from "./types";

/**
 * Create a server-side Supabase client that validates the user's session
 * from cookies. Returns null if not authenticated.
 */
function getServerClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Get the current authenticated user's ID from the Authorization header, or null. */
export function getAuthUserId(): string | null {
  // In server components / API routes, we read the user from the service-role
  // lookup. This is set by middleware as a custom header.
  if (typeof globalThis !== "undefined") {
    const headers = (globalThis as Record<string, unknown>)._requestHeaders as
      | Record<string, string>
      | undefined;
    if (headers?.["x-user-id"]) return headers["x-user-id"];
  }
  return null;
}

/**
 * Get the authenticated user ID from a request's Authorization header.
 * Validates the JWT with Supabase.
 */
export async function getAuthUserIdFromRequest(
  req: Request,
): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const client = getServerClient();

  const {
    data: { user },
  } = await client.auth.getUser(token);

  return user?.id ?? null;
}

/**
 * Ensure a row exists in `users` for the signed-in Supabase Auth user.
 * Pulls email + name from auth metadata. Only sets `role` when explicitly
 * provided (during onboarding) — never overwrites an existing role.
 */
export async function ensureUser(
  userId: string,
  role?: Role,
): Promise<User | null> {
  if (!userId) return null;

  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  // Get user metadata from Supabase Auth
  const {
    data: { user: authUser },
  } = await supabaseAdmin.auth.admin.getUserById(userId);

  const email =
    authUser?.email ?? existing?.email ?? "";
  const name =
    authUser?.user_metadata?.name ||
    authUser?.user_metadata?.full_name ||
    [authUser?.user_metadata?.first_name, authUser?.user_metadata?.last_name]
      .filter(Boolean)
      .join(" ") ||
    existing?.name ||
    null;

  if (!existing) {
    if (!role) return null;
    const { data, error } = await supabaseAdmin
      .from("users")
      .insert({ id: userId, email, name, role })
      .select("*")
      .single();
    if (error) throw new Error(`Failed to create user: ${error.message}`);
    return data as User;
  }

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
export async function getDbUser(
  userId: string,
): Promise<User | null> {
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
  userId: string,
): Promise<ChildAccess | null> {
  const user = await getDbUser(userId);
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
