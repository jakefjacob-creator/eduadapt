import { getSupabaseBrowserClient } from "./supabase-client";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Make an authenticated API request. Automatically includes the
 * current user's access token in the Authorization header.
 */
export async function authFetch(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const supabase = getSupabaseBrowserClient() as SupabaseClient;
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
  };

  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  return fetch(input, { ...init, headers });
}
