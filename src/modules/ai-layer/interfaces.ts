import { ResumeData, InterviewQuestion, InterviewFeedback } from '@/types';

/**
 * AI 服务接口定义
 */
export interface IAIService {
  /**
   * 根据简历生成面试问题
   */
  generateQuestions(
    resume: ResumeData,
    position: string,
    count: number,
    difficulty: 'easy' | 'medium' | 'hard'
  ): Promise<InterviewQuestion[]>;
  
  /**
   * 评估面试回答
   */
  evaluateAnswer(
    question: InterviewQuestion,
    answer: string,
    resume: ResumeData
  ): Promise<{
    score: number;
    feedback: string;
    keywordsMatched: string[];
    suggestions: string[];
  }>;
  
  /**
   * 生成面试总结反馈
   */
  generateFeedback(
    sessionId: string,
    questions: InterviewQuestion[],
    answers: Array<{ question: InterviewQuestion; answer: string; score: number }>,
    resume: ResumeData
  ): Promise<InterviewFeedback>;
  
  /**
   * 解析简历文本为结构化数据
   */
  parseResumeText(text: string): Promise<Partial<ResumeData>>;
  
  /**
   * 健康检查
   */
  healthCheck(): Promise<boolean>;
}

/**
 * AI 服务配置
 */
export interface AIServiceConfig {
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}