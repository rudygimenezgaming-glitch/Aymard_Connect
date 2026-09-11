import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { MessageSquare, Send, ArrowLeft, Search } from 'lucide-react';
import { supabase, fullName, formatDateTime, type Conversation, type Message, type Profile, type Session } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getSubjectColor } from '@/lib/theme';
import Navbar from '@/components/Navbar';

interface ConversationWithDetails extends Conversation {
  other_user: Profile | null;
  session: Session | null;
  last_message: Message | null;
  unread_count: number;
}

export default function Messages() {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [activeConv, setActiveConv] = useState<ConversationWithDetails | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const targetSessionId = searchParams.get('session');
  const targetUserId = searchParams.get('user');

  const loadConversations = useCallback(async () => {
    if (!profile) return;
    const { data: convs } = await supabase
      .from('conversations')
      .select('*')
      .or(`teacher_id.eq.${profile.id},student_id.eq.${profile.id}`)
      .order('created_at', { ascending: false });

    if (!convs || convs.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const enriched: ConversationWithDetails[] = [];
    for (const conv of convs) {
      const otherUserId = conv.teacher_id === profile.id ? conv.student_id : conv.teacher_id;
      const { data: otherUser } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', otherUserId)
        .maybeSingle();

      const { data: sess } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', conv.session_id)
        .maybeSingle();

      const { data: lastMsg } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { count: unreadCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .eq('read', false)
        .neq('sender_id', profile.id);

      enriched.push({
        ...conv,
        other_user: otherUser as Profile | null,
        session: sess as Session | null,
        last_message: lastMsg as Message | null,
        unread_count: unreadCount || 0,
      });
    }

    enriched.sort((a, b) => {
      const aTime = a.last_message?.created_at || a.created_at;
      const bTime = b.last_message?.created_at || b.created_at;
      return bTime.localeCompare(aTime);
    });

    setConversations(enriched);
    setLoading(false);

    // Auto-open conversation from URL params
    if (targetSessionId && targetUserId && !activeConv) {
      const found = enriched.find(
        (c) => c.session_id === targetSessionId &&
        (c.teacher_id === targetUserId || c.student_id === targetUserId)
      );
      if (found) {
        openConversation(found);
      } else {
        // Need to create the conversation
        await createConversation(targetSessionId, targetUserId);
      }
    }
  }, [profile, targetSessionId, targetUserId, activeConv]);

  async function createConversation(sessionId: string, otherUserId: string) {
    if (!profile) return;
    const teacherId = profile.role === 'teacher' ? profile.id : otherUserId;
    const studentId = profile.role === 'student' ? profile.id : otherUserId;

    // Check if conversation already exists
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('student_id', studentId)
      .eq('session_id', sessionId)
      .maybeSingle();

    if (existing) {
      const { data: otherUser } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', otherUserId)
        .maybeSingle();
      const { data: sess } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .maybeSingle();

      const conv: ConversationWithDetails = {
        ...existing,
        other_user: otherUser as Profile | null,
        session: sess as Session | null,
        last_message: null,
        unread_count: 0,
      };
      setConversations((prev) => [conv, ...prev.filter((c) => c.id !== conv.id)]);
      openConversation(conv);
      return;
    }

    const { data: newConv, error } = await supabase
      .from('conversations')
      .insert({
        teacher_id: teacherId,
        student_id: studentId,
        session_id: sessionId,
      })
      .select()
      .single();

    if (error || !newConv) return;

    const { data: otherUser } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', otherUserId)
      .maybeSingle();
    const { data: sess } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    const conv: ConversationWithDetails = {
      ...newConv,
      other_user: otherUser as Profile | null,
      session: sess as Session | null,
      last_message: null,
      unread_count: 0,
    };
    setConversations((prev) => [conv, ...prev]);
    openConversation(conv);
  }

  async function openConversation(conv: ConversationWithDetails) {
    setActiveConv(conv);
    setSearchParams({});

    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true });
    setMessages(msgs || []);

    // Mark unread messages as read
    if (profile) {
      const unreadIds = (msgs || []).filter((m) => !m.read && m.sender_id !== profile.id).map((m) => m.id);
      if (unreadIds.length > 0) {
        await supabase.from('messages').update({ read: true }).in('id', unreadIds);
        setConversations((prev) =>
          prev.map((c) => (c.id === conv.id ? { ...c, unread_count: 0 } : c))
        );
      }
    }

    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  async function handleSend() {
    if (!profile || !activeConv || !newMessage.trim()) return;
    const content = newMessage.trim();
    setNewMessage('');

    const { data: msg } = await supabase
      .from('messages')
      .insert({
        conversation_id: activeConv.id,
        sender_id: profile.id,
        content,
      })
      .select()
      .single();

    if (msg) {
      setMessages((prev) => [...prev, msg]);
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConv.id ? { ...c, last_message: msg } : c))
      );
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }

  // Real-time subscription for new messages
  useEffect(() => {
    if (!activeConv) return;
    const channel = supabase
      .channel(`messages:${activeConv.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConv.id}` },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          if (profile && newMsg.sender_id !== profile.id) {
            supabase.from('messages').update({ read: true }).eq('id', newMsg.id);
          }
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConv, profile]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const filteredConvs = conversations.filter((c) => {
    if (!searchTerm) return true;
    const name = c.other_user ? fullName(c.other_user).toLowerCase() : '';
    return name.includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Messagerie</h1>

        {conversations.length === 0 && !targetSessionId ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mx-auto mb-4">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Aucune conversation</h3>
            <p className="text-slate-500 mt-2">
              {profile?.role === 'teacher'
                ? 'Rendez-vous dans une de vos sessions pour démarrer une conversation avec un élève.'
                : 'Rendez-vous dans une de vos sessions pour envoyer un message à votre professeur.'}
            </p>
            <Link
              to={profile?.role === 'teacher' ? '/teacher' : '/student'}
              className="mt-6 inline-block px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
            >
              {profile?.role === 'teacher' ? 'Mes sessions' : 'Mes sessions'}
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex" style={{ height: 'calc(100vh - 200px)' }}>
            {/* Conversation list */}
            <div className={`w-full sm:w-80 border-r border-slate-200 flex flex-col ${activeConv ? 'hidden sm:flex' : ''}`}>
              <div className="p-3 border-b border-slate-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Rechercher..."
                    className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm text-slate-900"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {filteredConvs.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => openConversation(conv)}
                    className={`w-full text-left p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                      activeConv?.id === conv.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm flex-shrink-0">
                        {conv.other_user?.first_name[0]}{conv.other_user?.last_name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-slate-900 truncate text-sm">
                            {conv.other_user ? fullName(conv.other_user) : 'Inconnu'}
                          </p>
                          {conv.unread_count > 0 && (
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {conv.last_message?.content || 'Aucun message'}
                        </p>
                        {conv.session && (
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs border ${getSubjectColor(conv.session.subject)}`}>
                            {conv.session.subject}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
                {filteredConvs.length === 0 && (
                  <p className="p-4 text-center text-sm text-slate-400">Aucune conversation trouvée.</p>
                )}
              </div>
            </div>

            {/* Message area */}
            <div className={`flex-1 flex flex-col ${activeConv ? 'flex' : 'hidden sm:flex'}`}>
              {activeConv ? (
                <>
                  <div className="p-4 border-b border-slate-200 flex items-center gap-3">
                    <button onClick={() => setActiveConv(null)} className="sm:hidden text-slate-400 hover:text-slate-600">
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                      {activeConv.other_user?.first_name[0]}{activeConv.other_user?.last_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {activeConv.other_user ? fullName(activeConv.other_user) : 'Inconnu'}
                      </p>
                      {activeConv.session && (
                        <span className={`inline-block px-2 py-0.5 rounded text-xs border ${getSubjectColor(activeConv.session.subject)}`}>
                          {activeConv.session.subject} {activeConv.session.class_name && `— ${activeConv.session.class_name}`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                    {messages.length === 0 ? (
                      <div className="text-center text-slate-400 py-10">
                        <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">Démarrez la conversation</p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isMine = msg.sender_id === profile?.id;
                        return (
                          <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                                isMine
                                  ? 'bg-blue-600 text-white rounded-br-md'
                                  : 'bg-white border border-slate-200 text-slate-900 rounded-bl-md'
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                              <p className={`text-xs mt-1 ${isMine ? 'text-blue-200' : 'text-slate-400'}`}>
                                {formatDateTime(msg.created_at)}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="p-4 border-t border-slate-200 flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Écrire un message..."
                      className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm text-slate-900"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!newMessage.trim()}
                      className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-400">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Sélectionnez une conversation</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
