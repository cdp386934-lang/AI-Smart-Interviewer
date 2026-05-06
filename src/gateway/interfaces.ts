import { WebSocket } from 'ws';
import { Question, Evaluation } from '../modules/interview-engine/interfaces';
import { InterviewReport, InterviewSession } from '../modules/session-manager/interfaces';

/**
 * 客户端 → 服务端事件
 */
export interface ClientEvents {
  'auth': { token: string };                    // 连接后认证
  'interview:start': { resumeId: string, jobId: string };
  'interview:answer': { content: string };       // 文本回答
  'interview:voice': { audioBase64: string };   // 语音回答（预留）
  'interview:pause': {};
  'interview:resume': {};
  'interview:end': {};
}

/**
 * 服务端 → 客户端事件
 */
export interface ServerEvents {
  'auth:result': { success: boolean };
  'interview:started': { sessionId: string, firstQuestion: Question };
  'interviewer:question': { question: Question };
  'interviewer:typing': { duration: number };    // AI 正在思考（UI 展示）
  'evaluation:realtime': { feedback: string, score: number };
  'interview:stage_change': { from: string, to: string };
  'interview:ended': { report: InterviewReport };
  'error': { code: string, message: string };
}

/**
 * WebSocket 消息格式
 */
export interface WebSocketMessage<T = any> {
  event: keyof ClientEvents | keyof ServerEvents;
  data: T;
  timestamp: string;
  sessionId?: string;
  userId?: string;
}

/**
 * WebSocket 网关接口
 */
export interface IWebSocketGateway {
  /**
   * 启动WebSocket服务器
   */
  start(): Promise<void>;
  
  /**
   * 停止WebSocket服务器
   */
  stop(): Promise<void>;
  
  /**
   * 发送消息到指定会话
   */
  sendToSession(sessionId: string, event: keyof ServerEvents, data: any): Promise<boolean>;
  
  /**
   * 广播消息到所有连接
   */
  broadcast(event: keyof ServerEvents, data: any): Promise<void>;
  
  /**
   * 获取活跃连接数量
   */
  getActiveConnections(): number;
  
  /**
   * 获取会话的连接
   */
  getSessionConnection(sessionId: string): WebSocket | null;
}

/**
 * WebSocket 连接信息
 */
export interface WebSocketConnection {
  socket: WebSocket;
  sessionId: string;
  userId: string;
  connectedAt: Date;
  lastActivity: Date;
  authenticated: boolean;
  interviewSessionId?: string;
}

/**
 * WebSocket 网关配置
 */
export interface WebSocketGatewayConfig {
  port: number;
  path: string;
  pingInterval: number; // 毫秒
  connectionTimeout: number; // 毫秒
  maxMessageSize: number; // 字节
  jwtSecret: string;
  enableReconnect: boolean;
  maxReconnectAttempts: number;
  reconnectDelay: number; // 毫秒
}

/**
 * 消息处理器
 */
export interface MessageHandler {
  (connection: WebSocketConnection, data: any): Promise<void>;
}

/**
 * 消息处理管道
 */
export interface MessagePipeline {
  validate: (message: any) => boolean;
  deserialize: (data: Buffer) => WebSocketMessage;
  route: (message: WebSocketMessage) => MessageHandler | null;
  serialize: (message: WebSocketMessage) => string;
}

/**
 * 错误类型
 */
export class WebSocketError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'WebSocketError';
  }
}

/**
 * 预定义错误
 */
export const WebSocketErrors = {
  AUTH_FAILED: () =>
    new WebSocketError('AUTH_FAILED', '认证失败', 401),
  INVALID_MESSAGE: () =>
    new WebSocketError('INVALID_MESSAGE', '无效的消息格式', 400),
  SESSION_NOT_FOUND: (sessionId: string) =>
    new WebSocketError('SESSION_NOT_FOUND', `会话不存在: ${sessionId}`, 404),
  INTERVIEW_NOT_STARTED: (sessionId: string) =>
    new WebSocketError('INTERVIEW_NOT_STARTED', `面试未开始: ${sessionId}`, 400),
  INTERVIEW_ENDED: (sessionId: string) =>
    new WebSocketError('INTERVIEW_ENDED', `面试已结束: ${sessionId}`, 410),
  TOO_MANY_CONNECTIONS: (userId: string) =>
    new WebSocketError('TOO_MANY_CONNECTIONS', `用户 ${userId} 连接数达到上限`, 429),
};

/**
 * REST API 路由定义
 */
export interface RestApiRoutes {
  // 认证
  'POST /api/auth/login': {
    request: { email: string; password: string };
    response: { token: string; user: { id: string; email: string; name: string } };
  };
  
  // 简历
  'POST /api/resume/upload': {
    request: FormData; // multipart/form-data
    response: { id: string; filename: string; size: number; uploadedAt: string };
  };
  
  'GET /api/resume/:id': {
    request: {};
    response: any; // StructuredResume
  };
  
  'POST /api/resume/:id/optimize': {
    request: { jobDescription: string };
    response: any; // OptimizationResult
  };
  
  // 岗位
  'GET /api/jobs': {
    request: {};
    response: Array<{
      id: string;
      title: string;
      company: string;
      level: 'junior' | 'mid' | 'senior' | 'lead';
      description: string;
      requiredSkills: string[];
    }>;
  };
  
  // 面试历史
  'GET /api/interview/history': {
    request: { limit?: number; offset?: number };
    response: Array<{
      id: string;
      jobTitle: string;
      startedAt: string;
      completedAt: string;
      overallScore: number;
      status: 'completed' | 'cancelled' | 'in_progress';
    }>;
  };
  
  'GET /api/interview/:id/report': {
    request: {};
    response: InterviewReport;
  };
}

/**
 * REST API 配置
 */
export interface RestApiConfig {
  port: number;
  apiPrefix: string;
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
  upload: {
    maxFileSize: number;
    allowedMimeTypes: string[];
  };
}
