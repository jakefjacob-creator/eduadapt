import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { getChildAccess } from "@/lib/auth";
import { getServerClient } from "@/lib/supabase";
import DocumentUpload from "@/components/DocumentUpload";
import MessageThread from "@/components/MessageThread";
import InvitePanel from "@/components/InvitePanel";
import type { DocumentRow, Invite, Message, Role } from "@/lib/types";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  worksheet: "Worksheet",
  lesson_plan: "Lesson plan",
  support_document: "Support document",
};
const KIND_LABEL: Record<string, string> = {
  modified: "Modified original",
  regenerated: "Newly created",
  support_document: "Support document",
};

interface Member {
  id: string;
  name: string | null;
  role: Role;
}

export default async function ChildPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { notice?: string };
}) {
  const headersList = headers();
  const userId = headersList.get("x-user-id");
  const accessToken = headersList.get("x-access-token");
  if (!userId) notFound();

  const access = await getChildAccess(params.id, userId, accessToken ?? undefined);
  if (!access) notFound();
  const { child, user } = access;

  const client = getServerClient(accessToken ?? undefined);
  const [{ data: docData }, { data: msgData }, { data: memberData }, { data: inviteData }] =
    await Promise.all([
      client
        .from("documents")
        .select("*")
        .eq("child_id", child.id)
        .order("created_at", { ascending: false }),
      client
        .from("messages")
        .select("*")
        .eq("child_id", child.id)
        .order("created_at", { ascending: true }),
      client
        .from("child_members")
        .select("role, users(id, name)")
        .eq("child_id", child.id),
      client
        .from("invites")
        .select("*")
        .eq("child_id", child.id)
        .order("created_at", { ascending: false }),
    ]);

  const documents = (docData ?? []) as DocumentRow[];
  const messages = (msgData ?? []) as Message[];
  const invites = (inviteData ?? []) as Invite[];
  const members: Member[] = (memberData ?? []).map((m) => {
    const u = m.users as unknown as { id: string; name: string | null };
    return { id: u.id, name: u.name, role: m.role as Role };
  });

  const ehcp = child.ehcp_summary;
  const quiz = child.quiz_results;
  const lp = child.learning_profile;

  type Event = { at: string; icon: string; text: string };
  const events: Event[] = [];
  for (const d of documents) {
    events.push({
      at: d.created_at,
      icon: d.status === "error" ? "⚠️" : "✨",
      text:
        d.status === "error"
          ? `Adaptation of "${d.original_filename ?? d.title}" failed`
          : `"${d.title}" — ${KIND_LABEL[d.output_kind ?? ""] ?? "added"}`,
    });
    if (d.feedback_at && d.feedback_score) {
      events.push({
        at: d.feedback_at,
        icon: "⭐",
        text: `"${d.title}" rated ${d.feedback_score}/5`,
      });
    }
  }
  for (const m of messages) {
    const sender = members.find((x) => x.id === m.sender_id);
    events.push({
      at: m.created_at,
      icon: "💬",
      text: `${sender?.name || "Someone"} sent a message`,
    });
  }
  events.sort((a, b) => +new Date(b.at) - +new Date(a.at));
  const feed = events.slice(0, 12);

  return (
    <div>
      <Link
        href="/dashboard"
        className="text-sm font-semibold text-muted hover:text-ink"
      >
        ← All children
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-sage text-2xl font-extrabold text-white shadow-soft">
          {child.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-3xl font-extrabold">{child.name}</h1>
          <p className="text-muted">
            {[
              child.age ? `Age ${child.age}` : null,
              child.year_group,
              `Your view: ${access.memberRole}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>

      {searchParams.notice && (
        <p className="mt-4 rounded-2xl bg-sunbeam/40 px-4 py-3 text-sm font-semibold text-ink">
          ⚠️ {searchParams.notice}
        </p>
      )}

      <section className="card mt-6 p-6">
        <h2 className="text-lg font-bold">Learning profile</h2>
        <p className="mt-1 text-sm text-muted">
          Everything EduAdapt knows about {child.name}. This context goes into
          every adaptation.
        </p>

        <div className="mt-4 grid gap-5 md:grid-cols-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-coral-dark">
              EHCP needs
            </h3>
            {ehcp ? (
              <div className="mt-2 space-y-2 text-sm">
                <div className="flex flex-wrap gap-1.5">
                  {ehcp.primary_needs?.map((n) => (
                    <span key={n} className="chip bg-coral-light/40 text-coral-dark">
                      {n}
                    </span>
                  ))}
                </div>
                <p>
                  <span className="font-semibold">Communication:</span>{" "}
                  {ehcp.communication}
                </p>
                <p>
                  <span className="font-semibold">Cognition &amp; learning:</span>{" "}
                  {ehcp.cognition_and_learning}
                </p>
                <p>
                  <span className="font-semibold">SEMH:</span>{" "}
                  {ehcp.social_emotional_mental_health}
                </p>
                <p>
                  <span className="font-semibold">Sensory &amp; physical:</span>{" "}
                  {ehcp.sensory_and_physical}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">
                No EHCP uploaded yet. You can add one by creating a new
                document — or re-create the profile with the EHCP attached.
              </p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-sage-dark">
              Onboarding quiz
            </h3>
            {quiz ? (
              <dl className="mt-2 space-y-1.5 text-sm">
                {[
                  ["Communication", quiz.communication_style],
                  ["Engagement", quiz.engagement_triggers],
                  ["Sensory", quiz.sensory_considerations],
                  ["Reading age", quiz.reading_age_estimate],
                  ["Regulation", quiz.emotional_regulation],
                  ["Interests", quiz.interests],
                  ["Avoid", quiz.things_to_avoid],
                ]
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k}>
                      <dt className="font-semibold">{k}</dt>
                      <dd className="text-muted">{v}</dd>
                    </div>
                  ))}
              </dl>
            ) : (
              <p className="mt-2 text-sm text-muted">
                Onboarding quiz not completed.
              </p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted">
              Refined from feedback
            </h3>
            {lp && lp.summary ? (
              <div className="mt-2 space-y-2 text-sm">
                <p>{lp.summary}</p>
                {lp.what_works?.length > 0 && (
                  <div>
                    <p className="font-semibold text-sage-dark">What works</p>
                    <ul className="list-inside list-disc text-muted">
                      {lp.what_works.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {lp.what_to_avoid?.length > 0 && (
                  <div>
                    <p className="font-semibold text-coral-dark">
                      What to avoid
                    </p>
                    <ul className="list-inside list-disc text-muted">
                      {lp.what_to_avoid.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">
                This grows automatically as you rate generated documents.
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <DocumentUpload childId={child.id} childName={child.name} />

          <div className="card p-6">
            <h2 className="text-lg font-bold">
              Documents{" "}
              <span className="text-sm font-semibold text-muted">
                ({documents.length})
              </span>
            </h2>
            {documents.length === 0 ? (
              <p className="mt-3 rounded-2xl bg-sand/60 px-4 py-6 text-center text-sm text-muted">
                No documents yet. Upload a worksheet or lesson plan above to
                get your first adaptation.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {documents.map((d) => (
                  <li key={d.id}>
                    <Link
                      href={`/dashboard/children/${child.id}/documents/${d.id}`}
                      className="flex items-center gap-3 rounded-2xl border border-clay/60 bg-white px-4 py-3 transition-all hover:border-coral hover:shadow-soft"
                    >
                      <span className="text-xl">
                        {d.status === "error"
                          ? "⚠️"
                          : d.document_type === "lesson_plan"
                            ? "📋"
                            : d.document_type === "support_document"
                              ? "🧩"
                              : "📝"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">
                          {d.title}
                        </span>
                        <span className="block text-xs text-muted">
                          {[
                            TYPE_LABEL[d.document_type ?? ""],
                            KIND_LABEL[d.output_kind ?? ""],
                            new Date(d.created_at).toLocaleDateString(),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      {d.status === "processing" && (
                        <span className="chip bg-sunbeam/50 text-ink">
                          Processing
                        </span>
                      )}
                      {d.status === "error" && (
                        <span className="chip bg-coral-light/50 text-coral-dark">
                          Failed
                        </span>
                      )}
                      {d.feedback_score && (
                        <span className="chip bg-sage-light/50 text-sage-dark">
                          {d.feedback_score}/5
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <InvitePanel
            childId={child.id}
            childName={child.name}
            members={members}
            initialInvites={invites}
          />

          <div className="card p-6">
            <h2 className="text-lg font-bold">Activity</h2>
            {feed.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                Nothing yet — uploads, feedback and messages will show here.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {feed.map((e, i) => (
                  <li key={i} className="flex gap-2.5 text-sm">
                    <span>{e.icon}</span>
                    <span className="flex-1">
                      <span className="block">{e.text}</span>
                      <span className="text-xs text-muted">
                        {new Date(e.at).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <section className="mt-6">
        <MessageThread
          childId={child.id}
          currentUserId={user.id}
          members={members}
          initialMessages={messages}
        />
      </section>
    </div>
  );
}
