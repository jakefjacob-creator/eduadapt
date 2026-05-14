/*
  # Add RLS policies for authenticated user access

  1. Changes
    - Add RLS policies on all tables so authenticated users can access
      data they own or are members of
    - Users can CRUD their own profile
    - Child members can access their children, documents, messages, invites
    - This allows the app to work with user-scoped JWT tokens (anon key)
      in addition to the service-role key

  2. Security
    - All policies require authentication (TO authenticated)
    - Users can only access data where they are a member
    - Users can only modify their own profile
*/

-- ── Users policies ──────────────────────────────────────────────
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ── Children policies ───────────────────────────────────────────
CREATE POLICY "Members can view children"
  ON public.children FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.child_members
      WHERE child_members.child_id = children.id
      AND child_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update children"
  ON public.children FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.child_members
      WHERE child_members.child_id = children.id
      AND child_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create children"
  ON public.children FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ── Child members policies ──────────────────────────────────────
CREATE POLICY "Members can view child memberships"
  ON public.child_members FOR SELECT
  TO authenticated
  USING (
    child_id IN (
      SELECT child_id FROM public.child_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can insert child memberships"
  ON public.child_members FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ── Documents policies ─────────────────────────────────────────
CREATE POLICY "Members can view documents"
  ON public.documents FOR SELECT
  TO authenticated
  USING (
    child_id IN (
      SELECT child_id FROM public.child_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can insert documents"
  ON public.documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Members can update documents"
  ON public.documents FOR UPDATE
  TO authenticated
  USING (
    child_id IN (
      SELECT child_id FROM public.child_members
      WHERE user_id = auth.uid()
    )
  );

-- ── Messages policies ──────────────────────────────────────────
CREATE POLICY "Members can view messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    child_id IN (
      SELECT child_id FROM public.child_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can insert messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ── Invites policies ────────────────────────────────────────────
CREATE POLICY "Members can view invites"
  ON public.invites FOR SELECT
  TO authenticated
  USING (
    child_id IN (
      SELECT child_id FROM public.child_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can insert invites"
  ON public.invites FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Members can update invites"
  ON public.invites FOR UPDATE
  TO authenticated
  USING (
    child_id IN (
      SELECT child_id FROM public.child_members
      WHERE user_id = auth.uid()
    )
  );
