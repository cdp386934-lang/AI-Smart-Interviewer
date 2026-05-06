import { WebSocket } from 'ws';
import { WebSocketMessage, InterviewSession } from '@/types';

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
  sendToSession(sessionId: string, message: WebSocketMessage): Promise<boolean>;
  
  /**
   * 广播消息到所有连接
   */
  broadcast(message: WebSocketMessage): Promise<void>;
  
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
}