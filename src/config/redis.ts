import Redis, { Cluster } from 'ioredis';
import { config } from './loader';

export interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  getJSON<T>(key: string): Promise<T | null>;
  setJSON<T>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  expire(key: string, seconds: number): Promise<void>;
  lock(key: string, ttl: number): Promise<{ release: () => Promise<void> } | null>;
  rateLimit(key: string, limit: number, window: number): Promise<{ allowed: boolean; remaining: number; resetTime: number }>;
  publish(channel: string, message: string): Promise<void>;
  subscribe(channel: string, handler: (message: string) => void): Promise<void>;
  health(): Promise<boolean>;
  close(): Promise<void>;
}

export class RedisService implements RedisClient {
  private client: Redis | Cluster;
  constructor() {
    if (config.app.env === 'production') {
      this.client = new Redis.Cluster([{ host: config.redis.host, port: config.redis.port }], { redisOptions: { password: config.redis.password, db: config.redis.db, tls: config.redis.tlsEnabled ? {} : undefined, maxRetriesPerRequest: 10 } });
    } else {
      this.client = new Redis({ host: config.redis.host, port: config.redis.port, password: config.redis.password, db: config.redis.db, maxRetriesPerRequest: 10, retryStrategy: (times) => Math.min(times * 200, 2000) });
    }
  }
  private k(key: string) { return `${config.redis.keyPrefix}${key}`; }
  async get(key: string) { return this.client.get(this.k(key)); }
  async set(key: string, value: string, ttl?: number) { ttl ? await this.client.set(this.k(key), value, 'EX', ttl) : await this.client.set(this.k(key), value); }
  async getJSON<T>(key: string) { const v = await this.get(key); return v ? JSON.parse(v) as T : null; }
  async setJSON<T>(key: string, value: T, ttl?: number) { await this.set(key, JSON.stringify(value), ttl); }
  async del(key: string) { await this.client.del(this.k(key)); }
  async exists(key: string) { return (await this.client.exists(this.k(key))) > 0; }
  async expire(key: string, seconds: number) { await this.client.expire(this.k(key), seconds); }
  async lock(key: string, ttl: number) { const lockKey = this.k(`lock:${key}`); const token = `${Date.now()}-${Math.random()}`; const ok = await this.client.set(lockKey, token, 'NX', 'EX', ttl); if (!ok) return null; return { release: async () => { const current = await this.client.get(lockKey); if (current === token) await this.client.del(lockKey); } }; }
  async rateLimit(key: string, limit: number, window: number) { const now = Date.now(); const redisKey = this.k(`rl:${key}`); const multi = this.client.multi(); multi.incr(redisKey); multi.pttl(redisKey); const [countRaw, ttlRaw] = await multi.exec(); const count = Number(countRaw?.[1] ?? 0); let ttl = Number(ttlRaw?.[1] ?? -1); if (ttl < 0) { await this.client.pexpire(redisKey, window * 1000); ttl = window * 1000; } return { allowed: count <= limit, remaining: Math.max(0, limit - count), resetTime: now + ttl }; }
  async publish(channel: string, message: string) { await this.client.publish(this.k(channel), message); }
  async subscribe(channel: string, handler: (message: string) => void) { const sub = (this.client as any).duplicate(); await sub.subscribe(this.k(channel)); sub.on('message', (_chan: string, msg: string) => handler(msg)); }
  async health() { try { await this.client.ping(); return true; } catch { return false; } }
  async close() { await this.client.quit(); }
}
