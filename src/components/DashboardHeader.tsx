"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import type { Role } from "@/lib/types";

export default function DashboardHeader({
  name,
  role,
}: {
  name: string | null;
  role: Role;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-clay/60 bg-cream/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-coral text-base font-extrabold text-white shadow-soft">
            E
          </span>
          <span className="text-lg font-extrabold">EduAdapt</span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="hidden text-right sm:block">
            <span className="block text-sm font-bold leading-tight">
              {name || "Welcome"}
            </span>
            <span className="block text-xs capitalize text-muted">{role}</span>
          </span>
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    </header>
  );
}
