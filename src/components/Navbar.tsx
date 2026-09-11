import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { GraduationCap, LogOut, MessageSquare, LayoutDashboard, BookOpen, Bell, Calendar, BarChart3, User, Shield, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fullName, supabase, type Notification } from '@/lib/supabase';

export default function Navbar() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotif, setShowNotif] = useState(false);

  useEffect(() => {
    if (!profile) return;
    async function loadNotifs() {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile!.id)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(10);
      setNotifications(data || []);
    }
    loadNotifs();
    const interval = setInterval(loadNotifs, 15000);
    return () => clearInterval(interval);
  }, [profile]);

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  async function markAllRead() {
    if (!profile) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', profile.id).eq('read', false);
    setNotifications([]);
  }

  if (!profile) return null;

  const isAdmin = profile.role === 'admin';
  const isTeacher = profile.role === 'teacher';
  const dashboardPath = isAdmin ? '/admin' : isTeacher ? '/teacher' : '/student';
  const roleLabel = isAdmin ? 'Admin' : isTeacher ? 'Professeur' : 'Élève';
  const roleBadgeColor = isAdmin ? 'bg-amber-100 text-amber-700' : isTeacher ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600';

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to={dashboardPath} className="flex items-center gap-2 text-blue-700 font-bold text-lg">
            <GraduationCap className="w-7 h-7" />
            <span className="hidden sm:inline">Aymard Connect</span>
          </Link>

          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              to={dashboardPath}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition-colors text-sm font-medium"
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="hidden sm:inline">Accueil</span>
            </Link>

            {isTeacher && (
              <Link
                to="/teacher/assignments"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition-colors text-sm font-medium"
              >
                <BookOpen className="w-5 h-5" />
                <span className="hidden sm:inline">Devoirs</span>
              </Link>
            )}

            {(isTeacher || isAdmin) && (
              <Link
                to="/stats"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition-colors text-sm font-medium"
              >
                <BarChart3 className="w-5 h-5" />
                <span className="hidden sm:inline">Stats</span>
              </Link>
            )}

            {!isAdmin && (
              <Link
                to="/calendar"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition-colors text-sm font-medium"
              >
                <Calendar className="w-5 h-5" />
                <span className="hidden sm:inline">Calendrier</span>
              </Link>
            )}

            {!isTeacher && !isAdmin && (
              <Link
                to="/directory"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition-colors text-sm font-medium"
              >
                <Search className="w-5 h-5" />
                <span className="hidden sm:inline">Annuaire</span>
              </Link>
            )}

            <Link
              to="/messages"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition-colors text-sm font-medium"
            >
              <MessageSquare className="w-5 h-5" />
              <span className="hidden sm:inline">Messages</span>
            </Link>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => { setShowNotif(!showNotif); if (!showNotif) markAllRead(); }}
                className="relative flex items-center gap-2 px-3 py-2 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition-colors text-sm font-medium"
              >
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>
              {showNotif && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotif(false)} />
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                    <div className="p-3 border-b border-slate-100 font-semibold text-slate-900 text-sm">Notifications</div>
                    {notifications.length === 0 ? (
                      <p className="p-6 text-center text-sm text-slate-400">Aucune nouvelle notification</p>
                    ) : (
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.map((n) => (
                          <div key={n.id} className="p-3 border-b border-slate-50 hover:bg-slate-50">
                            {n.link && <Link to={n.link} onClick={() => setShowNotif(false)} className="block">
                              <p className="font-medium text-slate-900 text-sm">{n.title}</p>
                              <p className="text-xs text-slate-500 mt-0.5">{n.body}</p>
                            </Link>}
                            {!n.link && (
                              <>
                                <p className="font-medium text-slate-900 text-sm">{n.title}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{n.body}</p>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <Link
              to="/profile"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition-colors text-sm font-medium"
            >
              <User className="w-5 h-5" />
              <span className="hidden sm:inline">Profil</span>
            </Link>

            <div className="hidden md:flex items-center px-3 py-2 text-sm text-slate-500">
              {fullName(profile)}
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${roleBadgeColor}`}>
                {roleLabel}
              </span>
            </div>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors text-sm font-medium"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
