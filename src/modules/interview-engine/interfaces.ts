import { ResumeData, InterviewQuestion, InterviewSession, InterviewFeedback } from '@/types';

/**
 * 面试引擎接口
 */
export interface IInterviewEngine {
  /**
   * 创建面试会话
   */
  createSession(
    candidateId: string,
    resume: ResumeData,
    position: string,
    questionCount: number,
    difficulty: 'easy' | 'medium' | 'hard'
  ): Promise<InterviewSession>;
  
  /**
   * 获取下一个问题
   */
  getNextQuestion(sessionId: string): Promise<InterviewQuestion | null>;
  
  /**
   * 提交回答
   */
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
  
  /**
   * 完成面试并生成反馈
   */
  completeSession(sessionId: string): Promise<InterviewFeedback>;
  
  /**
   * 获取会话状态
   */
  getSessionStatus(sessionId: string): Promise<InterviewSession>;
  
  /**
   * 取消面试会话
   */
  cancelSession(sessionId: string): Promise<void>;
}

/**
 * 面试引擎配置
 */
export interface InterviewEngineConfig {
  defaultQuestionCount: number;
  defaultDifficulty: 'easy' | 'medium' | 'hard';
  timePerQuestion: number; // 秒
  maxSessionDuration: number; // 秒
}