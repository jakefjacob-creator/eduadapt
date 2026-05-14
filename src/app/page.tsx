import Link from "next/link";
import { AuthAware } from "@/components/AuthAware";

export default function LandingPage() {
  return (
    <main className="relative overflow-hidden">
      {/* soft background blobs */}
      <div className="pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full bg-coral-light/40 blur-3xl" />
      <div className="pointer-events-none absolute top-64 -left-24 h-80 w-80 rounded-full bg-sage-light/40 blur-3xl" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-coral text-lg font-extrabold text-white shadow-soft">
            E
          </span>
          <span className="text-xl font-extrabold">EduAdapt</span>
        </div>
        <nav className="flex items-center gap-3">
          <AuthAware
            signedOut={
              <>
                <Link href="/sign-in" className="btn-ghost">
                  Sign in
                </Link>
                <Link href="/sign-up" className="btn-primary">
                  Get started
                </Link>
              </>
            }
            signedIn={
              <Link href="/dashboard" className="btn-primary">
                Go to dashboard
              </Link>
            }
          />
        </nav>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-20 pt-12 md:pt-20">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <span className="chip bg-sunbeam/60 text-ink">
              For teachers &amp; parents, together
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight md:text-5xl">
              Learning materials,{" "}
              <span className="text-coral">made for one child.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted">
              Upload a lesson plan, worksheet or support document. EduAdapt
              reads the child&rsquo;s EHCP and profile, then thoughtfully adapts
              the material for their exact needs — and gets better with every
              piece of feedback.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <AuthAware
                signedOut={
                  <>
                    <Link href="/sign-up" className="btn-primary text-base">
                      Create your free account
                    </Link>
                    <Link href="/sign-in" className="btn-ghost text-base">
                      I already have one
                    </Link>
                  </>
                }
                signedIn={
                  <Link href="/dashboard" className="btn-primary text-base">
                    Open your dashboard
                  </Link>
                }
              />
            </div>
          </div>

          <div className="card p-6 md:p-8">
            <h2 className="text-lg font-bold">How it works</h2>
            <ol className="mt-4 space-y-4">
              {[
                {
                  t: "Build the child's profile",
                  d: "Upload their EHCP and answer a short onboarding quiz about communication, sensory and regulation needs.",
                },
                {
                  t: "Upload any material",
                  d: "PDF, Word, a photo of a printed sheet, or plain text — worksheets, lesson plans, support docs.",
                },
                {
                  t: "Get a handcrafted adaptation",
                  d: "Claude rewrites or rebuilds it for this exact child, with a downloadable, editable PDF.",
                },
                {
                  t: "Feedback makes it sharper",
                  d: "Rate each document; the learning profile grows and future outputs improve.",
                },
              ].map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sage text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-bold">{s.t}</p>
                    <p className="text-sm text-muted">{s.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="mt-16 grid gap-5 md:grid-cols-3">
          {[
            {
              t: "A shared dashboard",
              d: "Teachers and parents see the same child profile, activity feed and message thread — closing the gap between home and school.",
            },
            {
              t: "Genuinely individual",
              d: "Outputs use the child's real interests, reading age and regulation needs. Never a generic SEND template.",
            },
            {
              t: "Specialist understanding",
              d: "Built around autism, ADHD, dyslexia and processing differences — with empathy, clarity and specificity.",
            },
          ].map((f, i) => (
            <div key={i} className="card p-6">
              <h3 className="font-bold">{f.t}</h3>
              <p className="mt-2 text-sm text-muted">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t border-clay/60 py-8 text-center text-sm text-muted">
        EduAdapt — a SEND learning assistant. Built for the people who care.
      </footer>
    </main>
  );
}
