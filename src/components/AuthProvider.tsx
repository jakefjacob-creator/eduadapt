"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  type Session,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";

const SupabaseContext = createContext<{
  supabase: SupabaseClient;
  session: Session | null;
}>({ supabase: null as unknown as SupabaseClient, session: null });

export function useSupabase() {
  return useContext(SupabaseContext);
}

export function useSession() {
  const { session } = useContext(SupabaseContext);
  return session;
}

export function useUser() {
  const { session } = useContext(SupabaseContext);
  return session?.user ?? null;
}

export function useAuth() {
  const { session } = useContext(SupabaseContext);
  return {
    isSignedIn: !!session,
    isSignedOut: !session,
    userId: session?.user?.id ?? null,
  };
}

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => getSupabaseBrowserClient());
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  return (
    <SupabaseContext.Provider value={{ supabase, session }}>
      {children}
    </SupabaseContext.Provider>
  );
}
