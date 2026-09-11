export const SUBJECT_COLORS: Record<string, string> = {
  'Mathématiques': 'bg-blue-100 text-blue-700 border-blue-200',
  'Français': 'bg-rose-100 text-rose-700 border-rose-200',
  'Histoire-Géographie': 'bg-amber-100 text-amber-700 border-amber-200',
  'SVT': 'bg-green-100 text-green-700 border-green-200',
  'Physique-Chimie': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  'Anglais': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Espagnol': 'bg-orange-100 text-orange-700 border-orange-200',
  'EPS': 'bg-teal-100 text-teal-700 border-teal-200',
  'Arts Plastiques': 'bg-pink-100 text-pink-700 border-pink-200',
  'Musique': 'bg-violet-100 text-violet-700 border-violet-200',
  'Technologie': 'bg-slate-100 text-slate-700 border-slate-200',
};

export function getSubjectColor(subject: string): string {
  return SUBJECT_COLORS[subject] || 'bg-slate-100 text-slate-700 border-slate-200';
}
