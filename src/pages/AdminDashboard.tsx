import { useState, useEffect } from 'react';
import { Shield, Users, BookOpen } from 'lucide-react';
import { supabase, fullName, type Session, type Profile, type Role } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getSubjectColor } from '@/lib/theme';
import Navbar from '@/components/Navbar';

interface SessionRow extends Session {
  teacherName: string;
  memberCount: number;
  assignmentCount: number;
}

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<'sessions' | 'users'>('sessions');
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (tab === 'sessions') loadSessions();
    else if (tab === 'users') loadUsers();
  }, [tab]);

  async function loadSessions() {
    setLoading(true);
    const { data: raw } = await supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false });
    if (!raw) {
      setSessions([]);
      setLoading(false);
      return;
    }
    const teacherIds = [...new Set(raw.map((s) => s.teacher_id))];
    const { data: teachers } = await supabase
      .from('profiles')
      .select('*')
      .in('id', teacherIds);
    const teacherMap = new Map((teachers || []).map((t) => [t.id, t]));

    const rows: SessionRow[] = [];
    for (const s of raw) {
      const { count: memberCount } = await supabase
        .from('session_members')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', s.id);
      const { count: assignmentCount } = await supabase
        .from('assignments')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', s.id);
      const teacher = teacherMap.get(s.teacher_id) as Profile | undefined;
      rows.push({
        ...s,
        teacherName: teacher ? fullName(teacher) : 'Professeur supprimé',
        memberCount: memberCount || 0,
        assignmentCount: assignmentCount || 0,
      });
    }
    setSessions(rows);
    setLoading(false);
  }

  async function loadUsers() {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    setUsers((data as Profile[]) || []);
    setLoading(false);
  }

  async function handleRoleChange(userId: string, role: Role) {
    setUpdatingId(userId);
    await supabase.from('profiles').update({ role }).eq('id', userId);
    setUsers(users.map((u) => (u.id === userId ? { ...u, role } : u)));
    setUpdatingId(null);
  }

  const roleLabel: Record<Role, string> = {
    student: 'Élève',
    teacher: 'Professeur',
    admin: 'Admin',
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center text-white">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Administration</h1>
            <p className="text-slate-500 mt-0.5">Gérez les sessions et les utilisateurs de la plateforme</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 border-b border-slate-200">
          {(['sessions', 'users'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 font-medium text-sm transition-colors border-b-2 -mb-px ${
                tab === t
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'sessions' ? 'Sessions' : 'Utilisateurs'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : tab === 'sessions' ? (
          sessions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mx-auto mb-4">
                <BookOpen className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Aucune session</h3>
              <p className="text-slate-500 mt-2">Aucune session n'a été créée sur la plateforme.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                      <th className="px-5 py-3 font-semibold">Matière</th>
                      <th className="px-5 py-3 font-semibold">Classe</th>
                      <th className="px-5 py-3 font-semibold">Code</th>
                      <th className="px-5 py-3 font-semibold">Professeur</th>
                      <th className="px-5 py-3 font-semibold text-center">Élèves</th>
                      <th className="px-5 py-3 font-semibold text-center">Devoirs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s) => (
                      <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="px-5 py-3">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getSubjectColor(s.subject)}`}>
                            {s.subject}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-900 font-medium">{s.class_name || '—'}</td>
                        <td className="px-5 py-3">
                          <code className="font-bold tracking-wider text-blue-700">{s.code}</code>
                        </td>
                        <td className="px-5 py-3 text-slate-700">{s.teacherName}</td>
                        <td className="px-5 py-3 text-center text-slate-600">{s.memberCount}</td>
                        <td className="px-5 py-3 text-center text-slate-600">{s.assignmentCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : users.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mx-auto mb-4">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Aucun utilisateur</h3>
            <p className="text-slate-500 mt-2">Aucun utilisateur n'est enregistré sur la plateforme.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                    <th className="px-5 py-3 font-semibold">Nom</th>
                    <th className="px-5 py-3 font-semibold">Inscrit le</th>
                    <th className="px-5 py-3 font-semibold">Rôle</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm">
                              {u.first_name?.[0]?.toUpperCase() || '?'}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-slate-900">{fullName(u)}</p>
                            {u.id === profile?.id && (
                              <span className="text-xs text-blue-600 font-medium">Vous</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {new Date(u.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-5 py-3">
                        <select
                          value={u.role}
                          disabled={updatingId === u.id || u.id === profile?.id}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-900 text-sm bg-white disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <option value="student">{roleLabel.student}</option>
                          <option value="teacher">{roleLabel.teacher}</option>
                          <option value="admin">{roleLabel.admin}</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
