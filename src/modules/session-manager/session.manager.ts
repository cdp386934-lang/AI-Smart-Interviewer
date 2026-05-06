import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

import type { ResumeData } from '@/types';
import { ILongTermMessageStore, InMemoryLongTermMessageStore } from './long-term-message.store';
import type { ILegacySessionStorage } from './legacy-session.storage';
import {
  InterviewConfig,
  InterviewEvent,
  InterviewReport,
  InterviewSession,
  InterviewStage,
  ISessionManager,
  Message,
  ProfileUpdate,
  SessionErrors,
  SessionManagerConfig,
} from './interfaces';
import {
  describeTransition,
  resolveNextStage,
  type StageTransitionHook,
} from './interview-state-machine';
import {
  defaultProfile,
  deserializeMessage,
  deserializeProfile,
  deserializeSessionCore,
  serializeMessage,
  serializeProfile,
  serializeSessionCore,
} from './session-serializer';
import logger from '@/utils/logger';
import { Errors } from '@/utils/errors';
import type {
  LegacyInterviewSession,
} from '@/types/legacy-interview';

const LEGACY_SESSION = (prefix: string, id: string) =>
  `${prefix}:legacy:session:${id}`;
const LEGACY_USER_SET = (prefix: string, userId: string) =>
  `${prefix}:legacy:user_sessions:${userId}`;
const RESUME_KEY = (prefix: string, id: string) => `${prefix}:resume:${id}`;
const EVAL_KEY = (prefix: string, sessionId: string, questionId: string) =>
  `${prefix}:evaluation:${sessionId}:${questionId}`;
const EVAL_SET = (prefix: string, sessionId: string) =>
  `${prefix}:session_evaluations:${sessionId}`;

const CORE = (prefix: string, id: string) => `${prefix}:session:${id}:core`;
const MESSAGES = (prefix: string, id: string) => `${prefix}:session:${id}:messages`;
const PROFILE = (prefix: string, id: string) => `${prefix}:session:${id}:profile`;
const ACTIVE = (prefix: string, userId: string) => `${prefix}:session:${userId}:active`;
const USER_INDEX = (prefix: string, userId: string) =>
  `${prefix}:session:user:${userId}:ids`;

