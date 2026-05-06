import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { URL } from 'url';

import { 
  IWebSocketGateway, 
  WebSocketGatewayConfig, 
  WebSocketConnection 
} from './interfaces';
import { WebSocketMessage, WebSocketMessageType } from '@/types';
import type { ILegacyInterviewEngine } from '../modules/interview-engine/legacy-engine.interface';
import logger from '@/utils/logger';
import { Errors } from '@/utils/errors';

export class WebSocketGateway implements IWebSocketGateway {
  private server: WebSocketServer;
  private connections: Map<string, WebSocketConnection>;
  private config: WebSocketGatewayConfig;
  private interviewEngine: ILegacyInterviewEngine;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(config: WebSocketGatewayConfig, interviewEngine: ILegacyInterviewEngine) {
    this.config = config;
    this.interviewEngine = interviewEngine;
    this.connections = new Map();
    
    const httpServer = createServer();
    this.server = new WebSocketServer({
      server: httpServer,
      path: config.path,
      maxPayload: config.maxMessageSize,
    });
    
    this.setupServer();
  }

  private setupServer(): void {
    this.server.on('connection', (socket: WebSocket, request) => {
      this.handleConnection(socket, request);
    });

    this.server.on('error', (error) => {
      logger.error('WebSocket服务器错误:', error);
    });

    this.server.on('close', () => {
      logger.info('WebSocket服务器已关闭');
      this.stopPingInterval();
    });
  }

  private handleConnection(socket: WebSocket, request: any): void {
    try {
      const url = new URL(request.url || '', `ws://${request.headers.host}`);
      const sessionId = url.searchParams.get('sessionId');
      const userId = url.searchParams.get('userId');

      if (!sessionId || !userId) {
        socket.close(1008, '缺少必要参数: sessionId 或 userId');
        return;
      }

      // 验证会话
      this.validateSession(sessionId, userId).then(isValid => {
        if (!isValid) {
          socket.close(1008, '无效的会话或用户');
          return;
        }

        const connection: WebSocketConnection = {
          socket,
          sessionId,
          userId,
          connectedAt: new Date(),
          lastActivity: new Date(),
          authenticated: false,
        };

        this.connections.set(sessionId, connection);
        logger.info(`WebSocket连接建立: session=${sessionId}, user=${userId}`);

        // 发送欢迎消息
        this.sendWelcomeMessage(socket, sessionId);

        // 设置消息处理器
        socket.on('message', (data) => {
          this.handleMessage(socket, sessionId, data);
        });

        socket.on('close', () => {
          this.handleDisconnection(sessionId);
        });

        socket.on('error', (error) => {
          logger.error(`WebSocket错误 session=${sessionId}:`, error);
          this.handleDisconnection(sessionId);
        });

        // 设置心跳
        this.setupHeartbeat(socket, sessionId);
      }).catch(error => {
        logger.error('会话验证失败:', error);
        socket.close(1008, '会话验证失败');
      });
    } catch (error) {
      logger.error('处理连接失败:', error);
      socket.close(1011, '服务器内部错误');
    }
  }

  private async validateSession(sessionId: string, userId: string): Promise<boolean> {
    try {
      const session = await this.interviewEngine.getSessionStatus(sessionId);
      return session.candidateId === userId && session.status === 'active';
    } catch (error) {
      return false;
    }
  }

