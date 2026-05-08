import { create } from 'zustand';
import type { InterviewFlowContext, InterviewState, Notification, OptimizationResult, ResumeSummary, User } from '@/types/shared';

export interface AppState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  interview: InterviewState | null;
  currentResume: ResumeSummary | null;
  optimizedResume: ResumeSummary | null;
  optimizationResult: OptimizationResult | null;
  flowContext: InterviewFlowContext;
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  notifications: Notification[];
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setCurrentResume: (resume: ResumeSummary | null) => void;
  setOptimizedResume: (resume: ResumeSummary | null) => void;
  setOptimizationResult: (result: OptimizationResult | null) => void;
  setFlowContext: (ctx: Partial<InterviewFlowContext>) => void;
  setInterview: (state: InterviewState | null) => void;
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  interview: null,
  currentResume: null,
  optimizedResume: null,
  optimizationResult: null,
  flowContext: {
    jobDescription: '',
    companyName: '',
    focusSkills: [],
    sourceResume: null,
    optimizedResume: null,
  },
  theme: 'light',
  sidebarCollapsed: false,
  notifications: [],
  setUser: (user) => set({ user, isAuthenticated: Boolean(user) }),
  setToken: (token) => set({ token, isAuthenticated: Boolean(token) }),
  setCurrentResume: (currentResume) => set((state) => ({ currentResume, flowContext: { ...state.flowContext, sourceResume: currentResume } })),
  setOptimizedResume: (optimizedResume) => set((state) => ({ optimizedResume, flowContext: { ...state.flowContext, optimizedResume } })),
  setOptimizationResult: (optimizationResult) => set({ optimizationResult }),
  setFlowContext: (ctx) => set((state) => ({ flowContext: { ...state.flowContext, ...ctx } })),
  setInterview: (interview) => set({ interview }),
  addNotification: (notification) => set((state) => ({ notifications: [...state.notifications, notification] })),
  removeNotification: (id) => set((state) => ({ notifications: state.notifications.filter((n) => n.id !== id) })),
}));
