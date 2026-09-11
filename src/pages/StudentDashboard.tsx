import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, BookOpen, Calendar, Users, ArrowRight, MessageSquare } from 'lucide-react';
import { supabase, type Session, type Assignment } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getSubjectColor } from '@/lib/theme';
import { formatDate } from '@/lib/supabase';
import Navbar from '@/components/Navbar';

export default function StudentDashboard() {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);
  const [loading, setLoading] = useState(true);
  const [assignmentCounts, setAssignmentCounts] = useState<Record<string, number>>({});

  const loadSessions = useCallback(async () => {
    if (!profile) return;
    const { data: membership } = await supabase
      .from('session_members')
      .select('session_id')
      .eq('student_id', profile.id);

    if (!membership || membership.length === 0) {
      setSessions([]);
      setLoading(false);
      return;
    }

    const sessionIds = membership.map((m) => m.session_id);
    const { data: sessionData } = await supabase
      .from('sessions')
      .select('*')
      .in('id', sessionIds)
      .order('created_at', { ascending: false });

    setSessions(sessionData || []);

    if (sessionData && sessionData.length > 0) {
      const counts: Record<string, number> = {};
      for (const s of sessionData) {
        const { count } = await supabase
          .from('assignments')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', s.id);
        counts[s.id] = count || 0;
      }
      setAssignmentCounts(counts);
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  async function handleJoin() {
    if (!profile || !joinCode.trim()) return;
    setJoinError('');
    setJoining(true);

    const code = joinCode.trim().toUpperCase();
    const { data: session } = await supabase
      .from('sessions')
      .select('*')
      .eq('code', code)
      .maybeSingle();

    if (!session) {
      setJoinError('Aucune session trouvée avec ce code.');
      setJoining(false);
      return;
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('session_members')
      .select('id')
      .eq('session_id', session.id)
      .eq('student_id', profile.id)
      .maybeSingle();

    if (existing) {
      setJoinError('Vous avez déjà rejoint cette session.');
      setJoining(false);
      return;
    }

    const { error } = await supabase
      .from('session_members')
      .insert({ session_id: session.id, student_id: profile.id });

    if (error) {
      setJoinError('Erreur lors de l\'inscription à la session.');
      setJoining(false);
      return;
    }

    setJoinCode('');
    setJoining(false);
    loadSessions();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            Bonjour, {profile?.first_name}
          </h1>
          <p className="text-slate-500 mt-1">Vos sessions et vos devoirs</p>
        </div>

        {/* Join session card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" />
            Rejoindre une session
          </h2>
          <p className="text-slate-500 text-sm mt-1">Entrez le code donné par votre professeur</p>

          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-slate-900 text-center text-lg font-bold tracking-widest uppercase"
              placeholder="ABC123"
              maxLength={6}
            />
            <button
              onClick={handleJoin}
              disabled={joining || !joinCode.trim()}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {joining ? 'Inscription...' : 'Rejoindre'}
            </button>
          </div>
          {joinError && <p className="mt-3 text-sm text-red-600">{joinError}</p>}
        </div>

        {/* Sessions list */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mx-auto mb-4">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Aucune session rejointe</h3>
            <p className="text-slate-500 mt-2">Utilisez le code donné par votre professeur pour rejoindre une session.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {sessions.map((session) => (
              <div key={session.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getSubjectColor(session.subject)}`}>
                  {session.subject}
                </span>
                <h3 className="font-semibold text-slate-900 text-lg mt-3">
                  {session.class_name || 'Session'}
                </h3>

                <div className="mt-4 flex items-center gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4" />
                    {assignmentCounts[session.id] || 0} devoir{(assignmentCounts[session.id] || 0) !== 1 ? 's' : ''}
                  </span>
                </div>

                <Link
                  to={`/student/session/${session.id}`}
                  className="mt-5 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 text-sm font-medium transition-colors"
                >
                  Voir les devoirs
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
