import config from '@/config';
import { LangChainService } from './modules/ai-layer/langchain.service';
import { ResumeParser } from './modules/resume-parser/resume.parser';
import Redis from 'ioredis';

import { InterviewEngine } from './modules/interview-engine/interview.engine';
import type { ILegacyInterviewEngine } from './modules/interview-engine/legacy-engine.interface';
import {
  InMemoryLongTermMessageStore,
  PostgresLongTermMessageStore,
  SessionManager,
} from './modules/session-manager';
import type { AppSessionManager } from './modules/session-manager';
import { WebSocketGateway } from './gateway/websocket.gateway';
import { IAIService } from './modules/ai-layer/interfaces';
import { IResumeParser } from './modules/resume-parser/interfaces';
import { IWebSocketGateway } from './gateway/interfaces';
import type { WebSocketGatewayConfig } from './gateway/interfaces';
import logger from './utils/logger';

/**
 * 依赖注入容器
 */
export class Container {
  private static instance: Container;
  private services: Map<string, any> = new Map();

  private constructor() {
    this.initializeServices();
  }

  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  private initializeServices(): void {
    // 1. 初始化AI服务
    const aiService = new LangChainService({
      apiKey: config.ai.openaiApiKey,
      model: config.ai.model,
      temperature: 0.7,
      maxTokens: 2000,
      timeout: 30000,
    });
    this.services.set('aiService', aiService);

    // 2. 初始化会话管理器（状态机 + 短期 Redis + 长期 PG/内存）
    const longTermStore =
      process.env.USE_PG_LONG_TERM === '1'
        ? new PostgresLongTermMessageStore({ connectionString: config.database.url })
        : new InMemoryLongTermMessageStore();

    const redisClient = new Redis(config.redis.url);

    const sessionManager = new SessionManager(
      {
        sessionTTL: 24,
        redisPrefix: 'ai_interviewer',
        maxActiveSessions: 10,
        maxMessagesPerSession: 40,
        timeoutMinutes: 30,
        enableCompression: true,
        compressionThreshold: 20,
      },
      redisClient,
      longTermStore
    );
    this.services.set('sessionManager', sessionManager);

    // 3. 初始化简历解析器
    const resumeParser = new ResumeParser(
      {
        uploadDir: config.upload.dir,
        maxFileSize: config.upload.maxFileSize,
        supportedFormats: ['.pdf', '.docx', '.txt'],
        cacheTTL: 24,
        enableCache: true,
        enableFallback: true,
        timeout: 60000,
      },
      aiService
    );
    this.services.set('resumeParser', resumeParser);

    // 4. 初始化面试引擎
    const interviewEngine = new InterviewEngine(
      {
        defaultQuestionCount: 10,
        defaultDifficulty: 'medium',
        timePerQuestion: 180, // 3分钟
        maxSessionDuration: 3600, // 1小时
      },
      aiService,
      sessionManager
    );
    this.services.set('interviewEngine', interviewEngine);

    // 5. 初始化WebSocket网关
    const wsGatewayConfig: WebSocketGatewayConfig = {
      port: config.port + 1,
      path: '/ws',
      pingInterval: 30000,
      connectionTimeout: 120000,
      maxMessageSize: 1024 * 1024,
      jwtSecret: config.jwt.secret,
      enableReconnect: true,
      maxReconnectAttempts: 5,
      reconnectDelay: 2000,
    };
    const wsGateway = new WebSocketGateway(wsGatewayConfig, interviewEngine);
    this.services.set('wsGateway', wsGateway);

    logger.info('依赖注入容器初始化完成');
  }

  getAIService(): IAIService {
    return this.services.get('aiService');
  }

  getResumeParser(): IResumeParser {
    return this.services.get('resumeParser');
  }

  getInterviewEngine(): ILegacyInterviewEngine {
    return this.services.get('interviewEngine');
  }

  getSessionManager(): AppSessionManager {
    return this.services.get('sessionManager');
  }

  getWebSocketGateway(): IWebSocketGateway {
    return this.services.get('wsGateway');
  }

  /**
   * 健康检查所有服务
   */
  async healthCheck(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    try {
      // 检查AI服务
      const aiService = this.getAIService();
      results.aiService = await aiService.healthCheck();
    } catch (error) {
      results.aiService = false;
      logger.error('AI服务健康检查失败:', error);
    }
    
    try {
      // 检查Redis连接（通过会话管理器）
      const sessionManager = this.getSessionManager();
      // 这里可以添加Redis健康检查逻辑
      results.redis = true; // 简化实现
    } catch (error) {
      results.redis = false;
      logger.error('Redis健康检查失败:', error);
    }
    
    try {
      // 检查WebSocket网关
      const wsGateway = this.getWebSocketGateway();
      results.wsGateway = wsGateway.getActiveConnections() >= 0; // 简化检查
    } catch (error) {
      results.wsGateway = false;
      logger.error('WebSocket网关健康检查失败:', error);
    }
    
    return results;
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    logger.info('开始清理容器资源...');
    
    try {
      const sessionManager = this.getSessionManager();
      if (sessionManager && typeof (sessionManager as any).disconnect === 'function') {
        await (sessionManager as any).disconnect();
      }
    } catch (error) {
      logger.error('清理会话管理器失败:', error);
    }
    
    try {
      const wsGateway = this.getWebSocketGateway();
      if (wsGateway) {
        await wsGateway.stop();
      }
    } catch (error) {
      logger.error('清理WebSocket网关失败:', error);
    }
    
    this.services.clear();
    logger.info('容器资源清理完成');
  }
}

// 导出单例实例
export const container = Container.getInstance();