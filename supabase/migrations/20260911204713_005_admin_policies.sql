/*
# Allow admin to view all sessions and manage accounts

## Changes
- sessions SELECT policy: admin can see all sessions
- session_members SELECT policy: admin can see all members
- assignments SELECT policy: admin can see all assignments
- conversations: admin NOT given access (privacy of messages)
- profiles: admin can update any profile (to manage roles)

## Security
- Admin is identified by checking profiles.role = 'admin' via a SECURITY DEFINER function
  to avoid recursion with the sessions policy.
*/

-- Helper: is current user an admin?
CREATE OR REPLACE FUNCTION is_current_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION is_current_admin() TO authenticated;

-- Update sessions SELECT policy to allow admin
DROP POLICY IF EXISTS "sessions_select_own_or_member" ON sessions;
CREATE POLICY "sessions_select_own_or_member"
  ON sessions FOR SELECT TO authenticated USING (
    teacher_id = auth.uid()
    OR is_current_admin()
    OR EXISTS (
      SELECT 1 FROM session_members
      WHERE session_members.session_id = sessions.id
      AND session_members.student_id = auth.uid()
    )
  );

-- Update session_members SELECT policy to allow admin
DROP POLICY IF EXISTS "members_select_own_or_teacher" ON session_members;
CREATE POLICY "members_select_own_or_teacher"
  ON session_members FOR SELECT TO authenticated USING (
    student_id = auth.uid()
    OR is_current_admin()
    OR is_session_teacher(session_id)
  );

-- Update assignments SELECT policy to allow admin
DROP POLICY IF EXISTS "assignments_select_own_or_member" ON assignments;
CREATE POLICY "assignments_select_own_or_member"
  ON assignments FOR SELECT TO authenticated USING (
    teacher_id = auth.uid()
    OR is_current_admin()
    OR EXISTS (
      SELECT 1 FROM session_members
      WHERE session_members.session_id = assignments.session_id
      AND session_members.student_id = auth.uid()
    )
  );

-- Allow admin to update profiles (manage roles)
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR is_current_admin())
  WITH CHECK (auth.uid() = id OR is_current_admin());
