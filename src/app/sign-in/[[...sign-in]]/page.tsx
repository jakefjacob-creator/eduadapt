"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSupabase } from "@/components/AuthProvider";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";
  const { supabase } = useSupabase();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(
        authError.message === "Invalid login credentials"
          ? "Invalid email or password. Please try again."
          : authError.message,
      );
      setLoading(false);
      return;
    }

    router.push(redirect);
    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <div className="w-full max-w-md">
        <h1 className="mb-6 text-center text-2xl font-extrabold">
          Welcome back to <span className="text-coral">EduAdapt</span>
        </h1>

        <form onSubmit={handleSubmit} className="card p-7 shadow-soft">
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="Your password"
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-2xl bg-coral-light/40 px-4 py-2.5 text-sm font-semibold text-coral-dark">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary mt-6 w-full text-base"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <p className="mt-4 text-center text-sm text-muted">
            Don&apos;t have an account?{" "}
            <Link
              href={`/sign-up?redirect=${encodeURIComponent(redirect)}`}
              className="font-semibold text-coral underline"
            >
              Create one
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
