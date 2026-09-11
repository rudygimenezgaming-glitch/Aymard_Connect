import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const SUBJECTS = [
  'Mathématiques',
  'Français',
  'Histoire-Géographie',
  'SVT',
  'Physique-Chimie',
  'Anglais',
  'Espagnol',
  'EPS',
  'Arts Plastiques',
  'Musique',
  'Technologie',
] as const;

export type Subject = (typeof SUBJECTS)[number];

export type Role = 'student' | 'teacher' | 'admin';

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  role: Role;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

export interface Session {
  id: string;
  teacher_id: string;
  subject: string;
  class_name: string;
  code: string;
  created_at: string;
}

export interface SessionMember {
  id: string;
  session_id: string;
  student_id: string;
  joined_at: string;
}

export interface Assignment {
  id: string;
  session_id: string;
  teacher_id: string;
  title: string;
  description: string;
  due_date: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  teacher_id: string;
  student_id: string;
  session_id: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

export interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  content: string;
  submitted_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'new_assignment' | 'new_member' | 'new_message';
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

export function generateSessionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function fullName(profile: { first_name: string; last_name: string }): string {
  return `${profile.first_name} ${profile.last_name}`;
}

export function formatDate(date: string | null): string {
  if (!date) return 'Aucune date';
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
