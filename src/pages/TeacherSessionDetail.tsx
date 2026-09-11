import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Edit2, Users, BookOpen, MessageSquare, Copy, Check, Calendar, X } from 'lucide-react';
import { supabase, formatDate, fullName, type Session, type Assignment, type Profile } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getSubjectColor } from '@/lib/theme';
import Navbar from '@/components/Navbar';

export default function TeacherSessionDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'assignments');
  const [showAddAssign, setShowAddAssign] = useState(false);
  const [editingAssign, setEditingAssign] = useState<Assignment | null>(null);
  const [assignTitle, setAssignTitle] = useState('');
  const [assignDesc, setAssignDesc] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!id) return;
    const { data: sess } = await supabase.from('sessions').select('*').eq('id', id).maybeSingle();
    setSession(sess as Session | null);

    const { data: assigns } = await supabase
      .from('assignments')
      .select('*')
      .eq('session_id', id)
      .order('created_at', { ascending: false });
    setAssignments(assigns || []);

    const { data: memData } = await supabase
      .from('session_members')
      .select('student_id')
      .eq('session_id', id);

    if (memData && memData.length > 0) {
      const studentIds = memData.map((m) => m.student_id);
      const { data: students } = await supabase
        .from('profiles')
        .select('*')
        .in('id', studentIds);
      setMembers(students || []);
    }

    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function copyCode() {
    if (session) {
      navigator.clipboard.writeText(session.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  }

  function openAddAssign() {
    setEditingAssign(null);
    setAssignTitle('');
    setAssignDesc('');
    setAssignDueDate('');
    setShowAddAssign(true);
  }

  function openEditAssign(a: Assignment) {
    setEditingAssign(a);
    setAssignTitle(a.title);
    setAssignDesc(a.description);
    setAssignDueDate(a.due_date || '');
    setShowAddAssign(true);
  }

  async function handleSaveAssign() {
    if (!id || !profile) return;
    const dueDate = assignDueDate || null;

    if (editingAssign) {
      const { data } = await supabase
        .from('assignments')
        .update({ title: assignTitle, description: assignDesc, due_date: dueDate })
        .eq('id', editingAssign.id)
        .select()
        .single();
      if (data) {
        setAssignments(assignments.map((a) => (a.id === data.id ? data : a)));
      }
    } else {
      const { data } = await supabase
        .from('assignments')
        .insert({
          session_id: id,
          teacher_id: profile.id,
          title: assignTitle,
          description: assignDesc,
          due_date: dueDate,
        })
        .select()
        .single();
      if (data) {
        setAssignments([data, ...assignments]);
      }
    }
    setShowAddAssign(false);
  }

  async function handleDeleteAssign(aId: string) {
    if (!confirm('Supprimer ce devoir ?')) return;
    await supabase.from('assignments').delete().eq('id', aId);
    setAssignments(assignments.filter((a) => a.id !== aId));
  }

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
          <Link to="/teacher" className="mt-4 inline-block text-blue-600 hover:underline">Retour au tableau de bord</Link>
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/teacher" className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 text-sm font-medium mb-6">
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Link>

        {/* Session header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getSubjectColor(session.subject)}`}>
                {session.subject}
              </span>
              <h1 className="text-2xl font-bold text-slate-900 mt-2">{session.class_name || 'Session'}</h1>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Code</span>
              <code className="text-xl font-bold tracking-wider text-blue-700">{session.code}</code>
              <button onClick={copyCode} className="text-slate-400 hover:text-blue-600 transition-colors">
                {copiedCode ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-slate-200">
          {[
            { key: 'assignments', label: 'Devoirs', icon: BookOpen },
            { key: 'students', label: 'Élèves', icon: Users },
            { key: 'messages', label: 'Messages', icon: MessageSquare },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Assignments tab */}
        {activeTab === 'assignments' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">Devoirs ({assignments.length})</h2>
              <button
                onClick={openAddAssign}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                Ajouter un devoir
              </button>
            </div>

            {assignments.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Aucun devoir pour le moment.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.map((a) => {
                  const overdue = a.due_date && a.due_date < today;
                  return (
                    <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-5 group">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900">{a.title}</h3>
                          {a.description && <p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">{a.description}</p>}
                          {a.due_date && (
                            <div className={`mt-3 inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                              overdue ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                            }`}>
                              <Calendar className="w-3.5 h-3.5" />
                              À rendre le {formatDate(a.due_date)}
                              {overdue && ' (passée)'}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditAssign(a)} className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteAssign(a.id)} className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Students tab */}
        {activeTab === 'students' && (
          <div>
            <h2 className="font-semibold text-slate-900 mb-4">Élèves inscrits ({members.length})</h2>
            {members.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Aucun élève n'a encore rejoint cette session.</p>
                <p className="text-slate-400 text-sm mt-1">Partagez le code <code className="font-bold text-blue-700">{session.code}</code> avec vos élèves.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                      {m.first_name[0]}{m.last_name[0]}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{fullName(m)}</p>
                    </div>
                    <Link
                      to={`/messages?session=${session.id}&user=${m.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600 text-sm font-medium transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Message
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Messages tab */}
        {activeTab === 'messages' && (
          <div>
            <h2 className="font-semibold text-slate-900 mb-4">Conversations avec les élèves</h2>
            {members.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Aucun élève pour démarrer une conversation.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                {members.map((m) => (
                  <Link
                    key={m.id}
                    to={`/messages?session=${session.id}&user=${m.id}`}
                    className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                      {m.first_name[0]}{m.last_name[0]}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{fullName(m)}</p>
                      <p className="text-sm text-slate-400">Envoyer un message</p>
                    </div>
                    <MessageSquare className="w-5 h-5 text-slate-300" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit assignment modal */}
      {showAddAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowAddAssign(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">{editingAssign ? 'Modifier le devoir' : 'Nouveau devoir'}</h2>
              <button onClick={() => setShowAddAssign(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Titre</label>
                <input
                  type="text"
                  value={assignTitle}
                  onChange={(e) => setAssignTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-slate-900"
                  placeholder="Ex: Exercices page 42"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                <textarea
                  value={assignDesc}
                  onChange={(e) => setAssignDesc(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-slate-900 resize-none"
                  placeholder="Détails du devoir..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Date de remise</label>
                <input
                  type="date"
                  value={assignDueDate}
                  onChange={(e) => setAssignDueDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-slate-900"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowAddAssign(false)} className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium transition-colors">
                Annuler
              </button>
              <button
                onClick={handleSaveAssign}
                disabled={!assignTitle.trim()}
                className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold transition-colors disabled:opacity-60"
              >
                {editingAssign ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
