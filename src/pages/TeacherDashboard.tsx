import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users, BookOpen, Copy, Check, Trash2, Calendar, MessageSquare } from 'lucide-react';
import { supabase, SUBJECTS, generateSessionCode, fullName, type Session, type Profile, type Assignment } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getSubjectColor } from '@/lib/theme';
import Navbar from '@/components/Navbar';

export default function TeacherDashboard() {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [membersCount, setMembersCount] = useState<Record<string, number>>({});
  const [assignmentCounts, setAssignmentCounts] = useState<Record<string, number>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [subject, setSubject] = useState<string>(SUBJECTS[0]);
  const [className, setClassName] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const loadSessions = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .eq('teacher_id', profile.id)
      .order('created_at', { ascending: false });
    setSessions(data || []);

    if (data && data.length > 0) {
      const counts: Record<string, number> = {};
      const assignCounts: Record<string, number> = {};
      for (const s of data) {
        const { count } = await supabase
          .from('session_members')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', s.id);
        counts[s.id] = count || 0;

        const { count: ac } = await supabase
          .from('assignments')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', s.id);
        assignCounts[s.id] = ac || 0;
      }
      setMembersCount(counts);
      setAssignmentCounts(assignCounts);
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  async function handleCreate() {
    if (!profile) {
      setCreateError('Votre profil n\'est pas encore chargé. Patientez quelques secondes puis réessayez.');
      return;
    }
    setCreating(true);
    setCreateError('');

    let code = generateSessionCode();
    for (let i = 0; i < 5; i++) {
      const { data } = await supabase.from('sessions').select('id').eq('code', code).maybeSingle();
      if (!data) break;
      code = generateSessionCode();
    }

    const { data, error } = await supabase
      .from('sessions')
      .insert({
        teacher_id: profile.id,
        subject,
        class_name: className,
        code,
      })
      .select()
      .single();

    if (error) {
      setCreateError('Erreur lors de la création de la session : ' + error.message);
      setCreating(false);
      return;
    }

    setSessions([data, ...sessions]);
    setMembersCount({ ...membersCount, [data.id]: 0 });
    setAssignmentCounts({ ...assignmentCounts, [data.id]: 0 });
    setShowCreate(false);
    setClassName('');
    setCreating(false);
  }

  async function handleDelete(sessionId: string) {
    if (!confirm('Supprimer cette session ? Les devoirs et les inscriptions seront également supprimés.')) return;
    await supabase.from('sessions').delete().eq('id', sessionId);
    setSessions(sessions.filter((s) => s.id !== sessionId));
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Bonjour, {profile?.first_name}
            </h1>
            <p className="text-slate-500 mt-1">Gérez vos sessions, vos devoirs et vos élèves</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors shadow-sm whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            Créer une session
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mx-auto mb-4">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Aucune session pour le moment</h3>
            <p className="text-slate-500 mt-2">Créez votre première session pour commencer à partager des devoirs avec vos élèves.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
            >
              <Plus className="w-5 h-5" />
              Créer une session
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {sessions.map((session) => (
              <div key={session.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow group">
                <div className="flex items-start justify-between mb-3">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getSubjectColor(session.subject)}`}>
                    {session.subject}
                  </span>
                  <button
                    onClick={() => handleDelete(session.id)}
                    className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="font-semibold text-slate-900 text-lg">
                  {session.class_name || 'Sans nom de classe'}
                </h3>

                <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-500 font-medium">Code de session</span>
                  <code className="text-lg font-bold tracking-wider text-blue-700 ml-auto">{session.code}</code>
                  <button
                    onClick={() => copyCode(session.code)}
                    className="text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    {copiedCode === session.code ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="mt-4 flex items-center gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    {membersCount[session.id] || 0} élève{(membersCount[session.id] || 0) !== 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4" />
                    {assignmentCounts[session.id] || 0} devoir{(assignmentCounts[session.id] || 0) !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="mt-5 flex gap-2">
                  <Link
                    to={`/teacher/session/${session.id}`}
                    className="flex-1 text-center px-3 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-medium transition-colors"
                  >
                    Voir les détails
                  </Link>
                  <Link
                    to={`/teacher/session/${session.id}?tab=messages`}
                    className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create session modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-slate-900">Créer une session</h2>
            <p className="text-slate-500 text-sm mt-1">Choisissez votre matière et nommez votre classe.</p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Matière</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-slate-900 bg-white"
                >
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nom de la classe (optionnel)</label>
                <input
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-slate-900"
                  placeholder="Ex: 3e B"
                />
              </div>
            </div>

            {createError && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {createError}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => { setShowCreate(false); setCreateError(''); }}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold transition-colors disabled:opacity-60"
              >
                {creating ? 'Création...' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