  private sendWelcomeMessage(socket: WebSocket, sessionId: string): void {
    const message: WebSocketMessage = {
      type: 'session_start',
      sessionId,
      data: {
        message: '面试会话已开始',
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    socket.send(JSON.stringify(message));
  }

  private async handleMessage(socket: WebSocket, sessionId: string, data: Buffer): Promise<void> {
    try {
      const connection = this.connections.get(sessionId);
      if (!connection) {
        socket.close(1008, '连接不存在');
        return;
      }

      connection.lastActivity = new Date();

      const messageStr = data.toString();
      const message: WebSocketMessage = JSON.parse(messageStr);

      // 验证消息格式
      if (!this.validateMessage(message)) {
        socket.send(JSON.stringify({
          type: 'error',
          sessionId,
          data: { error: '无效的消息格式' },
          timestamp: new Date().toISOString(),
        }));
        return;
      }

      // 处理不同类型的消息
      await this.routeMessage(sessionId, message);
    } catch (error) {
      logger.error(`处理消息失败 session=${sessionId}:`, error);
      socket.send(JSON.stringify({
        type: 'error',
        sessionId,
        data: { error: '消息处理失败' },
        timestamp: new Date().toISOString(),
      }));
    }
  }

  private validateMessage(message: any): message is WebSocketMessage {
    return (
      message &&
      typeof message.type === 'string' &&
      typeof message.sessionId === 'string' &&
      typeof message.timestamp === 'string' &&
      message.data !== undefined
    );
  }

  private async routeMessage(sessionId: string, message: WebSocketMessage): Promise<void> {
    switch (message.type) {
      case 'answer':
        await this.handleAnswerMessage(sessionId, message);
        break;
      case 'heartbeat':
        await this.handleHeartbeatMessage(sessionId, message);
        break;
      default:
        logger.warn(`未知消息类型: ${message.type}`);
    }
  }

  private async handleAnswerMessage(sessionId: string, message: WebSocketMessage): Promise<void> {
    try {
      const { questionId, answer, audioUrl } = message.data;
      
      if (!questionId || !answer) {
        throw new Error('缺少必要参数: questionId 或 answer');
      }

      // 提交回答到面试引擎
      const result = await this.interviewEngine.submitAnswer(
        sessionId,
        questionId,
        answer,
        audioUrl
      );

      // 发送评估结果
      await this.sendToSession(sessionId, {
        type: 'feedback',
        sessionId,
        data: {
          questionId,
          score: result.score,
          feedback: result.feedback,
          isComplete: result.isComplete,
        },
        timestamp: new Date().toISOString(),
      });

      // 如果面试完成，发送完成消息
      if (result.isComplete) {
        await this.sendToSession(sessionId, {
          type: 'session_end',
          sessionId,
          data: {
            message: '面试已完成',
            completedAt: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        // 发送下一个问题
        const nextQuestion = await this.interviewEngine.getNextQuestion(sessionId);
        if (nextQuestion) {
          await this.sendToSession(sessionId, {
            type: 'question',
            sessionId,
            data: {
              question: nextQuestion,
              questionIndex: 0, // 需要从会话中获取
              timeLimit: nextQuestion.timeLimit,
            },
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      logger.error(`处理回答消息失败 session=${sessionId}:`, error);
      await this.sendToSession(sessionId, {
        type: 'error',
        sessionId,
        data: { error: '处理回答失败' },
        timestamp: new Date().toISOString(),
      });
    }
  }

  private async handleHeartbeatMessage(sessionId: string, message: WebSocketMessage): Promise<void> {
    // 更新最后活动时间
    const connection = this.connections.get(sessionId);
    if (connection) {
      connection.lastActivity = new Date();
    }
  }

  private handleDisconnection(sessionId: string): void {
    this.connections.delete(sessionId);
    logger.info(`WebSocket连接关闭: session=${sessionId}`);
  }

  private setupHeartbeat(socket: WebSocket, sessionId: string): void {
    const interval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.ping();
      } else {
        clearInterval(interval);
      }
    }, this.config.pingInterval);

    socket.on('pong', () => {
      const connection = this.connections.get(sessionId);
      if (connection) {
        connection.lastActivity = new Date();
      }
    });
  }

  private startPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = setInterval(() => {
      const now = Date.now();
      const timeoutMs = this.config.connectionTimeout;

      for (const [sessionId, connection] of this.connections.entries()) {
        const lastActivity = connection.lastActivity.getTime();
        if (now - lastActivity > timeoutMs) {
          logger.warn(`连接超时: session=${sessionId}`);
          connection.socket.close(1001, '连接超时');
          this.connections.delete(sessionId);
        }
      }
    }, this.config.pingInterval);
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.on('listening', () => {
        logger.info(`WebSocket服务器启动在端口 ${this.config.port}`);
        this.startPingInterval();
        resolve();
      });

      this.server.on('error', reject);

      this.server.listen(this.config.port);
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      // 关闭所有连接
      for (const connection of this.connections.values()) {
        connection.socket.close(1000, '服务器关闭');
      }
      this.connections.clear();

      // 停止服务器
      this.server.close((error) => {
        if (error) {
          reject(error);
        } else {
          this.stopPingInterval();
          resolve();
        }
      });
    });
  }

  async sendToSession(sessionId: string, message: WebSocketMessage): Promise<boolean> {
    const connection = this.connections.get(sessionId);
    if (!connection || connection.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      connection.socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      logger.error(`发送消息到会话失败 session=${sessionId}:`, error);
      return false;
    }
  }

  async broadcast(message: WebSocketMessage): Promise<void> {
    const promises: Promise<boolean>[] = [];
    
    for (const [sessionId] of this.connections.entries()) {
      promises.push(this.sendToSession(sessionId, message));
    }
    
    await Promise.all(promises);
  }

  getActiveConnections(): number {
    return this.connections.size;
  }

  getSessionConnection(sessionId: string): WebSocket | null {
    const connection = this.connections.get(sessionId);
    return connection?.socket || null;
  }

  /**
   * 获取连接统计信息
   */
  getConnectionStats(): {
    totalConnections: number;
    activeConnections: number;
    connectionsByUser: Record<string, number>;
  } {
    const stats = {
      totalConnections: this.connections.size,
      activeConnections: Array.from(this.connections.values()).filter(
        conn => conn.socket.readyState === WebSocket.OPEN
      ).length,
      connectionsByUser: {} as Record<string, number>,
    };

    for (const connection of this.connections.values()) {
      stats.connectionsByUser[connection.userId] = 
        (stats.connectionsByUser[connection.userId] || 0) + 1;
    }

    return stats;
  }
}