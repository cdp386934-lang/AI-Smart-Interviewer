import { InterviewSession, InterviewReport, InterviewStage } from '../session-manager/interfaces';
import { StructuredResume } from '../resume-parser/interfaces';

/**
 * 面试引擎接口
 */
export interface IInterviewEngine {
  // 生成下一个问题（核心）
  generateQuestion(session: InterviewSession): Promise<Question>;
  
  // 评估候选人回答
  evaluateAnswer(session: InterviewSession, answer: string): Promise<Evaluation>;
  
  // 决定状态转移（是否进入下一阶段）
  decideTransition(session: InterviewSession, evaluation: Evaluation): Promise<InterviewStage>;
  
  // 生成面试报告
  generateReport(session: InterviewSession): Promise<InterviewReport>;
  
  // 实时反馈（回答后的即时点评）
  generateRealtimeFeedback(evaluation: Evaluation): Promise<string>;
}

export interface Question {
  id: string;
  type: 'technical' | 'behavioral' | 'project' | 'coding' | 'follow_up';
  content: string;           // 问题内容
  difficulty: number;        // 难度 1-5
  expectedPoints: string[];   // 期望回答要点（评分用）
  context?: string;           // 上下文（如基于哪个项目提问）
  timeout?: number;           // 建议回答时间（秒）
}

export interface Evaluation {
  questionId: string;
  score: number;             // 0-100
  dimensions: {
    technical: number;       // 技术深度
    communication: number;   // 沟通表达
    logic: number;           // 逻辑思维
    experience: number;      // 经验匹配
  };
  feedback: string;          // 详细反馈
  missingPoints: string[];   // 遗漏要点
  followUpNeeded: boolean;   // 是否需要追问
  skillUpdates: Map<string, number>; // 技能掌握度更新
}

// 面试引擎配置
export interface InterviewEngineConfig {
  defaultDifficulty: number; // 1-5
  maxQuestionsPerStage: number;
  difficultyAdjustment: {
    correctStreak: number;   // 连续答对几题提升难度
    wrongStreak: number;     // 连续答错几题降低难度
    maxDifficulty: number;   // 最高难度
    minDifficulty: number;   // 最低难度
  };
  scoring: {
    excellentThreshold: number; // 优秀阈值
    goodThreshold: number;      // 良好阈值
    averageThreshold: number;   // 一般阈值
  };
  timeout: {
    questionTimeout: number;    // 问题超时时间（秒）
    sessionTimeout: number;     // 会话超时时间（分钟）
  };
}

// 问题生成策略
export interface QuestionGenerationStrategy {
  type: 'technical' | 'behavioral' | 'project' | 'coding' | 'follow_up';
  source: 'resume' | 'jobDescription' | 'projectDeep' | 'behavioral';
  difficulty: number;
  context?: {
    projectId?: string;
    skill?: string;
    previousQuestionId?: string;
  };
}

// 追问策略
export interface FollowUpStrategy {
  type: '5why' | 'clarification' | 'deepDive' | 'alternative';
  depth: number; // 追问深度
  maxFollowUps: number; // 最大追问次数
}

// 评分维度权重
export interface ScoringWeights {
  technical: number;
  communication: number;
  logic: number;
  experience: number;
}

// 面试报告数据
export interface ReportData {
  session: InterviewSession;
  evaluations: Evaluation[];
  questions: Question[];
  summary: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    overallScore: number;
    hiringRecommendation: 'strongly_recommend' | 'recommend' | 'pending' | 'not_recommend';
  };
}

// 错误类型
export class InterviewEngineError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'InterviewEngineError';
  }
}

// 预定义错误
export const InterviewEngineErrors = {
  INVALID_SESSION_STATE: (sessionId: string, state: string) =>
    new InterviewEngineError('INVALID_SESSION_STATE', `会话 ${sessionId} 状态无效: ${state}`, 400),
  NO_QUESTIONS_AVAILABLE: (sessionId: string) =>
    new InterviewEngineError('NO_QUESTIONS_AVAILABLE', `会话 ${sessionId} 没有可用问题`, 404),
  EVALUATION_FAILED: (questionId: string) =>
    new InterviewEngineError('EVALUATION_FAILED', `问题 ${questionId} 评估失败`, 500),
  REPORT_GENERATION_FAILED: (sessionId: string) =>
    new InterviewEngineError('REPORT_GENERATION_FAILED', `会话 ${sessionId} 报告生成失败`, 500),
};
