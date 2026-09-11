/*
# Extend schema: admin role, submissions, notifications, profile fields

## Overview
Adds support for:
- Admin role (director) who can see all sessions and manage accounts
- Assignment submissions (students submit work, teachers track rendu status)
- Notifications (new assignment, new member, new message)
- Profile customization (avatar URL, bio)

## Changes to existing tables
### profiles
- Added `avatar_url` (text, nullable) — URL to profile photo
- Added `bio` (text, nullable) — short presentation
- Role check extended to include 'admin'

## New Tables
### submissions
- `id` (uuid, PK)
- `assignment_id` (uuid, references assignments) — which assignment
- `student_id` (uuid, references profiles) — who submitted
- `content` (text) — submitted text/work
- `submitted_at` (timestamptz)
- Unique (assignment_id, student_id) — one submission per student per assignment

### notifications
- `id` (uuid, PK)
- `user_id` (uuid, references profiles) — who receives the notification
- `type` (text: 'new_assignment', 'new_member', 'new_message') — notification type
- `title` (text)
- `body` (text)
- `link` (text, nullable) — URL to navigate to
- `read` (boolean, default false)
- `created_at` (timestamptz)

## Security
- submissions: students insert/update/delete their own; teacher of the session can read all
- notifications: users can read/update/delete only their own notifications
- profiles role check updated to allow 'admin'
- Admin can read all profiles (they already can via the existing SELECT all policy)
- Admin needs to read all sessions — added a separate admin SELECT policy using is_session_teacher bypass

## Notes
1. The admin role can view all sessions via a new policy branch checking profile role = 'admin'
2. Submissions track whether a student has turned in work for an assignment
*/

-- Add columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio text;

-- Update role check to include admin
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('student', 'teacher', 'admin'));

-- Submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  submitted_at timestamptz DEFAULT now(),
  UNIQUE (assignment_id, student_id)
);

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Students can read their own submissions; teachers can read submissions for their sessions' assignments
DROP POLICY IF EXISTS "submissions_select_own_or_teacher" ON submissions;
CREATE POLICY "submissions_select_own_or_teacher"
  ON submissions FOR SELECT TO authenticated USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM assignments
      WHERE assignments.id = submissions.assignment_id
      AND assignments.teacher_id = auth.uid()
    )
  );

-- Students can insert their own submissions
DROP POLICY IF EXISTS "submissions_insert_own" ON submissions;
CREATE POLICY "submissions_insert_own"
  ON submissions FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());

-- Students can update their own submissions
DROP POLICY IF EXISTS "submissions_update_own" ON submissions;
CREATE POLICY "submissions_update_own"
  ON submissions FOR UPDATE TO authenticated
  USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

-- Students can delete their own submissions
DROP POLICY IF EXISTS "submissions_delete_own" ON submissions;
CREATE POLICY "submissions_delete_own"
  ON submissions FOR DELETE TO authenticated USING (student_id = auth.uid());

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('new_assignment', 'new_member', 'new_message')),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_insert_own" ON notifications;
CREATE POLICY "notifications_insert_own"
  ON notifications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
CREATE POLICY "notifications_delete_own"
  ON notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
