import { useParams } from 'react-router-dom';
import { ScoreRing } from '@/components/ScoreRing';
import { SkillRadar } from '@/components/SkillRadar';
import { useInterview } from '@/hooks/useInterview';

export function ReportPage() {
  const { id } = useParams();
  const interview = useInterview();
  const report = interview.report;
  return <div className="mx-auto max-w-6xl p-6 space-y-6"><header className="rounded-large bg-surface p-6 shadow-card"><div className="flex items-center justify-between"><div><h1 className="text-3xl font-bold">面试报告</h1><p className="text-slate-500">Session: {id}</p></div><ScoreRing score={report?.overallScore || 0} /></div></header><div className="grid gap-6 lg:grid-cols-2"><div className="rounded-large bg-surface p-5 shadow-card"><h2 className="mb-3 text-xl font-semibold">技能雷达</h2><SkillRadar data={report?.skillRadar || []} /></div><div className="rounded-large bg-surface p-5 shadow-card"><h2 className="mb-3 text-xl font-semibold">优势 / 不足</h2><div className="space-y-4"><div><div className="font-semibold text-success">优势</div><ul className="list-disc pl-5 text-sm text-slate-600">{report?.strengths.map((x) => <li key={x}>{x}</li>)}</ul></div><div><div className="font-semibold text-danger">不足</div><ul className="list-disc pl-5 text-sm text-slate-600">{report?.weaknesses.map((x) => <li key={x}>{x}</li>)}</ul></div></div></div></div></div>;
}
