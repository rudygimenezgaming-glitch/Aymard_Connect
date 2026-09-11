import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase, formatDate, type Assignment, type Session } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getSubjectColor } from '@/lib/theme';
import Navbar from '@/components/Navbar';

type AssignmentWithSession = Assignment & { session: Session };

const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const SUBJECT_DOT_COLORS: Record<string, string> = {
  'Mathématiques': 'bg-blue-500',
  'Français': 'bg-rose-500',
  'Histoire-Géographie': 'bg-amber-500',
  'SVT': 'bg-green-500',
  'Physique-Chimie': 'bg-cyan-500',
  'Anglais': 'bg-indigo-500',
  'Espagnol': 'bg-orange-500',
  'EPS': 'bg-teal-500',
  'Arts Plastiques': 'bg-pink-500',
  'Musique': 'bg-violet-500',
  'Technologie': 'bg-slate-500',
};

function getSubjectDot(subject: string): string {
  return SUBJECT_DOT_COLORS[subject] || 'bg-slate-500';
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dateFromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m, d);
}

export default function CalendarPage() {
  const { profile } = useAuth();
  const [assignments, setAssignments] = useState<AssignmentWithSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(() => new Date());
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    async function load() {
      setLoading(true);
      let data: AssignmentWithSession[] | null = null;
      if (profile!.role === 'teacher') {
        const res = await supabase
          .from('assignments')
          .select('*, session:sessions(*)')
          .eq('teacher_id', profile!.id);
        data = res.data as AssignmentWithSession[] | null;
      } else if (profile!.role === 'student') {
        const { data: membership } = await supabase
          .from('session_members')
          .select('session_id')
          .eq('student_id', profile!.id);
        const sessionIds = (membership || []).map((m) => m.session_id);
        if (sessionIds.length === 0) {
          setAssignments([]);
          setLoading(false);
          return;
        }
        const res = await supabase
          .from('assignments')
          .select('*, session:sessions(*)')
          .in('session_id', sessionIds);
        data = res.data as AssignmentWithSession[] | null;
      } else {
        const res = await supabase
          .from('assignments')
          .select('*, session:sessions(*)');
        data = res.data as AssignmentWithSession[] | null;
      }
      setAssignments((data || []).filter((a) => a.due_date && a.session));
      setLoading(false);
    }
    load();
  }, [profile]);

  const byDay: Record<string, AssignmentWithSession[]> = {};
  for (const a of assignments) {
    if (!a.due_date) continue;
    const key = dateKey(new Date(a.due_date));
    (byDay[key] ||= []).push(a);
  }

  const year = current.getFullYear();
  const month = current.getMonth();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const leadingBlanks = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = dateKey(new Date());

  const cells: (number | null)[] = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedAssignments = selectedKey ? byDay[selectedKey] || [] : [];
  const sessionLinkBase = profile?.role === 'teacher' ? '/teacher/session' : '/student/session';

  function prevMonth() {
    setCurrent(new Date(year, month - 1, 1));
    setSelectedKey(null);
  }
  function nextMonth() {
    setCurrent(new Date(year, month + 1, 1));
    setSelectedKey(null);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Calendar className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Calendrier</h1>
            <p className="text-slate-500 text-sm">Devoirs à rendre</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  {MONTH_NAMES[month]} {year}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={prevMonth}
                    className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={nextMonth}
                    className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {DAY_NAMES.map((name) => (
                  <div key={name} className="text-center text-xs font-semibold text-slate-400 py-2">
                    {name}
                  </div>
                ))}
                {cells.map((day, i) => {
                  if (day === null) {
                    return <div key={i} className="min-h-[80px] rounded-lg" />;
                  }
                  const key = `${year}-${month}-${day}`;
                  const dayAssignments = byDay[key] || [];
                  const isToday = key === todayKey;
                  const isSelected = key === selectedKey;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedKey(key)}
                      className={`min-h-[80px] rounded-lg border p-1.5 text-left flex flex-col gap-1 transition-colors ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : isToday
                          ? 'border-blue-300 bg-blue-50/50'
                          : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-slate-700'}`}>
                        {day}
                      </span>
                      {dayAssignments.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {dayAssignments.slice(0, 4).map((a) => (
                            <span
                              key={a.id}
                              className={`w-2 h-2 rounded-full ${getSubjectDot(a.session.subject)}`}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 h-fit">
              {selectedKey ? (
                <>
                  <h3 className="font-semibold text-slate-900 mb-1">
                    {formatDate(dateFromKey(selectedKey).toISOString())}
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">
                    {selectedAssignments.length} devoir{selectedAssignments.length !== 1 ? 's' : ''}
                  </p>
                  {selectedAssignments.length === 0 ? (
                    <p className="text-sm text-slate-400 py-8 text-center">Aucun devoir ce jour</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedAssignments.map((a) => (
                        <Link
                          key={a.id}
                          to={`${sessionLinkBase}/${a.session.id}`}
                          className="block p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getSubjectColor(a.session.subject)}`}>
                              {a.session.subject}
                            </span>
                          </div>
                          <p className="font-medium text-slate-900 text-sm">{a.title}</p>
                          <p className="text-xs text-slate-500 mt-1">{a.session.class_name}</p>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-400 py-8 text-center">
                  Sélectionnez un jour pour voir les devoirs
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
