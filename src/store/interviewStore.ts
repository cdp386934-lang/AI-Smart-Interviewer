import { create } from 'zustand';
import type { InterviewState, Message, ReportData, ResumeSummary } from '../app/types';

interface InterviewStore {
  connected: boolean;
  isTyping: boolean;
  realtimeScore: number;
  messages: Message[];
  interviewState: InterviewState | null;
  report: ReportData | null;
  resume: ResumeSummary | null;
  setConnected: (connected: boolean) => void;
  setTyping: (isTyping: boolean) => void;
  setRealtimeScore: (score: number) => void;
  setMessages: (messages: Message[]) => void;
  pushMessage: (message: Message) => void;
  setInterviewState: (state: InterviewState | null) => void;
  setReport: (report: ReportData | null) => void;
  setResume: (resume: ResumeSummary | null) => void;
  reset: () => void;
}

export const useInterviewStore = create<InterviewStore>((set) => ({
  connected: false,
  isTyping: false,
  realtimeScore: 0,
  messages: [],
  interviewState: null,
  report: null,
  resume: null,
  setConnected: (connected) => set({ connected }),
  setTyping: (isTyping) => set({ isTyping }),
  setRealtimeScore: (realtimeScore) => set({ realtimeScore }),
  setMessages: (messages) => set({ messages }),
  pushMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setInterviewState: (interviewState) => set({ interviewState }),
  setReport: (report) => set({ report }),
  setResume: (resume) => set({ resume }),
  reset: () => set({ connected: false, isTyping: false, realtimeScore: 0, messages: [], interviewState: null, report: null, resume: null }),
}));
