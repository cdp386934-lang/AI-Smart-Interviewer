import { ResumeData } from '@/types';

/**
 * 简历解析器接口
 */
export interface IResumeParser {
  /**
   * 解析简历文件
   */
  parse(filePath: string): Promise<ResumeData>;
  
  /**
   * 支持的文件类型
   */
  supportedFormats(): string[];
  
  /**
   * 验证文件类型
   */
  validateFileType(filePath: string): boolean;
}

/**
 * 简历解析配置
 */
export interface ResumeParserConfig {
  uploadDir: string;
  maxFileSize: number;
  supportedFormats: string[];
}