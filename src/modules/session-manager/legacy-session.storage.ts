import type { ResumeData } from '@/types';
import type { LegacyInterviewSession } from '@/types/legacy-interview';

/**
 * 旧版 InterviewEngine / REST 使用的 Redis 会话与简历缓存
 */
export interface ILegacySessionStorage {
  createSession(session: LegacyInterviewSession): Promise<void>;
  getSession(sessionId: string): Promise<LegacyInterviewSession>;
  updateSession(session: LegacyInterviewSession): Promise<void>;
  getUserSessions(userId: string): Promise<LegacyInterviewSession[]>;
  saveResume(resume: ResumeData): Promise<void>;
  getResume(resumeId: string): Promise<ResumeData>;
  saveAnswerEvaluation(
    sessionId: string,
    questionId: string,
    score: number,
    feedback: string,
    keywordsMatched: string[]
  ): Promise<void>;
  getAnswerEvaluations(sessionId: string): Promise<
    Array<{
      questionId: string;
      score: number;
      feedback: string;
      keywordsMatched: string[];
      timestamp: Date;
    }>
  >;
  cleanupExpiredSessions(maxAgeHours: number): Promise<number>;
  getActiveSessionCount(): Promise<number>;
}
