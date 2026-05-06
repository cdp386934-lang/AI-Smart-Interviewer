import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ModelConfig, ModelProvider } from './config';
import logger from '@/utils/logger';

/**
 * 模型工厂
 */
export class ModelFactory {
  private static instances: Map<string, BaseChatModel> = new Map();
  
  /**
   * 创建或获取模型实例
   */
  static createModel(config: ModelConfig): BaseChatModel {
    const cacheKey = `${config.provider}-${config.modelName}`;
    
    if (this.instances.has(cacheKey)) {
      return this.instances.get(cacheKey)!;
    }
    
    let model: BaseChatModel;
    
    switch (config.provider) {
      case ModelProvider.OPENAI:
        model = new ChatOpenAI({
          openAIApiKey: config.apiKey,
          modelName: config.modelName,
          temperature: 0.7,
          maxTokens: 2000,
          timeout: config.timeout || 30000,
          maxRetries: config.maxRetries || 3,
          configuration: config.baseURL ? {
            baseURL: config.baseURL,
          } : undefined,
        });
        break;
        
      case ModelProvider.ANTHROPIC:
        model = new ChatAnthropic({
          anthropicApiKey: config.apiKey,
          modelName: config.modelName,
          temperature: 0.7,
          maxTokens: 2000,
          timeout: config.timeout || 30000,
          maxRetries: config.maxRetries || 3,
        });
        break;
        
      default:
        throw new Error(`不支持的模型提供商: ${config.provider}`);
    }
    
    this.instances.set(cacheKey, model);
    logger.info(`创建模型实例: ${cacheKey}`);
    
    return model;
  }
  
  /**
   * 清理所有模型实例
   */
  static clearInstances(): void {
    this.instances.clear();
    logger.info('清理所有模型实例');
  }
  
  /**
   * 获取所有模型实例
   */
  static getInstances(): Map<string, BaseChatModel> {
    return this.instances;
  }
  
  /**
   * 创建Embedding模型
   */
  static createEmbeddingModel(config: ModelConfig): any {
    // 这里可以扩展支持Embedding模型
    // 目前先返回null，后续实现
    return null;
  }
}