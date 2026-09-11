/*
# Fix infinite recursion in RLS policies

## Problem
The `sessions` SELECT policy references `session_members`, and the `session_members`
SELECT policy references `sessions`. This creates an infinite recursion when Postgres
evaluates the policies, causing the error:
"infinite recursion detected in policy for relation 'sessions'"

## Fix
1. Create a SECURITY DEFINER function `is_session_teacher(session_uuid)` that checks
   whether the current user is the teacher of a given session. Being SECURITY DEFINER,
   it bypasses RLS and does not trigger the sessions policy — breaking the circular
   dependency.
2. Rewrite the `session_members` SELECT policy to use `is_session_teacher()` instead
   of querying `sessions` directly.
3. No changes needed to the `sessions` SELECT policy — it can safely reference
   `session_members` because the session_members policy no longer loops back.

## Security
- The function only returns a boolean and checks ownership — it does not expose data.
- EXECUTE granted to `authenticated` role only.
*/

CREATE OR REPLACE FUNCTION is_session_teacher(session_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM sessions
    WHERE sessions.id = session_uuid
    AND sessions.teacher_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION is_session_teacher(uuid) TO authenticated;

-- Drop and recreate the session_members SELECT policy to use the function
DROP POLICY IF EXISTS "members_select_own_or_teacher" ON session_members;
CREATE POLICY "members_select_own_or_teacher"
  ON session_members FOR SELECT TO authenticated USING (
    student_id = auth.uid()
    OR is_session_teacher(session_id)
  );
