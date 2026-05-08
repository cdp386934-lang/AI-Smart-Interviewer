import type { Database } from './database';
import type { RedisClient } from './redis';
import type { LLMFactory } from './llm-factory';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: {
    http: { status: 'up' | 'down'; latency: number };
    database: { status: 'up' | 'down'; latency: number };
    redis: { status: 'up' | 'down'; latency: number };
    llm: { status: 'up' | 'down'; latency: number; model: string };
  };
}

const measure = async <T>(fn: () => Promise<T>) => {
  const start = Date.now();
  try { const result = await fn(); return { ok: true as const, latency: Date.now() - start, result }; } catch { return { ok: false as const, latency: Date.now() - start }; }
};

export async function checkHealth(db: Database, redis: RedisClient, llm: LLMFactory): Promise<HealthStatus> {
  const [dbR, redisR, llmR] = await Promise.all([measure(() => db.health()), measure(() => redis.health()), measure(() => llm.health())]);
  const score = [dbR.ok, redisR.ok, llmR.ok].filter(Boolean).length;
  const status = score === 3 ? 'healthy' : score >= 2 ? 'degraded' : 'unhealthy';
  return { status, timestamp: new Date().toISOString(), version: process.env.APP_VERSION || '1.0.0', checks: { http: { status: 'up', latency: 1 }, database: { status: dbR.ok ? 'up' : 'down', latency: dbR.latency }, redis: { status: redisR.ok ? 'up' : 'down', latency: redisR.latency }, llm: { status: llmR.ok ? 'up' : 'down', latency: llmR.latency, model: llm.health ? (await llm.health()).model : 'unknown' } } };
}
