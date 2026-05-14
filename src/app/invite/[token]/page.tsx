import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";
import InviteAccept from "@/components/InviteAccept";
import type { Role } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: { token: string };
}) {
  const { data: invite } = await supabaseAdmin
    .from("invites")
    .select("token, role, accepted, child_id, children(name)")
    .eq("token", params.token)
    .maybeSingle();

  const child = invite?.children as unknown as { name: string } | null;

  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-coral text-lg font-extrabold text-white shadow-soft">
            E
          </span>
          <span className="text-xl font-extrabold">EduAdapt</span>
        </div>

        <div className="card p-7 text-center">
          {!invite || !child ? (
            <>
              <div className="text-4xl">🔍</div>
              <h1 className="mt-3 text-xl font-extrabold">
                This invite link isn&rsquo;t valid
              </h1>
              <p className="mt-1 text-sm text-muted">
                It may have been mistyped or withdrawn. Ask whoever shared it
                to send you a fresh link.
              </p>
              <Link href="/" className="btn-ghost mt-5">
                Go to homepage
              </Link>
            </>
          ) : (
            <>
              <div className="text-4xl">🤝</div>
              <h1 className="mt-3 text-xl font-extrabold">
                You&rsquo;ve been invited
              </h1>
              <p className="mt-1 text-sm text-muted">
                Join <strong>{child.name}</strong>&rsquo;s shared EduAdapt
                dashboard. You&rsquo;ll be able to upload and adapt materials,
                see the activity feed, and message the rest of the team.
              </p>
              <InviteAccept
                token={invite.token}
                childName={child.name}
                role={invite.role as Role}
                alreadyAccepted={invite.accepted}
              />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
