import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';

export interface AppConfig {
  app: {
    env: 'development' | 'production' | 'test';
    port: number;
    wsPort: number;
    name: string;
    url: string;
  };
  llm: {
    provider: 'deepseek' | 'qwen' | 'openai' | 'zhipu' | 'moonshot' | 'ollama';
    apiKey: string;
    baseUrl?: string;
    model: string;
    temperature: number;
    maxTokens: number;
  };
  embedding: {
    provider: 'openai' | 'qwen' | 'local';
    apiKey: string;
    model: string;
    baseUrl?: string;
  };
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
    ssl: boolean;
    sslCa?: string;
    maxConnections: number;
    minConnections: number;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    tlsEnabled: boolean;
    keyPrefix: string;
  };
  storage: {
    type: 'local' | 'oss' | 'minio' | 's3';
    localDir?: string;
    maxSize: number;
    oss?: {
      accessKeyId: string;
      accessKeySecret: string;
      bucket: string;
      region: string;
      endpoint: string;
    };
    minio?: {
      endpoint: string;
      accessKey: string;
      secretKey: string;
      bucket: string;
      useSsl: boolean;
    };
  };
  auth: {
    jwtSecret: string;
    jwtRefreshSecret: string;
    jwtExpiresIn: string;
    jwtRefreshExpiresIn: string;
    bcryptRounds: number;
  };
  log: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'pretty';
    output: 'stdout' | 'file' | 'both';
    filePath?: string;
  };
}

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_NAME: z.string().min(1).default('AI Smart Interviewer'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  WS_PORT: z.coerce.number().int().min(1).max(65535).default(3001),

  LLM_PROVIDER: z.enum(['deepseek', 'qwen', 'openai', 'zhipu', 'moonshot', 'ollama']).default('openai'),
  LLM_API_KEY: z.string().default(''),
  LLM_BASE_URL: z.string().url().optional(),
  LLM_MODEL: z.string().min(1).default('gpt-4o-mini'),
  LLM_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.7),
  LLM_MAX_TOKENS: z.coerce.number().int().min(1).max(8192).default(2048),

  EMBEDDING_PROVIDER: z.enum(['openai', 'qwen', 'local']).default('openai'),
  EMBEDDING_API_KEY: z.string().default(''),
  EMBEDDING_MODEL: z.string().min(1).default('text-embedding-3-small'),
  EMBEDDING_BASE_URL: z.string().url().optional(),

  DB_HOST: z.string().min(1).default('localhost'),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(5432),
  DB_USER: z.string().min(1).default('postgres'),
  DB_PASSWORD: z.string().default('postgres'),
  DB_NAME: z.string().min(1).default('ai_interviewer'),
  DB_SSL: z.coerce.boolean().default(false),
  DB_SSL_CA: z.string().optional(),
  DB_MAX_CONNECTIONS: z.coerce.number().int().min(1).max(200).default(20),
  DB_MIN_CONNECTIONS: z.coerce.number().int().min(0).max(50).default(2),

  REDIS_HOST: z.string().min(1).default('localhost'),
  REDIS_PORT: z.coerce.number().int().min(1).max(65535).default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().int().min(0).max(15).default(0),
  REDIS_TLS_ENABLED: z.coerce.boolean().default(false),
  REDIS_KEY_PREFIX: z.string().min(1).default('ai_interviewer:'),

  STORAGE_TYPE: z.enum(['local', 'oss', 'minio', 's3']).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('./uploads'),
  STORAGE_MAX_SIZE: z.coerce.number().int().min(1024).default(10 * 1024 * 1024),
  OSS_ACCESS_KEY_ID: z.string().optional(),
  OSS_ACCESS_KEY_SECRET: z.string().optional(),
  OSS_BUCKET: z.string().optional(),
  OSS_REGION: z.string().optional(),
  OSS_ENDPOINT: z.string().url().optional(),
  MINIO_ENDPOINT: z.string().url().optional(),
  MINIO_ACCESS_KEY: z.string().optional(),
  MINIO_SECRET_KEY: z.string().optional(),
  MINIO_BUCKET: z.string().optional(),
  MINIO_USE_SSL: z.coerce.boolean().default(false),

  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().min(1).default('24h'),
  JWT_REFRESH_EXPIRES_IN: z.string().min(1).default('7d'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(14).default(10),

  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('pretty'),
  LOG_OUTPUT: z.enum(['stdout', 'file', 'both']).default('stdout'),
  LOG_FILE_PATH: z.string().optional(),
});

function isProd(env: string) {
  return env === 'production';
}

