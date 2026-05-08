import { useEffect, useMemo, useState } from 'react';
import { ChatBubble } from '@/components/ChatBubble';
import { RealtimeFeedback } from '@/components/RealtimeFeedback';
import { ResumeViewer } from '@/components/ResumeViewer';
import { ScoreRing } from '@/components/ScoreRing';
import { SkillRadar } from '@/components/SkillRadar';
import { StageIndicator } from '@/components/StageIndicator';
import { TypingIndicator } from '@/components/TypingIndicator';
import { useInterview } from '@/hooks/useInterview';
import { useAppStore } from '@/store';
import { InterviewStage } from '@/types/shared';

export function InterviewPage() {
  const interview = useInterview();
  const { flowContext, currentResume, optimizedResume } = useAppStore();
  const resume = optimizedResume || currentResume;
  const [answer, setAnswer] = useState('');
  const canSend = !interview.isAiTyping && !interview.isStreaming && !!answer.trim();
  const highlight = useMemo(() => interview.currentQuestion?.context || flowContext.focusSkills.join(', '), [interview.currentQuestion, flowContext.focusSkills]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && canSend) { e.preventDefault(); interview.sendAnswer(answer); setAnswer(''); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') { e.preventDefault(); interview.pauseInterview(); }
      if (e.key === 'Escape') { /* stop stream */ }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [answer, canSend, interview]);

  return (
    <div className="mx-auto grid min-h-screen max-w-[1440px] grid-cols-[280px_minmax(0,1fr)_320px] gap-4 p-4">
      <aside className="space-y-4">
        <div className="rounded-large bg-surface p-4 shadow-card">
          <div className="text-sm text-slate-500">面试上下文</div>
          <div className="mt-2 text-lg font-semibold">{flowContext.companyName || '未填写公司需求'}</div>
          <div className="mt-2 text-sm text-slate-600">{flowContext.jobDescription || '系统将基于你的简历自动生成问题'}</div>
        </div>
        <ResumeViewer resume={resume} highlight={highlight} />
        <div className="rounded-large bg-surface p-4 shadow-card"><div className="mb-2 text-sm text-slate-500">技能标签</div><div className="flex flex-wrap gap-2">{resume?.skills.map((s) => <span key={s} className="rounded-full bg-slate-100 px-3 py-1 text-sm">{s}</span>)}</div></div>
      </aside>
      <main className="flex min-h-[80vh] flex-col rounded-large bg-surface shadow-card">
        <div className="border-b px-5 py-4"><StageIndicator currentStage={interview.stage} stages={[InterviewStage.RESUME_CONFIRM, InterviewStage.SELF_INTRO, InterviewStage.TECHNICAL, InterviewStage.PROJECT_DEEP, InterviewStage.BEHAVIORAL, InterviewStage.CODING, InterviewStage.Q_AND_A]} progress={interview.progress} /></div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">{interview.messages.map((m) => <ChatBubble key={m.id} message={m} />)}{interview.isAiTyping && <TypingIndicator />}</div>
        <div className="border-t p-4"><textarea className="min-h-28 w-full rounded-large border p-3 outline-none focus:border-primary" placeholder="请输入你的回答..." value={answer} onChange={(e) => setAnswer(e.target.value)} /><div className="mt-3 flex items-center justify-between"><div className="text-xs text-slate-500">{answer.length} 字</div><div className="flex gap-2"><button className="rounded-full border px-4 py-2" onClick={() => interview.pauseInterview()}>暂停</button><button className="rounded-full bg-primary px-4 py-2 text-white disabled:opacity-50" disabled={!canSend} onClick={() => { interview.sendAnswer(answer); setAnswer(''); }}>发送</button></div></div></div>
      </main>
      <aside className="space-y-4"><div className="rounded-large bg-surface p-5 shadow-card"><div className="text-sm text-slate-500">实时评分</div><div className="mt-4"><ScoreRing score={interview.realtimeScore} /></div></div><SkillRadar data={interview.report?.skillRadar || []} /><div className="rounded-large bg-surface p-5 shadow-card"><div className="text-sm text-slate-500">维度评分</div><div className="mt-3 space-y-2 text-sm">{Object.entries(interview.dimensions).map(([k, v]) => <div key={k} className="flex justify-between"><span>{k}</span><span>{v}</span></div>)}</div></div></aside>
      {interview.isAiTyping ? <div className="fixed bottom-6 right-6"><RealtimeFeedback visible evaluation={{ score: interview.realtimeScore, dimensions: interview.dimensions, feedback: 'AI 正在根据简历和公司需求生成下一步问题...', followUpNeeded: false }} onClose={() => undefined} /></div> : null}
    </div>
  );
}
