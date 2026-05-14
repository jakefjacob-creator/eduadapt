import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client singleton.
 * Uses @supabase/ssr's createBrowserClient which stores the session
 * in cookies, making it readable by the SSR middleware.
 */
let client: ReturnType<typeof createBrowserClient> | undefined;

export function getSupabaseBrowserClient() {
  if (client) return client;

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  return client;
}
