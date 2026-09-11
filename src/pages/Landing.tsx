import { Link } from 'react-router-dom';
import { GraduationCap, Users, BookOpen, MessageSquare, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function Landing() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (session && profile) {
    const dest = profile.role === 'admin' ? '/admin' : profile.role === 'teacher' ? '/teacher' : '/student';
    return <Navigate to={dest} replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-700 font-bold text-lg">
            <GraduationCap className="w-7 h-7" />
            <span>Aymard Connect</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-slate-600 hover:text-blue-700 font-medium text-sm transition-colors"
            >
              Connexion
            </Link>
            <Link
              to="/signup"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors shadow-sm"
            >
              S'inscrire
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24 md:pt-24 md:pb-32">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight tracking-tight">
              La plateforme qui relie
              <span className="text-blue-600"> professeurs </span>
              et
              <span className="text-blue-600"> élèves</span>
            </h1>
            <p className="mt-6 text-lg text-slate-600 leading-relaxed">
              Créez des sessions par matière, partagez un code avec vos élèves,
              publiez des devoirs et échangez en messagerie individuelle.
              Tout votre établissement, au même endroit.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold transition-all shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/30 hover:-translate-y-0.5"
              >
                Commencer
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-700 rounded-xl hover:bg-slate-50 font-semibold transition-all border border-slate-200 shadow-sm"
              >
                J'ai déjà un compte
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-blue-600/10 rounded-3xl blur-3xl" />
            <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100">
                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Sessions par matière</p>
                  <p className="text-sm text-slate-500">Un code à partager avec la classe</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center text-white">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Devoirs et dates</p>
                  <p className="text-sm text-slate-500">Publiez et suivez les rendus</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center text-white">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Messagerie individuelle</p>
                  <p className="text-sm text-slate-500">Échangez en privé, prof et élève</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white border-t border-slate-200 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-slate-900">Tout ce dont votre établissement a besoin</h2>
          <p className="mt-4 text-center text-slate-500 max-w-2xl mx-auto">
            Une plateforme simple, sécurisée et pensée pour le quotidien des professeurs et des élèves.
          </p>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Users, title: 'Sessions de classe', desc: 'Le professeur crée une session, choisit sa matière et obtient un code à partager.' },
              { icon: BookOpen, title: 'Gestion des devoirs', desc: 'Ajoutez des devoirs avec titre, description et date de remise. Les élèves voient tout en un coup d\'œil.' },
              { icon: MessageSquare, title: 'Messagerie privée', desc: 'Un professeur et un élève peuvent échanger individuellement, dans le contexte d\'une session.' },
              { icon: GraduationCap, title: 'Trois rôles clairs', desc: 'Élève, professeur ou administrateur : chaque compte a un rôle précis et un accès adapté.' },
              { icon: ArrowRight, title: 'Codes de session', desc: 'Un code court et unique pour rejoindre une classe. Simple à mémoriser et à partager.' },
              { icon: Users, title: 'Suivi des élèves', desc: 'Le professeur voit quels élèves ont rejoint chacune de ses sessions.' },
            ].map((f, i) => (
              <div key={i} className="p-6 rounded-xl border border-slate-200 hover:border-blue-200 hover:shadow-md transition-all">
                <div className="w-11 h-11 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 mb-4">
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white">Prêt à commencer ?</h2>
          <p className="mt-3 text-blue-100">Créez votre compte en moins d'une minute.</p>
          <Link
            to="/signup"
            className="mt-6 inline-flex items-center gap-2 px-8 py-3 bg-white text-blue-600 rounded-xl hover:bg-blue-50 font-semibold transition-all shadow-lg"
          >
            Créer un compte
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <footer className="bg-slate-900 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 text-sm">
          Aymard Connect — Plateforme scolaire
        </div>
      </footer>
    </div>
  );
}
