# EduAdapt

A SEND (Special Educational Needs and Disabilities) learning assistant. Teachers
and parents upload lesson plans, worksheets or support documents and have them
intelligently adapted — or regenerated — for one specific child's needs, as
defined by their EHCP and an onboarding profile. The AI refines its output over
time from feedback, and a shared dashboard bridges the gap between home and
school.

## What's in the box

- **Child profile system** — name / age / year group, EHCP upload (PDF or Word)
  with key needs extracted by Claude, a 7-part onboarding quiz, and a *learning
  profile* that grows from feedback.
- **Document pipeline** — accepts PDF, Word `.docx`, images (JPG/PNG photos of
  printed sheets, read via Claude vision) and plain text. Each upload is
  identified, extracted, sent to Claude with the child's full profile, and
  returned as either a *modified* original or a *regenerated* document. Lesson
  plans also get a support document (visual schedule / prompt cards /
  communication aid) generated alongside.
- **Editable, downloadable output** — every generated document is editable in
  the browser and re-renders to a clean A4 PDF.
- **Feedback & learning loop** — a 1–5 rating plus a note on each document;
  Claude folds the whole feedback history into a refined learning profile.
- **Shared dashboard** — teacher and parent views of the same child, an activity
  feed, an email-link invite system, and a per-child teacher ↔ parent message
  thread.

## Tech stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** — warm, accessible design system
- **Clerk** — email/password auth, two roles (teacher / parent)
- **Supabase** — Postgres database + file storage
- **Claude API** (`claude-sonnet-4-20250514`) — all AI processing
- **pdf-lib** — PDF generation · **pdf-parse** / **mammoth** — document extraction
- Deploys to **Vercel**

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Create the external services (all have free tiers)

**Supabase**

1. Create a project at [supabase.com](https://supabase.com).
2. Open the SQL editor and run the contents of [`supabase/schema.sql`](supabase/schema.sql).
   This creates all tables, indexes, RLS, and the `eduadapt-documents` storage
   bucket.
3. From **Project Settings → API**, copy the project URL, the `anon` key, and
   the `service_role` key.

**Clerk**

1. Create an application at [clerk.com](https://clerk.com) with **Email** +
   **Password** enabled.
2. Copy the publishable key and secret key from the API keys page.

**Anthropic**

1. Create an API key at [console.anthropic.com](https://console.anthropic.com).

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Then fill in `.env.local`:

| Variable | Where it comes from |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk → API keys |
| `CLERK_SECRET_KEY` | Clerk → API keys |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (keep secret) |
| `SUPABASE_STORAGE_BUCKET` | `eduadapt-documents` (created by the schema) |
| `ANTHROPIC_API_KEY` | Anthropic Console |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-20250514` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` in dev; your Vercel URL in prod |

The Clerk `*_URL` variables in `.env.example` can be left as-is.

### 4. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Using EduAdapt

1. **Sign up** and choose your role (teacher or parent).
2. **Add a child** — three steps: basics, EHCP upload, onboarding quiz. The EHCP
   is read and its needs extracted automatically.
3. **Adapt a document** — upload a worksheet, lesson plan or support document
   from the child's dashboard. Claude adapts it for that specific child; you get
   an editable result and a downloadable PDF.
4. **Give feedback** — rate each document 1–5 with a note. The child's learning
   profile is refined and future adaptations improve.
5. **Share the dashboard** — create an invite link for the child's parent (or
   another teacher) and send it to them. They get their own view of the same
   profile, documents, activity feed and message thread.

## How the Claude integration works

- **System prompt** (`src/lib/claude.ts`) establishes Claude as a specialist
  SEND assistant with deep understanding of autism, ADHD, dyslexia and
  processing difficulties, instructed to produce output that feels handcrafted
  for the individual child — never templated.
- **Adaptation prompt** includes: the child's extracted EHCP needs, their
  onboarding quiz / communication profile, a summary of historical feedback (the
  learning profile), and the uploaded document content — with an explicit
  instruction to adapt with empathy, clarity and specificity to *this exact
  child*.
- Claude decides whether to **modify** the original or **regenerate** from
  scratch, identifies the document type, and (for lesson plans) generates a
  support document alongside.

## Project structure

```
src/
  app/
    page.tsx                       Landing page
    sign-in/ sign-up/              Clerk auth pages
    onboarding/                    Role selection
    invite/[token]/                Accept a shared-dashboard invite
    dashboard/
      page.tsx                     List of children
      children/new/                Create child + onboarding quiz
      children/[id]/               Shared child dashboard
      children/[id]/documents/[id] Document view / edit / feedback
    api/
      users/sync/                  Create-or-refresh the app user row
      children/                    Create a child + extract EHCP
      documents/                   Upload + Claude adaptation pipeline
      documents/[id]/              Get + edit (re-renders PDF)
      documents/[id]/feedback/     Rating + learning-profile refinement
      messages/                    Teacher ↔ parent thread
      invites/  invites/accept/    Shared-dashboard invite system
  lib/
    supabase.ts   claude.ts   extract.ts   pdf.ts   storage.ts   auth.ts
  components/                      Client UI components
supabase/schema.sql                Database schema — run this once
```

## Deploying to Vercel

1. Push the repo to GitHub and import it into [Vercel](https://vercel.com).
2. Add every variable from `.env.example` in the Vercel project settings.
3. Set `NEXT_PUBLIC_APP_URL` to your deployed URL so invite links are correct.
4. In Clerk, add your Vercel domain to the allowed origins.

## Notes

- All database access goes through Next.js server routes using the Supabase
  service-role key. RLS is enabled with no public policies, so the database is
  not directly reachable from the browser.
- Invite links are generated for you to send (e.g. by email). Wiring an email
  provider to send them automatically is a natural next step.
