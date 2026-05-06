import type { ResumeSummary } from '@/types/shared';

export function ResumeViewer({ resume, highlight }: { resume: ResumeSummary | null; highlight?: string }) {
  if (!resume) return <div className="rounded-2xl border bg-white p-4 text-slate-500">暂无简历</div>;
  return <div className="rounded-2xl border bg-white p-4 text-sm space-y-3"><div><h3 className="font-semibold text-slate-900">{resume.name}</h3><p className="text-slate-500">{resume.summary}</p></div><div className="flex flex-wrap gap-2">{resume.skills.map((s) => <span key={s} className={`rounded-full px-3 py-1 ${highlight?.includes(s) ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>{s}</span>)}</div></div>;
}
