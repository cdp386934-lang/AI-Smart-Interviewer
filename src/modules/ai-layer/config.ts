import { z } from 'zod';

/**
 * 支持的模型提供商
 */
export enum ModelProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  // 可以扩展其他提供商
}

/**
 * 模型配置
 */
export interface ModelConfig {
  provider: ModelProvider;
  modelName: string;
  apiKey: string;
  baseURL?: string; // 用于自定义API端点
  timeout?: number;
  maxRetries?: number;
}

/**
 * AI层配置
 */
export interface AILayerConfig {
  defaultModel: string;
  models: Record<string, ModelConfig>;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  enableTokenTracking?: boolean;
  enableRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number; // 毫秒
}

/**
 * 环境变量验证模式
 */
export const aiConfigSchema = z.object({
  AI_DEFAULT_MODEL: z.string().default('gpt-4-turbo-preview'),
  AI_DEFAULT_TEMPERATURE: z.string().transform(Number).default('0.7'),
  AI_DEFAULT_MAX_TOKENS: z.string().transform(Number).default('2000'),
  
  // OpenAI配置
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4-turbo-preview'),
  OPENAI_BASE_URL: z.string().optional(),
  
  // Anthropic配置
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-3-opus-20240229'),
  
  // 重试配置
  AI_MAX_RETRIES: z.string().transform(Number).default('3'),
  AI_RETRY_DELAY: z.string().transform(Number).default('1000'),
  AI_ENABLE_RETRY: z.string().transform(v => v === 'true').default('true'),
  AI_ENABLE_TOKEN_TRACKING: z.string().transform(v => v === 'true').default('true'),
});

export type AIConfigEnv = z.infer<typeof aiConfigSchema>;

/**
 * 从环境变量创建配置
 */
export function createConfigFromEnv(env: NodeJS.ProcessEnv): AILayerConfig {
  const parsed = aiConfigSchema.parse(env);
  
  const models: Record<string, ModelConfig> = {};
  
  // 添加OpenAI模型
  if (parsed.OPENAI_API_KEY) {
    models['openai-gpt-4'] = {
      provider: ModelProvider.OPENAI,
      modelName: parsed.OPENAI_MODEL,
      apiKey: parsed.OPENAI_API_KEY,
      baseURL: parsed.OPENAI_BASE_URL,
      timeout: 30000,
      maxRetries: 3,
    };
  }
  
  // 添加Anthropic模型
  if (parsed.ANTHROPIC_API_KEY) {
    models['anthropic-claude'] = {
      provider: ModelProvider.ANTHROPIC,
      modelName: parsed.ANTHROPIC_MODEL,
      apiKey: parsed.ANTHROPIC_API_KEY,
      timeout: 30000,
      maxRetries: 3,
    };
  }
  
  return {
    defaultModel: parsed.AI_DEFAULT_MODEL,
    models,
    defaultTemperature: parsed.AI_DEFAULT_TEMPERATURE,
    defaultMaxTokens: parsed.AI_DEFAULT_MAX_TOKENS,
    enableTokenTracking: parsed.AI_ENABLE_TOKEN_TRACKING,
    enableRetry: parsed.AI_ENABLE_RETRY,
    maxRetries: parsed.AI_MAX_RETRIES,
    retryDelay: parsed.AI_RETRY_DELAY,
  };
}

/**
 * 默认配置
 */
export const defaultConfig: AILayerConfig = {
  defaultModel: 'openai-gpt-4',
  models: {},
  defaultTemperature: 0.7,
  defaultMaxTokens: 2000,
  enableTokenTracking: true,
  enableRetry: true,
  maxRetries: 3,
  retryDelay: 1000,
};