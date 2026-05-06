import type { RealtimeEvaluation } from '@/types/shared';

export function RealtimeFeedback({ evaluation }: { evaluation: RealtimeEvaluation; visible: boolean; onClose: () => void }) {
  return <div className="rounded-2xl border bg-white p-4 shadow-float"><div className="text-lg font-bold">{evaluation.score}</div><div className="text-sm text-slate-600">{evaluation.feedback}</div></div>;
}
