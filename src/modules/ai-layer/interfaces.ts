import { z, ZodSchema } from 'zod';

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