import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@/store';
import { InterviewStage, type ClientEvents, type InterviewReport, type Message, type Question, type RealtimeEvaluation } from '@/types/shared';
import { useWebSocket } from './useWebSocket';

export interface UseInterviewReturn {
  sessionId: string | null;
  stage: InterviewStage;
  status: 'idle' | 'connecting' | 'interviewing' | 'paused' | 'ended' | 'error';
  currentQuestion: Question | null;
  questionSequence: number;
  messages: Array<{ id: string; role: 'user' | 'assistant' | 'system'; content: string; questionId?: string; evaluation?: RealtimeEvaluation; timestamp: number; isStreaming?: boolean }>;
  realtimeScore: number;
  dimensions: RealtimeEvaluation['dimensions'];
  progress: { current: number; total: number; elapsedTime: number };
  startInterview: (resumeId: string, jobId?: string) => void;
  sendAnswer: (content: string) => void;
  pauseInterview: () => void;
  resumeInterview: () => void;
  endInterview: () => void;
  isAiTyping: boolean;
  isStreaming: boolean;
  streamContent: string;
  report: InterviewReport | null;
  error: { code: string; message: string } | null;
}

export function useInterview(): UseInterviewReturn {
  const ws = useWebSocket();
  const interview = useAppStore((s) => s.interview);
  const setInterview = useAppStore((s) => s.setInterview);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [stage, setStage] = useState<InterviewStage>(InterviewStage.IDLE);
  const [status, setStatus] = useState<UseInterviewReturn['status']>('idle');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionSequence, setQuestionSequence] = useState(0);
  const [messages, setMessages] = useState<UseInterviewReturn['messages']>([]);
  const [realtimeScore, setRealtimeScore] = useState(0);
  const [dimensions, setDimensions] = useState<RealtimeEvaluation['dimensions']>({ technical: 0, communication: 0, logic: 0, experience: 0 });
  const [progress, setProgress] = useState({ current: 0, total: 0, elapsedTime: 0 });
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  useEffect(() => { setStatus(ws.connecting ? 'connecting' : ws.connected ? 'interviewing' : 'idle'); }, [ws.connected, ws.connecting]);
  useEffect(() => {
    ws.on('interview:started', (payload) => { setSessionId(payload.sessionId); setStage(payload.stage); setCurrentQuestion(payload.firstQuestion); setQuestionSequence(1); setStatus('interviewing'); setMessages((m) => [...m, { id: crypto.randomUUID(), role: 'assistant', content: payload.firstQuestion.content, timestamp: Date.now() }]); });
    ws.on('interviewer:question', (payload) => { setCurrentQuestion(payload.question); setStage(payload.stage); setQuestionSequence(payload.sequence); setIsAiTyping(false); setIsStreaming(false); setStreamContent(''); setMessages((m) => [...m, { id: crypto.randomUUID(), role: 'assistant', content: payload.question.content, timestamp: Date.now() }]); });
    ws.on('interviewer:typing', () => setIsAiTyping(true));
    ws.on('interviewer:stream', (payload) => { setIsStreaming(true); setStreamContent((s) => s + payload.chunk); if (payload.done) setIsStreaming(false); });
    ws.on('evaluation:realtime', (payload) => { setRealtimeScore(payload.score); setDimensions(payload.dimensions); setMessages((m) => [...m, { id: crypto.randomUUID(), role: 'assistant', content: payload.feedback, evaluation: payload, timestamp: Date.now() }]); });
    ws.on('interview:stage_change', (payload) => setStage(payload.to));
    ws.on('interview:progress', (payload) => setProgress(payload));
    ws.on('interview:ended', (payload) => { setReport(payload.report); setStatus('ended'); });
    ws.on('error', (payload) => setError({ code: payload.code, message: payload.message }));
  }, []);

  const startInterview = (resumeId: string, jobId?: string) => { if (!ws.connected) return; ws.send('interview:start', { resumeId, jobId }); setStatus('connecting'); };
  const sendAnswer = (content: string) => { if (!currentQuestion) return; ws.send('interview:answer', { content, questionId: currentQuestion.id }); setMessages((m) => [...m, { id: crypto.randomUUID(), role: 'user', content, questionId: currentQuestion.id, timestamp: Date.now() }]); };
  const pauseInterview = () => ws.send('interview:pause', {});
  const resumeInterview = () => ws.send('interview:resume', {});
  const endInterview = () => ws.send('interview:end', { reason: 'user' });

  const value = useMemo(() => ({ sessionId, stage, status, currentQuestion, questionSequence, messages, realtimeScore, dimensions, progress, startInterview, sendAnswer, pauseInterview, resumeInterview, endInterview, isAiTyping, isStreaming, streamContent, report, error }), [sessionId, stage, status, currentQuestion, questionSequence, messages, realtimeScore, dimensions, progress, isAiTyping, isStreaming, streamContent, report, error]);
  useEffect(() => { setInterview(value as any); }, [value]);
  return value;
}
