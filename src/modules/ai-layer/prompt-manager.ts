import { PromptTemplate } from '@langchain/core/prompts';
import path from 'path';
import fs from 'fs/promises';
import logger from '@/utils/logger';

/**
 * Prompt模板
 */
export interface PromptTemplateDef {
  name: string;
  template: string;
  description: string;
  variables: string[];
  version: string;
}

/**
 * Prompt管理器
 */
export class PromptManager {
  private templates: Map<string, PromptTemplateDef> = new Map();
  private compiledTemplates: Map<string, PromptTemplate> = new Map();
  
  constructor(private promptsDir: string) {}
  
  /**
   * 加载所有Prompt模板
   */
  async loadAllTemplates(): Promise<void> {
    try {
      const files = await fs.readdir(this.promptsDir);
      
      for (const file of files) {
        if (file.endsWith('.ts') || file.endsWith('.js')) {
          await this.loadTemplate(file);
        }
      }
      
      logger.info(`加载了 ${this.templates.size} 个Prompt模板`);
    } catch (error) {
      logger.error('加载Prompt模板失败:', error);
      throw error;
    }
  }
  
  /**
   * 加载单个Prompt模板
   */
  private async loadTemplate(filename: string): Promise<void> {
    try {
      const filePath = path.join(this.promptsDir, filename);
      const module = await import(filePath);
      
      if (module.default && this.isValidTemplate(module.default)) {
        const template = module.default;
        this.templates.set(template.name, template);
        
        // 编译模板
        const compiled = PromptTemplate.fromTemplate(template.template);
        this.compiledTemplates.set(template.name, compiled);
        
        logger.debug(`加载Prompt模板: ${template.name}`);
      }
    } catch (error) {
      logger.error(`加载Prompt模板 ${filename} 失败:`, error);
    }
  }
  
  /**
   * 验证模板格式
   */
  private isValidTemplate(template: any): template is PromptTemplateDef {
    return (
      template &&
      typeof template.name === 'string' &&
      typeof template.template === 'string' &&
      typeof template.description === 'string' &&
      Array.isArray(template.variables) &&
      typeof template.version === 'string'
    );
  }
  
  /**
   * 获取模板
   */
  getTemplate(name: string): PromptTemplateDef | undefined {
    return this.templates.get(name);
  }
  
  /**
   * 获取编译后的模板
   */
  getCompiledTemplate(name: string): PromptTemplate | undefined {
    return this.compiledTemplates.get(name);
  }
  
  /**
   * 渲染模板
   */
  async renderTemplate(name: string, variables: Record<string, any>): Promise<string> {
    const template = this.getCompiledTemplate(name);
    
    if (!template) {
      throw new Error(`模板不存在: ${name}`);
    }
    
    return await template.format(variables);
  }
  
  /**
   * 添加模板
   */
  addTemplate(template: PromptTemplateDef): void {
    this.templates.set(template.name, template);
    
    // 编译模板
    const compiled = PromptTemplate.fromTemplate(template.template);
    this.compiledTemplates.set(template.name, compiled);
    
    logger.info(`添加Prompt模板: ${template.name}`);
  }
  
  /**
   * 获取所有模板
   */
  getAllTemplates(): PromptTemplateDef[] {
    return Array.from(this.templates.values());
  }
  
  /**
   * 检查变量是否完整
   */
  validateVariables(name: string, variables: Record<string, any>): string[] {
    const template = this.getTemplate(name);
    if (!template) {
      return [`模板不存在: ${name}`];
    }
    
    const missing: string[] = [];
    
    for (const variable of template.variables) {
      if (!(variable in variables)) {
        missing.push(variable);
      }
    }
    
    return missing;
  }
}

/**
 * 默认Prompt管理器实例
 */
let defaultPromptManager: PromptManager | null = null;

export function getPromptManager(promptsDir?: string): PromptManager {
  if (!defaultPromptManager) {
    const dir = promptsDir || path.join(__dirname, 'prompts');
    defaultPromptManager = new PromptManager(dir);
  }
  return defaultPromptManager;
}