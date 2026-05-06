import fs from 'fs/promises';
import path from 'path';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { v4 as uuidv4 } from 'uuid';

import { IResumeParser, ResumeParserConfig } from './interfaces';
import { ResumeData } from '@/types';
import { IAIService } from '../ai-layer/interfaces';
import logger from '@/utils/logger';
import { Errors } from '@/utils/errors';

export class ResumeParser implements IResumeParser {
  private config: ResumeParserConfig;
  private aiService: IAIService;

  constructor(config: ResumeParserConfig, aiService: IAIService) {
    this.config = config;
    this.aiService = aiService;
  }

  supportedFormats(): string[] {
    return this.config.supportedFormats;
  }

  validateFileType(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return this.config.supportedFormats.includes(ext);
  }

  async parse(filePath: string): Promise<ResumeData> {
    try {
      // 验证文件类型
      if (!this.validateFileType(filePath)) {
        throw Errors.FILE_TYPE_NOT_SUPPORTED(this.supportedFormats());
      }

      // 检查文件大小
      const stats = await fs.stat(filePath);
      if (stats.size > this.config.maxFileSize) {
        throw Errors.FILE_TOO_LARGE(this.config.maxFileSize);
      }

      // 提取文本内容
      const text = await this.extractText(filePath);
      
      // 使用AI解析结构化数据
      const parsedData = await this.aiService.parseResumeText(text);
      
      // 构建完整的简历数据
      const resumeData: ResumeData = {
        id: uuidv4(),
        name: parsedData.name || '未知',
        email: parsedData.email || '',
        phone: parsedData.phone,
        education: parsedData.education || [],
        experience: parsedData.experience || [],
        skills: parsedData.skills || [],
        projects: [],
        summary: parsedData.summary,
        rawText: text,
        filePath,
        createdAt: new Date(),
      };

      logger.info(`简历解析成功: ${resumeData.name}`);
      return resumeData;
    } catch (error) {
      logger.error('简历解析失败:', error);
      if (error instanceof Error && error.name === 'BusinessError') {
        throw error;
      }
      throw Errors.RESUME_PARSE_FAILED(error instanceof Error ? error.message : '未知错误');
    }
  }

  private async extractText(filePath: string): Promise<string> {
    const ext = path.extname(filePath).toLowerCase();
    
    switch (ext) {
      case '.pdf':
        return await this.extractTextFromPDF(filePath);
      case '.docx':
        return await this.extractTextFromDOCX(filePath);
      case '.txt':
        return await this.extractTextFromTXT(filePath);
      default:
        throw Errors.FILE_TYPE_NOT_SUPPORTED(this.supportedFormats());
    }
  }

  private async extractTextFromPDF(filePath: string): Promise<string> {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdf(dataBuffer);
      return data.text;
    } catch (error) {
      logger.error('PDF解析失败:', error);
      throw Errors.RESUME_PARSE_FAILED('PDF文件解析失败');
    }
  }

  private async extractTextFromDOCX(filePath: string): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch (error) {
      logger.error('DOCX解析失败:', error);
      throw Errors.RESUME_PARSE_FAILED('DOCX文件解析失败');
    }
  }

  private async extractTextFromTXT(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      logger.error('TXT读取失败:', error);
      throw Errors.RESUME_PARSE_FAILED('TXT文件读取失败');
    }
  }

  /**
   * 批量解析简历
   */
  async parseBatch(filePaths: string[]): Promise<ResumeData[]> {
    const results: ResumeData[] = [];
    
    for (const filePath of filePaths) {
      try {
        const resume = await this.parse(filePath);
        results.push(resume);
      } catch (error) {
        logger.error(`批量解析失败 ${filePath}:`, error);
        // 继续处理其他文件
      }
    }
    
    return results;
  }

  /**
   * 清理临时文件
   */
  async cleanup(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      logger.info(`清理临时文件: ${filePath}`);
    } catch (error) {
      logger.warn(`清理文件失败 ${filePath}:`, error);
    }
  }
}