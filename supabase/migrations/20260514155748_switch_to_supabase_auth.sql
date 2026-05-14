/*
  # Switch from Clerk to Supabase Auth

  1. Changes
    - Change `users.id` from `text` to `uuid` referencing `auth.users(id)`
    - Change all `user_id` / `uploaded_by` / `sender_id` / `invited_by` / `feedback_by` / `created_by` columns from `text` to `uuid`
    - Drop and recreate foreign key constraints to match new types
    - Add RLS policies for authenticated users to access their own data

  2. Security
    - Enable RLS on all tables (already enabled, no change)
    - Add SELECT policy on `users` so authenticated users can read their own row
    - All other access continues through server-side service-role key

  3. Important notes
    - This is a destructive migration for existing data. Since no tables exist yet (fresh DB), this is safe.
    - The `users` table now uses `auth.uid()` from Supabase Auth instead of Clerk user IDs.
*/

-- Drop existing tables in dependency order (safe on fresh DB)
DROP TABLE IF EXISTS public.invites CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.child_members CASCADE;
DROP TABLE IF EXISTS public.children CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ── Users ───────────────────────────────────────────────────────
-- id now references auth.users (Supabase Auth) instead of Clerk text IDs
CREATE TABLE public.users (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NOT NULL,
  name        text,
  role        text NOT NULL CHECK (role IN ('teacher', 'parent')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Children ────────────────────────────────────────────────────
CREATE TABLE public.children (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  age              int,
  year_group       text,
  ehcp_text        text,
  ehcp_summary     jsonb,
  quiz_results     jsonb,
  learning_profile jsonb,
  created_by       uuid REFERENCES public.users(id),
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ── Child members ───────────────────────────────────────────────
CREATE TABLE public.child_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id   uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('teacher', 'parent')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (child_id, user_id)
);

-- ── Documents ───────────────────────────────────────────────────
CREATE TABLE public.documents (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id           uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  uploaded_by        uuid REFERENCES public.users(id),
  title              text,
  original_filename  text,
  original_file_url  text,
  original_text      text,
  output_file_url    text,
  output_text        text,
  document_type      text,
  output_kind        text,
  adaptation_notes   text,
  parent_document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  status             text NOT NULL DEFAULT 'processing',
  error_message      text,
  feedback_score     int CHECK (feedback_score BETWEEN 1 AND 5),
  feedback_note      text,
  feedback_by        uuid REFERENCES public.users(id),
  feedback_at        timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- ── Messages ────────────────────────────────────────────────────
CREATE TABLE public.messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id   uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  sender_id  uuid NOT NULL REFERENCES public.users(id),
  content    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Invites ─────────────────────────────────────────────────────
CREATE TABLE public.invites (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id   uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  email      text NOT NULL,
  token      text NOT NULL UNIQUE,
  role       text NOT NULL DEFAULT 'parent' CHECK (role IN ('teacher', 'parent')),
  invited_by uuid REFERENCES public.users(id),
  accepted   boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ─────────────────────────────────────────────────────
CREATE INDEX idx_child_members_user   ON public.child_members(user_id);
CREATE INDEX idx_child_members_child  ON public.child_members(child_id);
CREATE INDEX idx_documents_child      ON public.documents(child_id);
CREATE INDEX idx_messages_child       ON public.messages(child_id);
CREATE INDEX idx_invites_token        ON public.invites(token);

-- ── Row Level Security ──────────────────────────────────────────
ALTER TABLE public.users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites        ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- ── Storage bucket ──────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('eduadapt-documents', 'eduadapt-documents', true)
ON CONFLICT (id) DO NOTHING;
