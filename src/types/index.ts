/**
 * 全局类型定义
 */

// 基础响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

// WebSocket消息类型
export type WebSocketMessageType = 
  | 'connect'
  | 'disconnect'
  | 'message'
  | 'error'
  | 'heartbeat';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  sessionId?: string;
  userId?: string;
  data: any;
  timestamp: string;
}

// 错误类型
export class BusinessError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'BusinessError';
  }
}

// 配置类型
export interface AppConfig {
  env: 'development' | 'production' | 'test';
  port: number;
  apiPrefix: string;
  database: {
    url: string;
  };
  redis: {
    url: string;
  };
  ai: {
    openaiApiKey: string;
    model: string;
  };
  upload: {
    dir: string;
    maxFileSize: number;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
}

// 简历数据结构（简化版）
export interface ResumeData {
  id: string;
  name: string;
  email: string;
  rawText: string;
  filePath: string;
  createdAt: Date;
  phone?: string;
  education?: unknown[];
  experience?: unknown[];
  skills?: unknown[];
  projects?: unknown[];
  summary?: string;
}

// 会话状态
export type SessionStatus = 'pending' | 'active' | 'completed' | 'cancelled';

// 连接状态
export interface ConnectionInfo {
  sessionId: string;
  userId: string;
  connectedAt: Date;
  lastActivity: Date;
  status: 'connected' | 'disconnected';
}

// 导出所有类型
export * from './errors';
export * from './validation';
export * from './legacy-interview';