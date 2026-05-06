import type { ResumeData } from '@/types';
import type {
  InterviewFeedback,
  InterviewQuestion,
  LegacyInterviewSession,
} from '@/types/legacy-interview';

/**
 * 当前 REST / WebSocket 使用的面试引擎（题库轮次模型）
 */
export interface ILegacyInterviewEngine {
  createSession(
    candidateId: string,
    resume: ResumeData,
    position: string,
    questionCount?: number,
    difficulty?: 'easy' | 'medium' | 'hard'
  ): Promise<LegacyInterviewSession>;

  getNextQuestion(sessionId: string): Promise<InterviewQuestion | null>;

  submitAnswer(
    sessionId: string,
    questionId: string,
    answer: string,
    audioUrl?: string
  ): Promise<{
    score: number;
    feedback: string;
    isComplete: boolean;
  }>;

  completeSession(sessionId: string): Promise<InterviewFeedback>;

  getSessionStatus(sessionId: string): Promise<LegacyInterviewSession>;

  cancelSession(sessionId: string): Promise<void>;

  getSessionStats(sessionId: string): Promise<{
    totalQuestions: number;
    answeredQuestions: number;
    averageScore: number;
    timeSpent: number;
  }>;
}

export interface LegacyInterviewEngineConfig {
  defaultQuestionCount: number;
  defaultDifficulty: 'easy' | 'medium' | 'hard';
  timePerQuestion: number;
  maxSessionDuration: number;
}