export class SessionManager
  implements ISessionManager, ILegacySessionStorage
{
  private readonly redis: Redis;
  private readonly longTerm: ILongTermMessageStore;
  private readonly onStageExit: StageTransitionHook;
  private readonly onStageEnter: StageTransitionHook;
  private readonly config: SessionManagerConfig;

  constructor(
    config: SessionManagerConfig,
    redis: string | Redis,
    longTermStore?: ILongTermMessageStore,
    hooks?: {
      onStageExit?: StageTransitionHook;
      onStageEnter?: StageTransitionHook;
    }
  ) {
    this.config = config;
    this.redis = typeof redis === 'string' ? new Redis(redis) : redis;
    this.longTerm = longTermStore ?? new InMemoryLongTermMessageStore();
    this.onStageExit =
      hooks?.onStageExit ??
      (async ({ sessionId, from, to, event }) => {
        logger.info(
          `[session ${sessionId}] stage exit: ${describeTransition(from, event, to)}`
        );
      });
    this.onStageEnter =
      hooks?.onStageEnter ??
      (async ({ sessionId, from, to, event }) => {
        logger.info(
          `[session ${sessionId}] stage enter: ${describeTransition(from, event, to)}`
        );
      });

    this.redis.on('connect', () => logger.info('Redis 连接成功 (session-manager)'));
    this.redis.on('error', (err) => logger.error({ err }, 'Redis 错误 (session-manager)'));
  }

  private prefix(): string {
    return this.config.redisPrefix;
  }

  private ttlSeconds(): number {
    return Math.max(60, this.config.sessionTTL * 3600);
  }

  private idleMs(): number {
    return Math.max(1, this.config.timeoutMinutes) * 60 * 1000;
  }

  /** 超时则自动结束会话并落库，不抛错（后续 get 返回 ENDED 状态） */
  private async assertNotIdleTimeout(session: InterviewSession): Promise<void> {
    const idle = Date.now() - session.metadata.lastActivityAt.getTime();
    if (idle > this.idleMs() && session.stage !== InterviewStage.ENDED) {
      await this.forceEndForTimeout(session.id, session);
    }
  }

  /** 超时结束：避免走 transition → get → 再次触发空闲检测的死循环 */
  private async forceEndForTimeout(
    sessionId: string,
    session: InterviewSession
  ): Promise<void> {
    if (session.stage === InterviewStage.ENDED) return;
    const from = session.stage;
    const to = InterviewStage.ENDED;
    const event = InterviewEvent.SESSION_TIMEOUT;
    await this.onStageExit({ sessionId, from, to, event });
    session.stage = to;
    session.metadata.updatedAt = new Date();
    session.metadata.lastActivityAt = new Date();
    await this.persistCore(session);
    await this.onStageEnter({ sessionId, from, to, event });
    await this.clearActiveIfMatches(session.config.userId, sessionId);
    const p = this.prefix();
    await this.redis.expire(MESSAGES(p, sessionId), this.ttlSeconds());
    await this.redis.expire(PROFILE(p, sessionId), this.ttlSeconds());
  }

  async create(config: InterviewConfig): Promise<InterviewSession> {
    const userId = config.userId;
    const activeId = await this.redis.get(ACTIVE(this.prefix(), userId));
    if (activeId) {
      const existing = await this.get(activeId);
      if (existing && existing.stage !== InterviewStage.ENDED) {
        throw SessionErrors.TOO_MANY_SESSIONS(userId);
      }
    }

    const now = new Date();
    const session: InterviewSession = {
      id: uuidv4(),
      stage: InterviewStage.IDLE,
      config,
      resume: config.resume,
      messages: [],
      profile: defaultProfile(),
      metadata: {
        createdAt: now,
        updatedAt: now,
        lastActivityAt: now,
        ip: config.ip,
        userAgent: config.userAgent,
        totalMessages: 0,
        timeSpent: 0,
      },
    };

    const p = this.prefix();
    const pipe = this.redis.pipeline();
    pipe.set(CORE(p, session.id), serializeSessionCore(session), 'EX', this.ttlSeconds());
    pipe.set(PROFILE(p, session.id), serializeProfile(session.profile), 'EX', this.ttlSeconds());
    pipe.del(MESSAGES(p, session.id));
    pipe.set(ACTIVE(p, userId), session.id, 'EX', this.ttlSeconds());
    pipe.sadd(USER_INDEX(p, userId), session.id);
    pipe.expire(USER_INDEX(p, userId), this.ttlSeconds());
    await pipe.exec();

    logger.info(`创建面试会话(状态机): ${session.id} user=${userId}`);
    return session;
  }

  async get(sessionId: string): Promise<InterviewSession | null> {
    const p = this.prefix();
    const coreRaw = await this.redis.get(CORE(p, sessionId));
    if (!coreRaw) return null;

    const profileRaw = await this.redis.get(PROFILE(p, sessionId));
    const profile = profileRaw
      ? deserializeProfile(profileRaw)
      : defaultProfile();

    const msgStrings = await this.redis.lrange(MESSAGES(p, sessionId), 0, -1);
    const messages = msgStrings.map(deserializeMessage);

    const session = deserializeSessionCore(coreRaw, messages, profile);
    await this.assertNotIdleTimeout(session);
    return session;
  }

  async transition(sessionId: string, event: InterviewEvent): Promise<void> {
    const session = await this.requireSession(sessionId);
    await this.assertNotIdleTimeout(session);

    const from = session.stage;
    const to = resolveNextStage(sessionId, from, event);

    await this.onStageExit({ sessionId, from, to, event });
    session.stage = to;
    session.metadata.updatedAt = new Date();
    session.metadata.lastActivityAt = new Date();
    await this.persistCore(session);
    await this.onStageEnter({ sessionId, from, to, event });

    if (to === InterviewStage.ENDED) {
      await this.clearActiveIfMatches(session.config.userId, sessionId);
    }

    await this.redis.expire(MESSAGES(this.prefix(), sessionId), this.ttlSeconds());
    await this.redis.expire(PROFILE(this.prefix(), sessionId), this.ttlSeconds());
  }

  async addMessage(sessionId: string, message: Message): Promise<void> {
    const session = await this.requireSession(sessionId);
    if (session.stage === InterviewStage.ENDED) {
      throw SessionErrors.SESSION_ENDED(sessionId);
    }
    await this.assertNotIdleTimeout(session);

    const p = this.prefix();
    const serialized = serializeMessage(message);
    await this.redis.rpush(MESSAGES(p, sessionId), serialized);
    const max = this.config.maxMessagesPerSession;
    await this.redis.ltrim(MESSAGES(p, sessionId), -max, -1);

    await this.longTerm.appendMessage(sessionId, message);

    session.metadata.totalMessages += 1;
    session.metadata.updatedAt = new Date();
    session.metadata.lastActivityAt = new Date();
    await this.persistCore(session);

    if (
      this.config.enableCompression &&
      session.metadata.totalMessages >= this.config.compressionThreshold
    ) {
      await this.maybeCompress(sessionId);
    }
  }

  private async maybeCompress(sessionId: string): Promise<void> {
    const p = this.prefix();
    const raw = await this.redis.lrange(MESSAGES(p, sessionId), 0, -1);
    if (raw.length <= this.config.compressionThreshold) return;

    const all = raw.map(deserializeMessage);
    const keepTail = 10;
    const dropped = all.slice(0, -keepTail);
    const tail = all.slice(-keepTail);
    const summary: Message = {
      id: uuidv4(),
      role: 'system',
      content: `[上下文压缩] 已折叠较早的 ${dropped.length} 条消息，仅保留最近 ${keepTail} 条用于模型上下文。`,
      timestamp: new Date(),
    };
    const replacement = [summary, ...tail].map(serializeMessage);
    await this.redis.del(MESSAGES(p, sessionId));
    if (replacement.length) {
      await this.redis.rpush(MESSAGES(p, sessionId), ...replacement);
    }
    logger.info(`会话 ${sessionId} 消息列表已压缩`);
  }

  async getHistory(sessionId: string, limit?: number): Promise<Message[]> {
    const session = await this.requireSession(sessionId);
    await this.assertNotIdleTimeout(session);
    const short = session.messages;
    if (limit !== undefined && limit >= 0) {
      return short.slice(-limit);
    }
    return short;
  }

  async updateProfile(sessionId: string, update: ProfileUpdate): Promise<void> {
    const session = await this.requireSession(sessionId);
    await this.assertNotIdleTimeout(session);

    if (update.skills) {
      for (const [k, v] of update.skills) {
        session.profile.skills.set(k, v);
      }
    }
    if (update.weakAreas) session.profile.weakAreas = update.weakAreas;
    if (update.strongAreas) session.profile.strongAreas = update.strongAreas;
    if (update.personalityHints) {
      session.profile.personalityHints = update.personalityHints;
    }
    if (update.overallScore !== undefined) {
      session.profile.overallScore = update.overallScore;
    }

    const p = this.prefix();
    await this.redis.set(
      PROFILE(p, sessionId),
      serializeProfile(session.profile),
      'EX',
      this.ttlSeconds()
    );
    session.metadata.updatedAt = new Date();
    session.metadata.lastActivityAt = new Date();
    await this.persistCore(session);
  }

  async end(sessionId: string): Promise<InterviewReport> {
    const session = await this.requireSession(sessionId);
    if (session.stage === InterviewStage.ENDED) {
      throw SessionErrors.SESSION_ENDED(sessionId);
    }

    await this.transition(sessionId, InterviewEvent.SESSION_ENDED);
    const endedSession = await this.requireSession(sessionId);

    const full = await this.longTerm.loadMessages(sessionId);
    const endedAt = new Date();
    const scores = full
      .map((m) => m.metadata?.evaluation?.score)
      .filter((s): s is number => typeof s === 'number');
    const averageScore =
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    const timeSpent = Math.floor(
      (endedAt.getTime() - endedSession.metadata.createdAt.getTime()) / 1000
    );

    return {
      sessionId,
      stage: InterviewStage.ENDED,
      config: endedSession.config,
      profile: endedSession.profile,
      summary: `面试已结束。共 ${endedSession.metadata.totalMessages} 条消息，综合画像得分 ${endedSession.profile.overallScore}。`,
      strengths: endedSession.profile.strongAreas,
      weaknesses: endedSession.profile.weakAreas,
      recommendations:
        endedSession.profile.weakAreas.length > 0
          ? [`建议加强: ${endedSession.profile.weakAreas.join('、')}`]
          : ['保持优势领域并拓展广度'],
      totalQuestions: scores.length,
      averageScore,
      timeSpent,
      createdAt: session.metadata.createdAt,
      endedAt,
    };
  }

  private async requireSession(sessionId: string): Promise<InterviewSession> {
    const s = await this.get(sessionId);
    if (!s) throw SessionErrors.SESSION_NOT_FOUND(sessionId);
    return s;
  }

  private async persistCore(session: InterviewSession): Promise<void> {
    await this.redis.set(
      CORE(this.prefix(), session.id),
      serializeSessionCore(session),
      'EX',
      this.ttlSeconds()
    );
  }

  private async clearActiveIfMatches(userId: string, sessionId: string): Promise<void> {
    const cur = await this.redis.get(ACTIVE(this.prefix(), userId));
    if (cur === sessionId) {
      await this.redis.del(ACTIVE(this.prefix(), userId));
    }
  }

  // --- 旧版 REST 存储（InterviewEngine） ---

  async createSession(session: LegacyInterviewSession): Promise<void> {
    const p = this.prefix();
    const userSet = LEGACY_USER_SET(p, session.candidateId);
    const n = await this.redis.scard(userSet);
    if (n >= this.config.maxActiveSessions) {
      throw Errors.createError('TOO_MANY_SESSIONS', '活跃会话数量达到上限', 429);
    }
    await this.redis.setex(
      LEGACY_SESSION(p, session.id),
      this.ttlSeconds(),
      JSON.stringify(session)
    );
    await this.redis.sadd(userSet, session.id);
    await this.redis.expire(userSet, this.ttlSeconds());
    logger.info(`创建 legacy 会话: ${session.id}`);
  }

  async getSession(sessionId: string): Promise<LegacyInterviewSession> {
    const raw = await this.redis.get(LEGACY_SESSION(this.prefix(), sessionId));
    if (!raw) throw Errors.SESSION_NOT_FOUND(sessionId);
    const s = JSON.parse(raw) as LegacyInterviewSession;
    return reviveLegacySession(s);
  }

  async updateSession(session: LegacyInterviewSession): Promise<void> {
    await this.redis.setex(
      LEGACY_SESSION(this.prefix(), session.id),
      this.ttlSeconds(),
      JSON.stringify(session)
    );
  }

  async getUserSessions(userId: string): Promise<LegacyInterviewSession[]> {
    const ids = await this.redis.smembers(LEGACY_USER_SET(this.prefix(), userId));
    const out: LegacyInterviewSession[] = [];
    const userSet = LEGACY_USER_SET(this.prefix(), userId);
    for (const id of ids) {
      try {
        out.push(await this.getSession(id));
      } catch {
        await this.redis.srem(userSet, id);
      }
    }
    out.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return out;
  }

  async saveResume(resume: ResumeData): Promise<void> {
    await this.redis.set(RESUME_KEY(this.prefix(), resume.id), JSON.stringify(resume));
    logger.info(`保存简历缓存: ${resume.id}`);
  }

  async getResume(resumeId: string): Promise<ResumeData> {
    const raw = await this.redis.get(RESUME_KEY(this.prefix(), resumeId));
    if (!raw) {
      throw Errors.createError('RESUME_NOT_FOUND', `简历不存在: ${resumeId}`, 404);
    }
    const r = JSON.parse(raw) as ResumeData & { createdAt: string };
    return { ...r, createdAt: new Date(r.createdAt) };
  }

  async saveAnswerEvaluation(
    sessionId: string,
    questionId: string,
    score: number,
    feedback: string,
    keywordsMatched: string[]
  ): Promise<void> {
    const p = this.prefix();
    const evaluation = {
      questionId,
      score,
      feedback,
      keywordsMatched,
      timestamp: new Date().toISOString(),
    };
    await this.redis.setex(
      EVAL_KEY(p, sessionId, questionId),
      this.ttlSeconds(),
      JSON.stringify(evaluation)
    );
    await this.redis.sadd(EVAL_SET(p, sessionId), questionId);
    await this.redis.expire(EVAL_SET(p, sessionId), this.ttlSeconds());
  }

  async getAnswerEvaluations(
    sessionId: string
  ): Promise<
    Array<{
      questionId: string;
      score: number;
      feedback: string;
      keywordsMatched: string[];
      timestamp: Date;
    }>
  > {
    const p = this.prefix();
    const qids = await this.redis.smembers(EVAL_SET(p, sessionId));
    const out: Array<{
      questionId: string;
      score: number;
      feedback: string;
      keywordsMatched: string[];
      timestamp: Date;
    }> = [];
    for (const qid of qids) {
      const raw = await this.redis.get(EVAL_KEY(p, sessionId, qid));
      if (raw) {
        const e = JSON.parse(raw) as {
          questionId: string;
          score: number;
          feedback: string;
          keywordsMatched: string[];
          timestamp: string;
        };
        out.push({ ...e, timestamp: new Date(e.timestamp) });
      }
    }
    return out;
  }

  async cleanupExpiredSessions(maxAgeHours: number): Promise<number> {
    const pattern = `${this.prefix()}:legacy:session:*`;
    const keys = await this.redis.keys(pattern);
    let n = 0;
    const now = Date.now();
    const maxMs = maxAgeHours * 3600 * 1000;
    for (const key of keys) {
      const raw = await this.redis.get(key);
      if (!raw) continue;
      const s = JSON.parse(raw) as LegacyInterviewSession & { createdAt: string };
      if (now - new Date(s.createdAt).getTime() > maxMs) {
        await this.redis.del(key);
        if (s.candidateId) {
          await this.redis.srem(LEGACY_USER_SET(this.prefix(), s.candidateId), s.id);
        }
        n++;
      }
    }
    return n;
  }

  async getActiveSessionCount(): Promise<number> {
    const keys = await this.redis.keys(`${this.prefix()}:legacy:session:*`);
    return keys.length;
  }

  async disconnect(): Promise<void> {
    await this.redis.quit();
    if ('close' in this.longTerm && typeof (this.longTerm as { close?: () => Promise<void> }).close === 'function') {
      await (this.longTerm as { close: () => Promise<void> }).close();
    }
    logger.info('SessionManager Redis 已断开');
  }
}

function reviveLegacySession(s: LegacyInterviewSession): LegacyInterviewSession {
  return {
    ...s,
    createdAt: new Date(s.createdAt as unknown as string),
    startedAt: s.startedAt ? new Date(s.startedAt as unknown as string) : undefined,
    completedAt: s.completedAt ? new Date(s.completedAt as unknown as string) : undefined,
    answers: (s.answers ?? []).map((a) => ({
      ...a,
      timestamp: new Date(a.timestamp as unknown as string),
    })),
  };
}
