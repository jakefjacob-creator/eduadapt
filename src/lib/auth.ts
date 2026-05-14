import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Child, Role, User } from "./types";

function getServerAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return key;
}

function getServerUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  return url;
}

/**
 * Create a Supabase client scoped to a specific user via their JWT.
 * This respects RLS policies.
 */
function createUserClient(accessToken: string): SupabaseClient {
  return createClient(getServerUrl(), getServerAnonKey(), {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Try to create a service-role client (bypasses RLS).
 * Returns null if the service role key is not configured.
 */
function tryCreateAdminClient(): SupabaseClient | null {
  const url = getServerUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Get a Supabase client for server-side operations.
 * Prefers the service-role key (bypasses RLS).
 * Falls back to a user-scoped client (respects RLS).
 */
function getServerClient(accessToken?: string): SupabaseClient {
  const admin = tryCreateAdminClient();
  if (admin) return admin;
  if (accessToken) return createUserClient(accessToken);
  throw new Error(
    "No SUPABASE_SERVICE_ROLE_KEY configured and no user token provided. " +
    "Set SUPABASE_SERVICE_ROLE_KEY in .env or pass an access token.",
  );
}

/**
 * Get the authenticated user ID and access token from a request's
 * Authorization header. Validates the JWT with Supabase.
 */
export async function getAuthFromRequest(
  req: Request,
): Promise<{ userId: string; accessToken: string } | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const client = createClient(getServerUrl(), getServerAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
  } = await client.auth.getUser(token);

  if (!user) return null;
  return { userId: user.id, accessToken: token };
}

/**
 * Ensure a row exists in `users` for the signed-in Supabase Auth user.
 * Pulls email + name from auth metadata. Only sets `role` when explicitly
 * provided (during onboarding) — never overwrites an existing role.
 */
export async function ensureUser(
  userId: string,
  role?: Role,
  accessToken?: string,
): Promise<User | null> {
  if (!userId) return null;

  const client = getServerClient(accessToken);

  const { data: existing } = await client
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  // Get user metadata from Supabase Auth
  let email = existing?.email ?? "";
  let name = existing?.name ?? null;

  // Try to get fresh data from auth (only works with service role key)
  const admin = tryCreateAdminClient();
  if (admin) {
    const {
      data: { user: authUser },
    } = await admin.auth.admin.getUserById(userId);
    email = authUser?.email ?? email;
    name =
      authUser?.user_metadata?.name ||
      authUser?.user_metadata?.full_name ||
      [authUser?.user_metadata?.first_name, authUser?.user_metadata?.last_name]
        .filter(Boolean)
        .join(" ") ||
      name;
  }

  if (!existing) {
    if (!role) return null;
    const { data, error } = await client
      .from("users")
      .insert({ id: userId, email, name, role })
      .select("*")
      .single();
    if (error) throw new Error(`Failed to create user: ${error.message}`);
    return data as User;
  }

  const patch: Partial<User> = { email, name };
  if (role) patch.role = role;
  const { data, error } = await client
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
  accessToken?: string,
): Promise<User | null> {
  if (!userId) return null;
  const client = getServerClient(accessToken);
  const { data } = await client
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
  accessToken?: string,
): Promise<ChildAccess | null> {
  const user = await getDbUser(userId, accessToken);
  if (!user) return null;

  const client = getServerClient(accessToken);
  const { data: membership } = await client
    .from("child_members")
    .select("role")
    .eq("child_id", childId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return null;

  const { data: child } = await client
    .from("children")
    .select("*")
    .eq("id", childId)
    .maybeSingle();
  if (!child) return null;

  return { user, child: child as Child, memberRole: membership.role as Role };
}
