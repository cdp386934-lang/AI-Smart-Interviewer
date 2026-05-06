import { z, ZodSchema } from 'zod';

/**
 * 简历解析器接口
 */
export interface IResumeParser {
  // 解析简历文件 → 原始文本
  extractText(file: ResumeFile): Promise<string>;
  
  // 原始文本 → 结构化 JSON（调用 AI 层）
  parseToStructured(text: string, options?: ParseOptions): Promise<StructuredResume>;
  
  // 简历优化建议（基于目标岗位）
  optimize(resume: StructuredResume, jobDescription: string): Promise<OptimizationResult>;
  
  // 批量解析
  parseBatch(files: ResumeFile[]): Promise<StructuredResume[]>;
  
  // 验证文件格式
  validateFile(file: ResumeFile): Promise<ValidationResult>;
}

/**
 * 简历文件
 */
export interface ResumeFile {
  buffer: Buffer;
  filename: string;
  mimetype: 'application/pdf' | 'application/msword' | 
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document' |
            'text/plain';
  size: number;
}

/**
 * 解析选项
 */
export interface ParseOptions {
  language?: 'zh' | 'en';
  extractKeywords?: boolean;
  validateStructure?: boolean;
  timeout?: number;
}

/**
 * 基础信息
 */
export interface BasicInfo {
  name: string;
  email: string;
  phone?: string;
  location?: string;
  currentPosition?: string;
  summary?: string;
  links?: {
    linkedin?: string;
    github?: string;
    portfolio?: string;
  };
}

/**
 * 教育经历
 */
export interface Education {
  institution: string;
  degree: string;
  field: string;
  startDate: string; // YYYY-MM
  endDate?: string; // YYYY-MM
  gpa?: number;
  honors?: string[];
  description?: string;
}

/**
 * 工作经历
 */
export interface WorkExperience {
  company: string;
  position: string;
  location?: string;
  startDate: string; // YYYY-MM
  endDate?: string; // YYYY-MM
  description: string;
  achievements?: string[];
  skills: string[];
  isCurrent?: boolean;
}

/**
 * 项目经历
 */
export interface Project {
  name: string;
  description: string;
  technologies: string[];
  role: string;
  duration: string;
  link?: string;
  achievements?: string[];
}

/**
 * 技能分类
 */
export interface Skills {
  programming: SkillItem[];
  frameworks: SkillItem[];
  tools: SkillItem[];
  languages: SkillItem[];
  softSkills: SkillItem[];
  certifications: Certification[];
}

export interface SkillItem {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  years?: number;
  lastUsed?: string; // YYYY-MM
}

export interface Certification {
  name: string;
  issuer: string;
  date: string; // YYYY-MM
  expiryDate?: string; // YYYY-MM
  credentialId?: string;
}

/**
 * 结构化简历
 */
export interface StructuredResume {
  id?: string;
  userId?: string;
  basicInfo: BasicInfo;
  education: Education[];
  workExperience: WorkExperience[];
  projects: Project[];
  skills: Skills;
  rawText: string;
  extractedAt: Date;
  sourceFile?: {
    filename: string;
    mimetype: string;
    size: number;
  };
  metadata?: {
    confidence: number;
    extractionMethod: 'ai' | 'fallback';
    processingTime: number;
  };
}

/**
 * 优化结果
 */
export interface OptimizationResult {
  resumeId: string;
  jobDescription: string;
  suggestions: OptimizationSuggestion[];
  overallScore: number;
  generatedAt: Date;
}

export interface OptimizationSuggestion {
  category: 'basic_info' | 'education' | 'experience' | 'skills' | 'projects' | 'summary';
  priority: 'high' | 'medium' | 'low';
  issue: string;
  suggestion: string;
  example?: string;
  impact: string;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileType: string;
  fileSize: number;
  maxSize: number;
}

/**
 * 解析配置
 */
export interface ResumeParserConfig {
  maxFileSize: number;
  supportedFormats: string[];
  uploadDir: string;
  cacheTTL: number; // 缓存时间（小时）
  enableCache: boolean;
  enableFallback: boolean;
  aiModel?: string;
  timeout: number;
}

/**
 * 缓存键
 */
export interface CacheKeys {
  resumeText: (fileHash: string) => string;
  structuredResume: (resumeId: string) => string;
  optimization: (resumeId: string, jobDescriptionHash: string) => string;
}