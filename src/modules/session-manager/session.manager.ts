import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

import { ISessionManager, SessionManagerConfig } from './interfaces';
import { InterviewSession, ResumeData } from '@/types';
import logger from '@/utils/logger';
import { Errors } from '@/utils/errors';

export class SessionManager implements ISessionManager {
  private redis: Redis;
  private config: SessionManagerConfig;
  private memoryStore: Map<string, any>;

  constructor(config: SessionManagerConfig, redisUrl: string) {
    this.config = config;
    this.redis = new Redis(redisUrl);
    this.memoryStore = new Map();
    
    // 初始化Redis连接
    this.redis.on('connect', () => {
      logger.info('Redis连接成功');
    });
    
    this.redis.on('error', (error) => {
      logger.error('Redis连接错误:', error);
    });
  }

  private getSessionKey(sessionId: string): string {
    return `${this.config.redisPrefix}:session:${sessionId}`;
  }

  private getResumeKey(resumeId: string): string {
    return `${this.config.redisPrefix}:resume:${resumeId}`;
  }

  private getUserSessionsKey(userId: string): string {
    return `${this.config.redisPrefix}:user_sessions:${userId}`;
  }

  private getAnswerEvaluationKey(sessionId: string, questionId: string): string {
    return `${this.config.redisPrefix}:evaluation:${sessionId}:${questionId}`;
  }

  private getSessionEvaluationsKey(sessionId: string): string {
    return `${this.config.redisPrefix}:session_evaluations:${sessionId}`;
  }

  async createSession(session: InterviewSession): Promise<void> {
    try {
      const sessionKey = this.getSessionKey(session.id);
      const userSessionsKey = this.getUserSessionsKey(session.candidateId);
      
      // 检查活跃会话数量
      const activeSessions = await this.redis.scard(userSessionsKey);
      if (activeSessions >= this.config.maxActiveSessions) {
        throw Errors.createError('TOO_MANY_SESSIONS', '活跃会话数量达到上限', 429);
      }
      
      // 保存会话到Redis
      await this.redis.setex(
        sessionKey,
        this.config.sessionTTL * 3600, // 转换为秒
        JSON.stringify(session)
      );
      
      // 添加到用户会话集合
      await this.redis.sadd(userSessionsKey, session.id);
      
      // 设置用户会话集合的过期时间
      await this.redis.expire(userSessionsKey, this.config.sessionTTL * 3600);
      
      logger.info(`创建会话: ${session.id} for user: ${session.candidateId}`);
    } catch (error) {
      logger.error('创建会话失败:', error);
      throw error;
    }
  }

  async getSession(sessionId: string): Promise<InterviewSession> {
    try {
      const sessionKey = this.getSessionKey(sessionId);
      const sessionData = await this.redis.get(sessionKey);
      
      if (!sessionData) {
        throw Errors.SESSION_NOT_FOUND(sessionId);
      }
      
      const session = JSON.parse(sessionData);
      
      // 更新会话过期时间
      await this.redis.expire(sessionKey, this.config.sessionTTL * 3600);
      
      return {
        ...session,
        startedAt: session.startedAt ? new Date(session.startedAt) : undefined,
        completedAt: session.completedAt ? new Date(session.completedAt) : undefined,
        createdAt: new Date(session.createdAt),
      };
    } catch (error) {
      logger.error('获取会话失败:', error);
      throw error;
    }
  }

  async updateSession(session: InterviewSession): Promise<void> {
    try {
      const sessionKey = this.getSessionKey(session.id);
      
      // 更新会话
      await this.redis.setex(
        sessionKey,
        this.config.sessionTTL * 3600,
        JSON.stringify(session)
      );
      
      logger.debug(`更新会话: ${session.id}`);
    } catch (error) {
      logger.error('更新会话失败:', error);
      throw error;
    }
  }

  async getUserSessions(userId: string): Promise<InterviewSession[]> {
    try {
      const userSessionsKey = this.getUserSessionsKey(userId);
      const sessionIds = await this.redis.smembers(userSessionsKey);
      
      const sessions: InterviewSession[] = [];
      
      for (const sessionId of sessionIds) {
        try {
          const session = await this.getSession(sessionId);
          sessions.push(session);
        } catch (error) {
          // 如果会话不存在，从集合中移除
          await this.redis.srem(userSessionsKey, sessionId);
          logger.warn(`清理无效会话: ${sessionId} from user: ${userId}`);
        }
      }
      
      // 按创建时间排序（最新的在前）
      sessions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      return sessions;
    } catch (error) {
      logger.error('获取用户会话失败:', error);
      throw error;
    }
  }

