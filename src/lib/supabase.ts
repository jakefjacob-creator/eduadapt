import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Get a Supabase client for server-side operations.
 * - If SUPABASE_SERVICE_ROLE_KEY is set, uses it (bypasses RLS).
 * - Otherwise, requires an accessToken to scope queries to the user (respects RLS).
 */
export function getServerClient(accessToken?: string): SupabaseClient {
  if (serviceRoleKey) {
    return createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  if (accessToken) {
    return createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  throw new Error(
    "No SUPABASE_SERVICE_ROLE_KEY configured and no access token provided. " +
    "Set SUPABASE_SERVICE_ROLE_KEY in .env or pass an access token.",
  );
}

/**
 * Legacy proxy for backward compatibility.
 * Uses the service-role key if available, otherwise the anon key.
 * Note: Without the service-role key, this client has no user context
 * and RLS policies will deny most operations. Prefer getServerClient(accessToken).
 */
export const supabaseAdmin: SupabaseClient = new Proxy(
  {} as SupabaseClient,
  {
    get(_target, prop) {
      const client = getServerClient();
      const value = Reflect.get(client, prop);
      return typeof value === "function" ? value.bind(client) : value;
    },
  },
);

export const STORAGE_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET || "eduadapt-documents";
