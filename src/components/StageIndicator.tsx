import { InterviewStage } from '@/types/shared';

export function StageIndicator({ currentStage, stages, progress }: { currentStage: InterviewStage; stages: InterviewStage[]; progress: { current: number; total: number } }) {
  return <div className="flex items-center gap-2 text-xs text-slate-500">{stages.map((s) => <span key={s} className={`rounded-full px-2 py-1 ${s === currentStage ? 'bg-primary text-white' : 'bg-slate-100'}`}>{s}</span>)}<span>{progress.current}/{progress.total}</span></div>;
}
