import { useMemo, useState } from 'react';
import { ChatBubble } from '../components/ChatBubble';
import { ResumeViewer } from '../components/ResumeViewer';
import { TypingIndicator } from '../components/TypingIndicator';
import { useWebSocket } from '../hooks/useWebSocket';
import { useInterview } from '../hooks/useInterview';
import { useInterviewStore } from '../store/interviewStore';

export function InterviewPage() {
  const { messages, isTyping, realtimeScore, interviewState, progress, connected } = useInterview();
  const { sendAnswer, endInterview } = useWebSocket({ url: 'ws://localhost:3001/ws', token: 'demo-token' });
  const resume = useInterviewStore((s) => s.resume);
  const [answer, setAnswer] = useState('');

  const canSend = connected && !!answer.trim() && !isTyping;
  const highlight = useMemo(() => interviewState?.currentSkill || '', [interviewState]);

  return (
    <div className="grid min-h-screen grid-cols-12 gap-4 bg-slate-50 p-4">
      <aside className="col-span-3"><ResumeViewer resume={resume} highlight={highlight} /></aside>
      <main className="col-span-6 rounded-2xl border bg-white p-4 flex flex-col">
        <div className="mb-4 flex items-center justify-between text-sm text-slate-500"><span>{interviewState?.stage || 'technical'}</span><span>{progress}</span></div>
        <div className="flex-1 overflow-y-auto pr-2">{messages.map((m) => <ChatBubble key={m.id} message={m} />)}{isTyping && <TypingIndicator />}</div>
        <textarea className="mt-4 min-h-28 rounded-2xl border p-3" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="输入回答，Enter 发送，Shift+Enter 换行" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (canSend) { sendAnswer(answer); setAnswer(''); } } }} />
        <div className="mt-3 flex gap-3"><button className="rounded-xl bg-indigo-600 px-4 py-2 text-white disabled:opacity-40" disabled={!canSend} onClick={() => { sendAnswer(answer); setAnswer(''); }}>发送</button><button className="rounded-xl border px-4 py-2" onClick={endInterview}>结束面试</button></div>
      </main>
      <aside className="col-span-3 rounded-2xl border bg-white p-4"><div className="text-sm text-slate-500">实时评分</div><div className="mt-2 text-5xl font-bold text-indigo-600">{realtimeScore}</div></aside>
    </div>
  );
}
