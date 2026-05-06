import { useEffect, useMemo, useRef } from 'react';
import type { Message, InterviewState, ReportData } from '../app/types';
import { useInterviewStore } from '../store/interviewStore';

export interface UseWebSocketReturn {
  connected: boolean;
  send: (event: string, payload: any) => void;
  messages: Message[];
  interviewState: InterviewState | null;
  realtimeScore: number;
  isTyping: boolean;
  startInterview: (resumeId: string, jobId: string) => void;
  sendAnswer: (content: string) => void;
  endInterview: () => void;
}

interface UseWebSocketOptions {
  url: string;
  token?: string;
}

export function useWebSocket({ url, token }: UseWebSocketOptions): UseWebSocketReturn {
  const socketRef = useRef<WebSocket | null>(null);
  const connected = useInterviewStore((s) => s.connected);
  const messages = useInterviewStore((s) => s.messages);
  const interviewState = useInterviewStore((s) => s.interviewState);
  const realtimeScore = useInterviewStore((s) => s.realtimeScore);
  const isTyping = useInterviewStore((s) => s.isTyping);
  const setConnected = useInterviewStore((s) => s.setConnected);
  const setTyping = useInterviewStore((s) => s.setTyping);
  const setRealtimeScore = useInterviewStore((s) => s.setRealtimeScore);
  const pushMessage = useInterviewStore((s) => s.pushMessage);
  const setInterviewState = useInterviewStore((s) => s.setInterviewState);
  const setReport = useInterviewStore((s) => s.setReport);

  const send = useMemo(() => (event: string, payload: any) => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() }));
    }
  }, []);

  useEffect(() => {
    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => {
      setConnected(true);
      if (token) send('auth', { token });
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const { event: evt, data } = message;

        if (evt === 'interviewer:typing') setTyping(true);
        if (evt === 'interviewer:question') setTyping(false);
        if (evt === 'evaluation:realtime') setRealtimeScore(data.score);
        if (evt === 'interview:started') {
          setInterviewState({
            sessionId: data.sessionId,
            stage: 'technical',
            currentQuestion: data.firstQuestion.content,
            currentSkill: data.firstQuestion.context,
            questionIndex: 0,
            totalQuestions: 10,
            timeSpent: 0,
            currentScore: 0,
          });
        }
        if (evt === 'interview:stage_change' && interviewState) {
          setInterviewState({ ...interviewState, stage: data.to });
        }
        if (evt === 'interview:ended') {
          setReport(data.report as ReportData);
        }
        if (evt === 'interviewer:question') {
          pushMessage({ id: crypto.randomUUID(), role: 'assistant', content: data.question.content, timestamp: new Date().toISOString(), metadata: { questionType: data.question.type } });
        }
        if (evt === 'error') {
          pushMessage({ id: crypto.randomUUID(), role: 'system', content: data.message, timestamp: new Date().toISOString() });
        }
      } catch {
        pushMessage({ id: crypto.randomUUID(), role: 'system', content: String(event.data), timestamp: new Date().toISOString() });
      }
    };

    socket.onclose = () => setConnected(false);
    socket.onerror = () => setConnected(false);

    return () => socket.close();
  }, [url, token, send, pushMessage, setConnected, setTyping, setRealtimeScore, setInterviewState, setReport]);

  return {
    connected,
    send,
    messages,
    interviewState,
    realtimeScore,
    isTyping,
    startInterview: (resumeId, jobId) => send('interview:start', { resumeId, jobId }),
    sendAnswer: (content) => send('interview:answer', { content }),
    endInterview: () => send('interview:end', {}),
  };
}