  async saveResume(resume: ResumeData): Promise<void> {
    try {
      const resumeKey = this.getResumeKey(resume.id);
      
      // 保存简历到Redis（永不过期，或设置较长的过期时间）
      await this.redis.set(
        resumeKey,
        JSON.stringify(resume)
      );
      
      logger.info(`保存简历: ${resume.id} for user: ${resume.name}`);
    } catch (error) {
      logger.error('保存简历失败:', error);
      throw error;
    }
  }

  async getResume(resumeId: string): Promise<ResumeData> {
    try {
      const resumeKey = this.getResumeKey(resumeId);
      const resumeData = await this.redis.get(resumeKey);
      
      if (!resumeData) {
        throw Errors.createError('RESUME_NOT_FOUND', `简历不存在: ${resumeId}`, 404);
      }
      
      const resume = JSON.parse(resumeData);
      return {
        ...resume,
        createdAt: new Date(resume.createdAt),
      };
    } catch (error) {
      logger.error('获取简历失败:', error);
      throw error;
    }
  }

  async saveAnswerEvaluation(
    sessionId: string,
    questionId: string,
    score: number,
    feedback: string,
    keywordsMatched: string[]
  ): Promise<void> {
    try {
      const evaluationKey = this.getAnswerEvaluationKey(sessionId, questionId);
      const sessionEvaluationsKey = this.getSessionEvaluationsKey(sessionId);
      
      const evaluation = {
        questionId,
        score,
        feedback,
        keywordsMatched,
        timestamp: new Date().toISOString(),
      };
      
      // 保存评估结果
      await this.redis.setex(
        evaluationKey,
        this.config.sessionTTL * 3600,
        JSON.stringify(evaluation)
      );
      
      // 添加到会话评估集合
      await this.redis.sadd(sessionEvaluationsKey, questionId);
      await this.redis.expire(sessionEvaluationsKey, this.config.sessionTTL * 3600);
      
      logger.debug(`保存回答评估: session=${sessionId}, question=${questionId}, score=${score}`);
    } catch (error) {
      logger.error('保存回答评估失败:', error);
      throw error;
    }
  }

  async getAnswerEvaluations(sessionId: string): Promise<Array<{
    questionId: string;
    score: number;
    feedback: string;
    keywordsMatched: string[];
    timestamp: Date;
  }>> {
    try {
      const sessionEvaluationsKey = this.getSessionEvaluationsKey(sessionId);
      const questionIds = await this.redis.smembers(sessionEvaluationsKey);
      
      const evaluations: Array<{
        questionId: string;
        score: number;
        feedback: string;
        keywordsMatched: string[];
        timestamp: Date;
      }> = [];
      
      for (const questionId of questionIds) {
        const evaluationKey = this.getAnswerEvaluationKey(sessionId, questionId);
        const evaluationData = await this.redis.get(evaluationKey);
        
        if (evaluationData) {
          const evaluation = JSON.parse(evaluationData);
          evaluations.push({
            ...evaluation,
            timestamp: new Date(evaluation.timestamp),
          });
        }
      }
      
      return evaluations;
    } catch (error) {
      logger.error('获取回答评估失败:', error);
      throw error;
    }
  }

  async cleanupExpiredSessions(maxAgeHours: number): Promise<number> {
    try {
      // 这个实现需要扫描所有会话键，在生产环境中可能需要更高效的实现
      // 这里使用简化的实现
      const pattern = `${this.config.redisPrefix}:session:*`;
      const keys = await this.redis.keys(pattern);
      
      let cleanedCount = 0;
      const now = Date.now();
      const maxAgeMs = maxAgeHours * 3600 * 1000;
      
      for (const key of keys) {
        const sessionData = await this.redis.get(key);
        if (sessionData) {
          const session = JSON.parse(sessionData);
          const sessionAge = now - new Date(session.createdAt).getTime();
          
          if (sessionAge > maxAgeMs) {
            // 删除过期会话
            await this.redis.del(key);
            
            // 从用户会话集合中移除
            const userSessionsKey = this.getUserSessionsKey(session.candidateId);
            await this.redis.srem(userSessionsKey, session.id);
            
            cleanedCount++;
          }
        }
      }
      
      logger.info(`清理过期会话: ${cleanedCount} 个`);
      return cleanedCount;
    } catch (error) {
      logger.error('清理过期会话失败:', error);
      throw error;
    }
  }

  /**
   * 获取活跃会话数量
   */
  async getActiveSessionCount(): Promise<number> {
    try {
      const pattern = `${this.config.redisPrefix}:session:*`;
      const keys = await this.redis.keys(pattern);
      return keys.length;
    } catch (error) {
      logger.error('获取活跃会话数量失败:', error);
      throw error;
    }
  }

  /**
   * 关闭Redis连接
   */
  async disconnect(): Promise<void> {
    await this.redis.quit();
    logger.info('Redis连接已关闭');
  }
}