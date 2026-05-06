import { BusinessError } from '@/types';
import { StructuredResume } from '../resume-parser/interfaces';

/**
 * 会话管理器接口
 */
export interface ISessionManager {
  // 创建会话
  create(config: InterviewConfig): Promise<InterviewSession>;
  
  // 获取会话状态
  get(sessionId: string): Promise<InterviewSession | null>;
  
  // 状态推进
  transition(sessionId: string, event: InterviewEvent): Promise<void>;
  
  // 记录对话（用户/AI）
  addMessage(sessionId: string, message: Message): Promise<void>;
  
  // 获取对话历史（用于 LLM 上下文）
  getHistory(sessionId: string, limit?: number): Promise<Message[]>;
  
  // 更新候选人画像
  updateProfile(sessionId: string, update: ProfileUpdate): Promise<void>;
  
  // 结束会话
  end(sessionId: string): Promise<InterviewReport>;
}

// 状态机定义
export enum InterviewStage {
  IDLE = 'idle',                    // 初始
  RESUME_CONFIRM = 'resume_confirm', // 简历确认
  SELF_INTRO = 'self_intro',        // 自我介绍
  TECHNICAL = 'technical',           // 技术面试
  PROJECT_DEEP = 'project_deep',     // 项目深挖
  BEHAVIORAL = 'behavioral',         // 行为面试
  CODING = 'coding',                // 代码考核
  Q_AND_A = 'q_and_a',              // 反问环节
  ENDED = 'ended'                    // 结束
}

// 面试事件
export enum InterviewEvent {
  RESUME_UPLOADED = 'resume_uploaded',
  RESUME_CONFIRMED = 'resume_confirmed',
  SELF_INTRO_COMPLETED = 'self_intro_completed',
  TECHNICAL_STARTED = 'technical_started',
  TECHNICAL_COMPLETED = 'technical_completed',
  PROJECT_DEEP_STARTED = 'project_deep_started',
  PROJECT_DEEP_COMPLETED = 'project_deep_completed',
  BEHAVIORAL_STARTED = 'behavioral_started',
  BEHAVIORAL_COMPLETED = 'behavioral_completed',
  CODING_STARTED = 'coding_started',
  CODING_COMPLETED = 'coding_completed',
  Q_AND_A_STARTED = 'q_and_a_started',
  Q_AND_A_COMPLETED = 'q_and_a_completed',
  SESSION_ENDED = 'session_ended',
  SESSION_TIMEOUT = 'session_timeout'
}

// 面试配置
export interface InterviewConfig {
  jobTitle: string;                 // 岗位名称
  jobLevel: 'junior' | 'mid' | 'senior' | 'lead'; // 岗位级别
  difficulty: 'easy' | 'medium' | 'hard'; // 难度
  duration: number;                 // 预计时长（分钟）
  focusAreas: string[];             // 重点考察领域
  userId: string;                   // 用户ID
  resume: StructuredResume;        // 候选人简历（会话快照）
  ip?: string;                      // IP地址
  userAgent?: string;               // 用户代理
}

// 消息类型
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    questionType?: string;
    evaluation?: {
      score: number;
      feedback: string;
      keywordsMatched: string[];
    };
  };
}

// 候选人画像
export interface CandidateProfile {
  skills: Map<string, number>;      // 技能掌握度 0-1
  weakAreas: string[];              // 薄弱点
  strongAreas: string[];            // 优势点
  personalityHints: string[];       // 性格特征（沟通中观察）
  overallScore: number;             // 综合得分（动态更新）
}

// 会话元数据
export interface SessionMetadata {
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;
  ip?: string;
  userAgent?: string;
  totalMessages: number;
  timeSpent: number; // 总耗时（秒）
}

// 面试会话
export interface InterviewSession {
  id: string;
  stage: InterviewStage;
  config: InterviewConfig;           // 面试配置（岗位、难度等）
  resume: StructuredResume;          // 候选人简历
  messages: Message[];               // 对话历史
  profile: CandidateProfile;         // 动态画像
  metadata: SessionMetadata;         // 时间、IP等
}

// 画像更新
export interface ProfileUpdate {
  skills?: Map<string, number>;
  weakAreas?: string[];
  strongAreas?: string[];
  personalityHints?: string[];
  overallScore?: number;
}

// 面试报告
export interface InterviewReport {
  sessionId: string;
  stage: InterviewStage;
  config: InterviewConfig;
  profile: CandidateProfile;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  totalQuestions: number;
  averageScore: number;
  timeSpent: number;
  createdAt: Date;
  endedAt: Date;
}

// 状态转移规则
export interface StateTransition {
  from: InterviewStage;
  to: InterviewStage;
  event: InterviewEvent;
  description: string;
}

// 状态机配置
export interface StateMachineConfig {
  transitions: StateTransition[];
  hooks: {
    onEnter?: (session: InterviewSession, from: InterviewStage) => Promise<void>;
    onExit?: (session: InterviewSession, to: InterviewStage) => Promise<void>;
  };
}

// 会话管理器配置
export interface SessionManagerConfig {
  sessionTTL: number;               // 会话存活时间（秒）
  redisPrefix: string;              // Redis键前缀
  maxActiveSessions: number;        // 最大活跃会话数
  maxMessagesPerSession: number;    // 最大消息数（短期记忆）
  timeoutMinutes: number;           // 超时时间（分钟）
  enableCompression: boolean;       // 是否启用对话压缩
  compressionThreshold: number;     // 压缩阈值（消息数）
}

// 错误类型
export class SessionError extends BusinessError {
  constructor(code: string, message: string, statusCode: number = 400) {
    super(code, message, statusCode);
    this.name = 'SessionError';
  }
}

// 预定义错误
export const SessionErrors = {
  SESSION_NOT_FOUND: (sessionId: string) => 
    new SessionError('SESSION_NOT_FOUND', `会话不存在: ${sessionId}`, 404),
  INVALID_TRANSITION: (from: InterviewStage, to: InterviewStage) =>
    new SessionError('INVALID_TRANSITION', `无效的状态转移: ${from} -> ${to}`, 400),
  INVALID_EVENT: (from: InterviewStage, event: InterviewEvent) =>
    new SessionError(
      'INVALID_EVENT',
      `阶段 ${from} 不接受事件 ${event}`,
      400
    ),
  SESSION_TIMEOUT: (sessionId: string) =>
    new SessionError('SESSION_TIMEOUT', `会话已超时: ${sessionId}`, 408),
  TOO_MANY_SESSIONS: (userId: string) =>
    new SessionError('TOO_MANY_SESSIONS', `用户 ${userId} 的活跃会话数量达到上限`, 429),
  SESSION_ENDED: (sessionId: string) =>
    new SessionError('SESSION_ENDED', `会话已结束: ${sessionId}`, 410),
};