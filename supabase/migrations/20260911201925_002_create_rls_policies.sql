/*
# RLS policies for all tables

## Security
- profiles: authenticated can read all; users insert/update only their own
- sessions: teachers CRUD own; students read sessions they joined
- session_members: students insert/delete own; teacher + student can read
- assignments: teachers CRUD in own sessions; students read for joined sessions
- conversations: participants read; teacher (of session) or student (member) can create
- messages: participants can read/insert/update (mark as read)
*/

-- Profiles policies
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all"
  ON profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Sessions policies
DROP POLICY IF EXISTS "sessions_select_own_or_member" ON sessions;
CREATE POLICY "sessions_select_own_or_member"
  ON sessions FOR SELECT TO authenticated USING (
    teacher_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM session_members
      WHERE session_members.session_id = sessions.id
      AND session_members.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "sessions_insert_own" ON sessions;
CREATE POLICY "sessions_insert_own"
  ON sessions FOR INSERT TO authenticated WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "sessions_update_own" ON sessions;
CREATE POLICY "sessions_update_own"
  ON sessions FOR UPDATE TO authenticated
  USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "sessions_delete_own" ON sessions;
CREATE POLICY "sessions_delete_own"
  ON sessions FOR DELETE TO authenticated USING (teacher_id = auth.uid());

-- Session members policies
DROP POLICY IF EXISTS "members_select_own_or_teacher" ON session_members;
CREATE POLICY "members_select_own_or_teacher"
  ON session_members FOR SELECT TO authenticated USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = session_members.session_id
      AND sessions.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "members_insert_own" ON session_members;
CREATE POLICY "members_insert_own"
  ON session_members FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "members_delete_own" ON session_members;
CREATE POLICY "members_delete_own"
  ON session_members FOR DELETE TO authenticated USING (student_id = auth.uid());

-- Assignments policies
DROP POLICY IF EXISTS "assignments_select_own_or_member" ON assignments;
CREATE POLICY "assignments_select_own_or_member"
  ON assignments FOR SELECT TO authenticated USING (
    teacher_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM session_members
      WHERE session_members.session_id = assignments.session_id
      AND session_members.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "assignments_insert_own" ON assignments;
CREATE POLICY "assignments_insert_own"
  ON assignments FOR INSERT TO authenticated WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "assignments_update_own" ON assignments;
CREATE POLICY "assignments_update_own"
  ON assignments FOR UPDATE TO authenticated
  USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "assignments_delete_own" ON assignments;
CREATE POLICY "assignments_delete_own"
  ON assignments FOR DELETE TO authenticated USING (teacher_id = auth.uid());

-- Conversations policies
DROP POLICY IF EXISTS "conversations_select_participant" ON conversations;
CREATE POLICY "conversations_select_participant"
  ON conversations FOR SELECT TO authenticated USING (
    teacher_id = auth.uid() OR student_id = auth.uid()
  );

DROP POLICY IF EXISTS "conversations_insert_participant" ON conversations;
CREATE POLICY "conversations_insert_participant"
  ON conversations FOR INSERT TO authenticated WITH CHECK (
    (teacher_id = auth.uid()
     AND EXISTS (SELECT 1 FROM sessions WHERE sessions.id = conversations.session_id AND sessions.teacher_id = auth.uid()))
    OR
    (student_id = auth.uid()
     AND EXISTS (SELECT 1 FROM session_members WHERE session_members.session_id = conversations.session_id AND session_members.student_id = auth.uid()))
  );

-- Messages policies
DROP POLICY IF EXISTS "messages_select_participant" ON messages;
CREATE POLICY "messages_select_participant"
  ON messages FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.teacher_id = auth.uid() OR conversations.student_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "messages_insert_participant" ON messages;
CREATE POLICY "messages_insert_participant"
  ON messages FOR INSERT TO authenticated WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.teacher_id = auth.uid() OR conversations.student_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "messages_update_participant" ON messages;
CREATE POLICY "messages_update_participant"
  ON messages FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.teacher_id = auth.uid() OR conversations.student_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.teacher_id = auth.uid() OR conversations.student_id = auth.uid())
    )
  );
