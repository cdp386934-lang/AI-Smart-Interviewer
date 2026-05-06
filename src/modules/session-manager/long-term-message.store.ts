import { Message } from './interfaces';
import { deserializeMessage, serializeMessage } from './session-serializer';

export interface ILongTermMessageStore {
  appendMessage(sessionId: string, message: Message): Promise<void>;
  loadMessages(sessionId: string): Promise<Message[]>;
}

/** 无外部依赖时的内存实现（测试或本地） */
export class InMemoryLongTermMessageStore implements ILongTermMessageStore {
  private readonly bySession = new Map<string, Message[]>();

  async appendMessage(sessionId: string, message: Message): Promise<void> {
    const list = this.bySession.get(sessionId) ?? [];
    list.push(message);
    this.bySession.set(sessionId, list);
  }

  async loadMessages(sessionId: string): Promise<Message[]> {
    return [...(this.bySession.get(sessionId) ?? [])];
  }

  clear(sessionId?: string): void {
    if (sessionId) this.bySession.delete(sessionId);
    else this.bySession.clear();
  }
}

type PgPool = import('pg').Pool;

export interface PostgresMessageStoreOptions {
  connectionString: string;
  tableName?: string;
}

/**
 * PostgreSQL 持久化完整对话（每行一条消息 JSON）
 */
export class PostgresLongTermMessageStore implements ILongTermMessageStore {
  private pool: PgPool | null = null;
  private readonly table: string;
  private initPromise: Promise<void> | null = null;

  constructor(private readonly options: PostgresMessageStoreOptions) {
    const name = options.tableName ?? 'interview_session_messages';
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      throw new Error(`非法表名: ${name}`);
    }
    this.table = name;
  }

  private async ensurePool(): Promise<PgPool> {
    if (this.pool) return this.pool;
    const { Pool } = await import('pg');
    this.pool = new Pool({ connectionString: this.options.connectionString });
    return this.pool;
  }

  private async ensureTable(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      const pool = await this.ensurePool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ${this.table} (
          id BIGSERIAL PRIMARY KEY,
          session_id TEXT NOT NULL,
          message_json JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_${this.table}_session ON ${this.table}(session_id, id);
      `);
    })();
    return this.initPromise;
  }

  async appendMessage(sessionId: string, message: Message): Promise<void> {
    await this.ensureTable();
    const pool = await this.ensurePool();
    await pool.query(
      `INSERT INTO ${this.table} (session_id, message_json) VALUES ($1, $2::jsonb)`,
      [sessionId, serializeMessage(message)]
    );
  }

  async loadMessages(sessionId: string): Promise<Message[]> {
    await this.ensureTable();
    const pool = await this.ensurePool();
    const res = await pool.query<{ message_json: unknown }>(
      `SELECT message_json FROM ${this.table} WHERE session_id = $1 ORDER BY id ASC`,
      [sessionId]
    );
    return res.rows.map((r) =>
      deserializeMessage(
        typeof r.message_json === 'string'
          ? r.message_json
          : JSON.stringify(r.message_json)
      )
    );
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.initPromise = null;
    }
  }
}
