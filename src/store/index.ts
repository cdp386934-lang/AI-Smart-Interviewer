import { create } from 'zustand';
import type { InterviewState, Notification, OptimizationResult, ResumeSummary, User } from '@/types/shared';

export interface AppState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  interview: InterviewState | null;
  currentResume: ResumeSummary | null;
  optimizationResult: OptimizationResult | null;
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  notifications: Notification[];
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setCurrentResume: (resume: ResumeSummary | null) => void;
  setOptimizationResult: (result: OptimizationResult | null) => void;
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
  optimizationResult: null,
  theme: 'light',
  sidebarCollapsed: false,
  notifications: [],
  setUser: (user) => set({ user, isAuthenticated: Boolean(user) }),
  setToken: (token) => set({ token, isAuthenticated: Boolean(token) }),
  setCurrentResume: (currentResume) => set({ currentResume }),
  setOptimizationResult: (optimizationResult) => set({ optimizationResult }),
  setInterview: (interview) => set({ interview }),
  addNotification: (notification) => set((state) => ({ notifications: [...state.notifications, notification] })),
  removeNotification: (id) => set((state) => ({ notifications: state.notifications.filter((n) => n.id !== id) })),
}));
