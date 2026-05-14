-- ════════════════════════════════════════════════════════════════
-- EduAdapt — Supabase schema
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query).
-- ════════════════════════════════════════════════════════════════

-- ── Users ───────────────────────────────────────────────────────
-- id is the Clerk user id (text), kept in sync on first request.
create table if not exists public.users (
  id          text primary key,
  email       text not null,
  name        text,
  role        text not null check (role in ('teacher', 'parent')),
  created_at  timestamptz not null default now()
);

-- ── Children ────────────────────────────────────────────────────
create table if not exists public.children (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  age              int,
  year_group       text,
  ehcp_text        text,                       -- raw extracted EHCP text
  ehcp_summary     jsonb,                      -- structured needs (Claude)
  quiz_results     jsonb,                      -- onboarding quiz answers
  learning_profile jsonb,                      -- builds over time from feedback
  created_by       text references public.users(id),
  created_at       timestamptz not null default now()
);

-- ── Child members ───────────────────────────────────────────────
-- Who can access a child's shared dashboard. A teacher can manage
-- many children; a parent is linked to their child here too.
create table if not exists public.child_members (
  id         uuid primary key default gen_random_uuid(),
  child_id   uuid not null references public.children(id) on delete cascade,
  user_id    text not null references public.users(id) on delete cascade,
  role       text not null check (role in ('teacher', 'parent')),
  created_at timestamptz not null default now(),
  unique (child_id, user_id)
);

-- ── Documents ───────────────────────────────────────────────────
create table if not exists public.documents (
  id                 uuid primary key default gen_random_uuid(),
  child_id           uuid not null references public.children(id) on delete cascade,
  uploaded_by        text references public.users(id),
  title              text,
  original_filename  text,
  original_file_url  text,                     -- Supabase Storage URL
  original_text      text,                     -- extracted source content
  output_file_url    text,                     -- generated PDF URL
  output_text        text,                     -- editable generated content
  document_type      text,                     -- worksheet | lesson_plan | support_document
  output_kind        text,                     -- modified | regenerated | support_document
  adaptation_notes   text,                     -- what Claude changed and why
  parent_document_id uuid references public.documents(id) on delete set null,
  status             text not null default 'processing', -- processing | ready | error
  error_message      text,
  feedback_score     int check (feedback_score between 1 and 5),
  feedback_note      text,
  feedback_by        text references public.users(id),
  feedback_at        timestamptz,
  created_at         timestamptz not null default now()
);

-- ── Messages ────────────────────────────────────────────────────
create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  child_id   uuid not null references public.children(id) on delete cascade,
  sender_id  text not null references public.users(id),
  content    text not null,
  created_at timestamptz not null default now()
);

-- ── Invites ─────────────────────────────────────────────────────
create table if not exists public.invites (
  id         uuid primary key default gen_random_uuid(),
  child_id   uuid not null references public.children(id) on delete cascade,
  email      text not null,
  token      text not null unique,
  role       text not null default 'parent' check (role in ('teacher', 'parent')),
  invited_by text references public.users(id),
  accepted   boolean not null default false,
  created_at timestamptz not null default now()
);

-- ── Indexes ─────────────────────────────────────────────────────
create index if not exists idx_child_members_user   on public.child_members(user_id);
create index if not exists idx_child_members_child  on public.child_members(child_id);
create index if not exists idx_documents_child      on public.documents(child_id);
create index if not exists idx_messages_child       on public.messages(child_id);
create index if not exists idx_invites_token        on public.invites(token);

-- ── Row Level Security ──────────────────────────────────────────
-- All application access goes through Next.js server routes using the
-- Supabase service-role key (which bypasses RLS). Enabling RLS with no
-- public policies locks out the anon/auth keys so the database is not
-- directly reachable from the browser.
alter table public.users          enable row level security;
alter table public.children       enable row level security;
alter table public.child_members  enable row level security;
alter table public.documents      enable row level security;
alter table public.messages       enable row level security;
alter table public.invites        enable row level security;

-- ── Storage bucket ──────────────────────────────────────────────
-- Holds uploaded source files and generated PDFs.
insert into storage.buckets (id, name, public)
values ('eduadapt-documents', 'eduadapt-documents', true)
on conflict (id) do nothing;
