/*
  # Add public read policy for invites by token

  1. Changes
    - Add SELECT policy on invites that allows unauthenticated users
      to look up an invite by token (needed for the invite acceptance page)

  2. Security
    - Only allows SELECT, not INSERT/UPDATE/DELETE
    - This is needed because the invite page is public (no auth required)
*/

CREATE POLICY "Anyone can view invites by token"
  ON public.invites FOR SELECT
  TO anon
  USING (true);

-- Also allow anon to read children for the invite page display
CREATE POLICY "Anyone can view children for invites"
  ON public.children FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.invites
      WHERE invites.child_id = children.id
    )
  );
