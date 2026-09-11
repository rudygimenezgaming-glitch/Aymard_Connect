import { supabase } from '@/lib/supabase';

export async function createNotification(
  userId: string,
  type: 'new_assignment' | 'new_member' | 'new_message',
  title: string,
  body: string,
  link: string | null = null
) {
  await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    body,
    link,
  });
}
