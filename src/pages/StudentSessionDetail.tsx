import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Calendar, MessageSquare, User } from 'lucide-react';
import { supabase, formatDate, fullName, type Session, type Assignment, type Profile } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getSubjectColor } from '@/lib/theme';
import Navbar from '@/components/Navbar';

export default function StudentSessionDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [teacher, setTeacher] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!id) return;
    const { data: sess } = await supabase.from('sessions').select('*').eq('id', id).maybeSingle();
    setSession(sess as Session | null);

    const { data: assigns } = await supabase
      .from('assignments')
      .select('*')
      .eq('session_id', id)
      .order('due_date', { ascending: true, nullsFirst: false });
    setAssignments(assigns || []);

    if (sess) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sess.teacher_id)
        .maybeSingle();
      setTeacher(prof as Profile | null);
    }

    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <p className="text-slate-500">Session introuvable.</p>
          <Link to="/student" className="mt-4 inline-block text-blue-600 hover:underline">Retour</Link>
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  const upcoming = assignments.filter((a) => !a.due_date || a.due_date >= today);
  const past = assignments.filter((a) => a.due_date && a.due_date < today);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/student" className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 text-sm font-medium mb-6">
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Link>

        {/* Session header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getSubjectColor(session.subject)}`}>
            {session.subject}
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">{session.class_name || 'Session'}</h1>
          {teacher && (
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
              <User className="w-4 h-4" />
              Professeur : {fullName(teacher)}
              <Link
                to={`/messages?session=${session.id}&user=${teacher.id}`}
                className="ml-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Envoyer un message
              </Link>
            </div>
          )}
        </div>

        {/* Assignments */}
        <h2 className="font-semibold text-slate-900 mb-4">Devoirs ({assignments.length})</h2>

        {assignments.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucun devoir pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {upcoming.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">À venir</h3>
                <div className="space-y-3">
                  {upcoming.map((a) => (
                    <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-5">
                      <h4 className="font-semibold text-slate-900">{a.title}</h4>
                      {a.description && <p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">{a.description}</p>}
                      {a.due_date && (
                        <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">
                          <Calendar className="w-3.5 h-3.5" />
                          À rendre le {formatDate(a.due_date)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {past.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Date dépassée</h3>
                <div className="space-y-3">
                  {past.map((a) => (
                    <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-5 opacity-75">
                      <h4 className="font-semibold text-slate-900">{a.title}</h4>
                      {a.description && <p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">{a.description}</p>}
                      {a.due_date && (
                        <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-red-50 text-red-600">
                          <Calendar className="w-3.5 h-3.5" />
                          À rendre le {formatDate(a.due_date)} (passée)
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