function ensureProductionRequired(app: AppConfig) {
  const missing: string[] = [];
  if (!app.llm.apiKey) missing.push('LLM_API_KEY');
  if (app.embedding.provider !== 'local' && !app.embedding.apiKey) missing.push('EMBEDDING_API_KEY');
  if (app.storage.type === 'oss') {
    const s = app.storage.oss;
    if (!s?.accessKeyId) missing.push('OSS_ACCESS_KEY_ID');
    if (!s?.accessKeySecret) missing.push('OSS_ACCESS_KEY_SECRET');
    if (!s?.bucket) missing.push('OSS_BUCKET');
    if (!s?.region) missing.push('OSS_REGION');
    if (!s?.endpoint) missing.push('OSS_ENDPOINT');
  }
  if (app.storage.type === 'minio') {
    const s = app.storage.minio;
    if (!s?.endpoint) missing.push('MINIO_ENDPOINT');
    if (!s?.accessKey) missing.push('MINIO_ACCESS_KEY');
    if (!s?.secretKey) missing.push('MINIO_SECRET_KEY');
    if (!s?.bucket) missing.push('MINIO_BUCKET');
  }
  if (missing.length) {
    throw new Error(`生产环境配置缺失: ${missing.join(', ')}`);
  }
}

function buildConfig(env: z.infer<typeof schema>): AppConfig {
  const config: AppConfig = {
    app: {
      env: env.NODE_ENV,
      port: env.PORT,
      wsPort: env.WS_PORT,
      name: env.APP_NAME,
      url: env.APP_URL,
    },
    llm: {
      provider: env.LLM_PROVIDER,
      apiKey: env.LLM_API_KEY,
      baseUrl: env.LLM_BASE_URL,
      model: env.LLM_MODEL,
      temperature: env.LLM_TEMPERATURE,
      maxTokens: env.LLM_MAX_TOKENS,
    },
    embedding: {
      provider: env.EMBEDDING_PROVIDER,
      apiKey: env.EMBEDDING_API_KEY,
      model: env.EMBEDDING_MODEL,
      baseUrl: env.EMBEDDING_BASE_URL,
    },
    database: {
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      name: env.DB_NAME,
      ssl: env.DB_SSL,
      sslCa: env.DB_SSL_CA,
      maxConnections: env.DB_MAX_CONNECTIONS,
      minConnections: env.DB_MIN_CONNECTIONS,
    },
    redis: {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD,
      db: env.REDIS_DB,
      tlsEnabled: env.REDIS_TLS_ENABLED,
      keyPrefix: env.REDIS_KEY_PREFIX,
    },
    storage: {
      type: env.STORAGE_TYPE,
      localDir: env.STORAGE_LOCAL_DIR,
      maxSize: env.STORAGE_MAX_SIZE,
    },
    auth: {
      jwtSecret: env.JWT_SECRET,
      jwtRefreshSecret: env.JWT_REFRESH_SECRET,
      jwtExpiresIn: env.JWT_EXPIRES_IN,
      jwtRefreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
      bcryptRounds: env.BCRYPT_ROUNDS,
    },
    log: {
      level: env.LOG_LEVEL,
      format: env.LOG_FORMAT,
      output: env.LOG_OUTPUT,
      filePath: env.LOG_FILE_PATH,
    },
  };

  if (env.STORAGE_TYPE === 'oss') {
    config.storage.oss = {
      accessKeyId: env.OSS_ACCESS_KEY_ID || '',
      accessKeySecret: env.OSS_ACCESS_KEY_SECRET || '',
      bucket: env.OSS_BUCKET || '',
      region: env.OSS_REGION || '',
      endpoint: env.OSS_ENDPOINT || '',
    };
  }

  if (env.STORAGE_TYPE === 'minio') {
    config.storage.minio = {
      endpoint: env.MINIO_ENDPOINT || '',
      accessKey: env.MINIO_ACCESS_KEY || '',
      secretKey: env.MINIO_SECRET_KEY || '',
      bucket: env.MINIO_BUCKET || '',
      useSsl: env.MINIO_USE_SSL,
    };
  }

  if (config.app.env === 'production') ensureProductionRequired(config);
  return config;
}

export function loadConfig(envFile = path.resolve(process.cwd(), '.env')): AppConfig {
  dotenv.config({ path: envFile, override: false });
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`).join('\n');
    throw new Error(`配置校验失败:\n${errors}`);
  }
  return buildConfig(parsed.data);
}

export const config = loadConfig();

export function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => (/password|secret|key|token/i.test(k) ? [k, '***'] : [k, redactSecrets(v)])));
  }
  return value;
}
