import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// 环境变量验证模式
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  API_PREFIX: z.string().default('/api/v1'),
  
  // 数据库配置
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  
  // AI配置
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4-turbo-preview'),
  
  // 文件上传
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE: z.string().transform(Number).default('10485760'), // 10MB
  
  // JWT
  JWT_SECRET: z.string().default('your_jwt_secret_key_here'),
  JWT_EXPIRES_IN: z.string().default('24h'),
});

// 解析和验证环境变量
const env = envSchema.parse(process.env);

// 应用配置
export const config = {
  env: env.NODE_ENV,
  port: env.PORT,
  apiPrefix: env.API_PREFIX,
  
  database: {
    url: env.DATABASE_URL || 'postgresql://user:password@localhost:5432/ai_interviewer',
  },
  
  redis: {
    url: env.REDIS_URL || 'redis://localhost:6379',
  },
  
  ai: {
    openaiApiKey: env.OPENAI_API_KEY || '',
    model: env.OPENAI_MODEL,
  },
  
  upload: {
    dir: env.UPLOAD_DIR,
    maxFileSize: env.MAX_FILE_SIZE,
  },
  
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  },
};

// 类型导出
export type AppConfig = typeof config;

export default config;