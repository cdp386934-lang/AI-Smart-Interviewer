import { InterviewSession, ResumeData } from '@/types';

/**
 * 会话管理器接口
 */
export interface ISessionManager {
  /**
   * 创建新会话
   */
  createSession(session: InterviewSession): Promise<void>;
  
  /**
   * 获取会话
   */
  getSession(sessionId: string): Promise<InterviewSession>;
  
  /**
   * 更新会话
   */
  updateSession(session: InterviewSession): Promise<void>;
  
  /**
   * 获取用户的所有会话
   */
  getUserSessions(userId: string): Promise<InterviewSession[]>;
  
  /**
   * 保存简历数据
   */
  saveResume(resume: ResumeData): Promise<void>;
  
  /**
   * 获取简历数据
   */
  getResume(resumeId: string): Promise<ResumeData>;
  
  /**
   * 保存回答评估结果
   */
  saveAnswerEvaluation(
    sessionId: string,
    questionId: string,
    score: number,
    feedback: string,
    keywordsMatched: string[]
  ): Promise<void>;
  
  /**
   * 获取回答评估结果
   */
  getAnswerEvaluations(sessionId: string): Promise<Array<{
    questionId: string;
    score: number;
    feedback: string;
    keywordsMatched: string[];
    timestamp: Date;
  }>>;
  
  /**
   * 清理过期会话
   */
  cleanupExpiredSessions(maxAgeHours: number): Promise<number>;
}

/**
 * 会话管理器配置
 */
export interface SessionManagerConfig {
  sessionTTL: number; // 会话存活时间（小时）
  redisPrefix: string;
  maxActiveSessions: number;
}