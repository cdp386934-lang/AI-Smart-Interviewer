/**
 * 旧版 REST / WebSocket 流程使用的面试会话与题目类型（与 session-manager 的 InterviewSession 区分）
 */

export type LegacySessionStatus = 'pending' | 'active' | 'completed' | 'cancelled';

export interface InterviewQuestion {
  id: string;
  text?: string;
  content?: string;
  type: string;
  difficulty?: string;
  expectedKeywords?: string[];
  timeLimit?: number;
}

export interface InterviewAnswer {
  questionId: string;
  answer: string;
  audioUrl?: string;
  timestamp: Date;
  duration: number;
}

export interface InterviewFeedback {
  overallScore: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  detailedScores?: Record<string, number>;
}

export interface LegacyInterviewSession {
  id: string;
  candidateId: string;
  resumeId: string;
  position: string;
  status: LegacySessionStatus;
  currentQuestionIndex: number;
  questions: InterviewQuestion[];
  answers: InterviewAnswer[];
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  feedback?: InterviewFeedback;
}

export function getQuestionText(q: InterviewQuestion): string {
  return q.text ?? q.content ?? '';
}
