import { z, ZodSchema } from 'zod';

import type { ResumeData } from '@/types';
import type { InterviewFeedback, InterviewQuestion } from '@/types/legacy-interview';

/**
 * AI能力层接口定义
 */
export interface IAILayer {
  // 基础对话
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>;
  
  streamChat(messages: ChatMessage[], options?: ChatOptions): AsyncGenerator<string>;
  
  // 结构化输出（JSON Schema）
  structuredOutput<T>(messages: ChatMessage[], schema: ZodSchema<T>): Promise<T>;
  
  // 工具调用
  toolCall(messages: ChatMessage[], tools: Tool[]): Promise<ToolCallResult>;
  
  // Embedding（简历相似度匹配）
  embed(text: string): Promise<number[]>;
  
  // 健康检查
  healthCheck(): Promise<boolean>;
}

/**
 * 聊天消息
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * 聊天选项
 */
export interface ChatOptions {
  model?: string;           // 模型选择
  temperature?: number;     // 温度
  maxTokens?: number;       // 最大 token
  callbacks?: Callbacks;    // 回调（用于日志、监控）
}

/**
 * 工具定义
 */
export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

/**
 * 工具调用结果
 */
export interface ToolCallResult {
  toolName: string;
  arguments: Record<string, any>;
  result: any;
}

/**
 * 回调接口
 */
export interface Callbacks {
  onStart?: () => void;
  onToken?: (token: string) => void;
  onComplete?: (result: string) => void;
  onError?: (error: Error) => void;
}

/**
 * AI配置
 */
export interface AIConfig {
  apiKey: string;
  defaultModel: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Embedding结果
 */
export interface EmbeddingResult {
  embedding: number[];
  model: string;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

/**
 * 结构化输出选项
 */
export interface StructuredOutputOptions {
  strict?: boolean;
  maxRetries?: number;
}

/** LangChain 等服务使用的模型与会话参数 */
export interface AIServiceConfig {
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

/** 面试场景下的 AI 服务（问题生成、评分、反馈） */
export interface IAIService {
  generateQuestions(
    resume: ResumeData,
    position: string,
    count: number,
    difficulty: 'easy' | 'medium' | 'hard'
  ): Promise<InterviewQuestion[]>;

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

  generateFeedback(
    sessionId: string,
    questions: InterviewQuestion[],
    answers: Array<{ question: InterviewQuestion; answer: string; score: number }>,
    resume: ResumeData
  ): Promise<InterviewFeedback>;

  parseResumeText(text: string): Promise<Partial<ResumeData>>;

  healthCheck(): Promise<boolean>;
}