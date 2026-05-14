"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/components/AuthProvider";
import type { Role } from "@/lib/types";

export default function DashboardHeader({
  name,
  role,
}: {
  name: string | null;
  role: Role;
}) {
  const router = useRouter();
  const { supabase } = useSupabase();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-clay/60 bg-cream/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image
            src="/ChatGPT_Image_May_14__2026__06_33_41_PM-removebg-preview.png"
            alt="EduAdapt"
            width={32}
            height={32}
          />
        </Link>

        <div className="flex items-center gap-3">
          <span className="hidden text-right sm:block">
            <span className="block text-sm font-bold leading-tight">
              {name || "Welcome"}
            </span>
            <span className="block text-xs capitalize text-muted">{role}</span>
          </span>
          <button
            onClick={signOut}
            className="btn-ghost text-sm"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
