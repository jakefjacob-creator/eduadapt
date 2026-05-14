import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDbUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import type { Child, Role } from "@/lib/types";

export const dynamic = "force-dynamic";

interface ChildCard extends Child {
  memberRole: Role;
  documentCount: number;
}

async function getChildren(userId: string): Promise<ChildCard[]> {
  const { data: memberships } = await supabaseAdmin
    .from("child_members")
    .select("role, child_id, children(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!memberships?.length) return [];

  const childIds = memberships.map((m) => m.child_id);
  const { data: docs } = await supabaseAdmin
    .from("documents")
    .select("child_id")
    .in("child_id", childIds);

  const counts = new Map<string, number>();
  for (const d of docs ?? []) {
    counts.set(d.child_id, (counts.get(d.child_id) ?? 0) + 1);
  }

  return memberships
    .filter((m) => m.children)
    .map((m) => ({
      ...(m.children as unknown as Child),
      memberRole: m.role as Role,
      documentCount: counts.get(m.child_id) ?? 0,
    }));
}

export default async function DashboardPage() {
  const headersList = headers();
  const userId = headersList.get("x-user-id");
  if (!userId) redirect("/sign-in");

  const user = await getDbUser(userId);
  if (!user) redirect("/onboarding");

  const children = await getChildren(user.id);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Your children</h1>
          <p className="mt-1 text-muted">
            {user.role === "teacher"
              ? "Profiles you manage. Add a child, then invite their parent to share the dashboard."
              : "Your child's shared space — adapt materials and stay connected with school."}
          </p>
        </div>
        <Link href="/dashboard/children/new" className="btn-primary">
          + Add a child
        </Link>
      </div>

      {children.length === 0 ? (
        <div className="card mt-8 grid place-items-center p-12 text-center">
          <div className="text-4xl">🌱</div>
          <h2 className="mt-3 text-xl font-bold">No children yet</h2>
          <p className="mt-1 max-w-sm text-muted">
            Start by creating a child&rsquo;s profile. You&rsquo;ll upload their
            EHCP and answer a short onboarding quiz so EduAdapt understands
            their needs.
          </p>
          <Link href="/dashboard/children/new" className="btn-primary mt-6">
            Create the first profile
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {children.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/children/${c.id}`}
              className="card p-6 transition-all hover:shadow-lift"
            >
              <div className="flex items-start justify-between">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-sage text-lg font-extrabold text-white">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <span
                  className={`chip ${
                    c.memberRole === "teacher"
                      ? "bg-sunbeam/60 text-ink"
                      : "bg-sage-light/50 text-sage-dark"
                  }`}
                >
                  {c.memberRole === "teacher" ? "Teacher view" : "Parent view"}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-bold">{c.name}</h3>
              <p className="text-sm text-muted">
                {[
                  c.age ? `Age ${c.age}` : null,
                  c.year_group ? c.year_group : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Profile in progress"}
              </p>
              <div className="mt-4 flex items-center gap-3 text-xs text-muted">
                <span>
                  {c.documentCount} document{c.documentCount === 1 ? "" : "s"}
                </span>
                <span>·</span>
                <span>{c.ehcp_summary ? "EHCP added" : "No EHCP yet"}</span>
                <span>·</span>
                <span>{c.quiz_results ? "Quiz done" : "Quiz pending"}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
