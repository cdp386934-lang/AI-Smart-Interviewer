import { z } from 'zod';

/**
 * 简历数据验证Schema
 */

// 基础信息Schema
export const basicInfoSchema = z.object({
  name: z.string().min(1, '姓名不能为空'),
  email: z.string().email('邮箱格式不正确'),
  phone: z.string().optional(),
  location: z.string().optional(),
  currentPosition: z.string().optional(),
  summary: z.string().optional(),
  links: z.object({
    linkedin: z.string().url().optional(),
    github: z.string().url().optional(),
    portfolio: z.string().url().optional(),
  }).optional(),
});

// 教育经历Schema
export const educationSchema = z.object({
  institution: z.string().min(1, '学校名称不能为空'),
  degree: z.string().min(1, '学位不能为空'),
  field: z.string().min(1, '专业不能为空'),
  startDate: z.string().regex(/^\d{4}-\d{2}$/, '开始时间格式应为YYYY-MM'),
  endDate: z.string().regex(/^\d{4}-\d{2}$/, '结束时间格式应为YYYY-MM').optional(),
  gpa: z.number().min(0).max(4.0).optional(),
  honors: z.array(z.string()).optional(),
  description: z.string().optional(),
});

// 工作经历Schema
export const workExperienceSchema = z.object({
  company: z.string().min(1, '公司名称不能为空'),
  position: z.string().min(1, '职位不能为空'),
  location: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}$/, '开始时间格式应为YYYY-MM'),
  endDate: z.string().regex(/^\d{4}-\d{2}$/, '结束时间格式应为YYYY-MM').optional(),
  description: z.string().min(1, '工作描述不能为空'),
  achievements: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  isCurrent: z.boolean().optional(),
});

// 项目经历Schema
export const projectSchema = z.object({
  name: z.string().min(1, '项目名称不能为空'),
  description: z.string().min(1, '项目描述不能为空'),
  technologies: z.array(z.string()).optional(),
  role: z.string().optional(),
  duration: z.string().optional(),
  link: z.string().url().optional(),
  achievements: z.array(z.string()).optional(),
});

// 技能项Schema
export const skillItemSchema = z.object({
  name: z.string().min(1, '技能名称不能为空'),
  level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  years: z.number().min(0).optional(),
  lastUsed: z.string().regex(/^\d{4}-\d{2}$/, '最后使用时间格式应为YYYY-MM').optional(),
});

// 证书Schema
export const certificationSchema = z.object({
  name: z.string().min(1, '证书名称不能为空'),
  issuer: z.string().min(1, '颁发机构不能为空'),
  date: z.string().regex(/^\d{4}-\d{2}$/, '获得时间格式应为YYYY-MM'),
  expiryDate: z.string().regex(/^\d{4}-\d{2}$/, '过期时间格式应为YYYY-MM').optional(),
  credentialId: z.string().optional(),
});

// 技能分类Schema
export const skillsSchema = z.object({
  programming: z.array(skillItemSchema).optional(),
  frameworks: z.array(skillItemSchema).optional(),
  tools: z.array(skillItemSchema).optional(),
  languages: z.array(skillItemSchema).optional(),
  softSkills: z.array(skillItemSchema).optional(),
  certifications: z.array(certificationSchema).optional(),
});

// 结构化简历Schema
export const structuredResumeSchema = z.object({
  basicInfo: basicInfoSchema,
  education: z.array(educationSchema).optional(),
  workExperience: z.array(workExperienceSchema).optional(),
  projects: z.array(projectSchema).optional(),
  skills: skillsSchema.optional(),
  rawText: z.string().min(1, '原始文本不能为空'),
  extractedAt: z.string().datetime().optional(),
  sourceFile: z.object({
    filename: z.string(),
    mimetype: z.string(),
    size: z.number(),
  }).optional(),
  metadata: z.object({
    confidence: z.number().min(0).max(1),
    extractionMethod: z.enum(['ai', 'fallback']),
    processingTime: z.number(),
  }).optional(),
});

// 优化建议Schema
export const optimizationSuggestionSchema = z.object({
  category: z.enum(['basic_info', 'education', 'experience', 'skills', 'projects', 'summary']),
  priority: z.enum(['high', 'medium', 'low']),
  issue: z.string().min(1, '问题描述不能为空'),
  suggestion: z.string().min(1, '修改建议不能为空'),
  example: z.string().optional(),
  impact: z.string().optional(),
});

// 优化结果Schema
export const optimizationResultSchema = z.object({
  resumeId: z.string().min(1, '简历ID不能为空'),
  jobDescription: z.string().min(1, '职位描述不能为空'),
  suggestions: z.array(optimizationSuggestionSchema),
  overallScore: z.number().min(0).max(100),
  generatedAt: z.string().datetime(),
});

// 文件验证Schema
export const resumeFileSchema = z.object({
  buffer: z.instanceof(Buffer),
  filename: z.string().min(1, '文件名不能为空'),
  mimetype: z.enum([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]),
  size: z.number().min(1, '文件大小必须大于0'),
});

// 类型导出
export type BasicInfo = z.infer<typeof basicInfoSchema>;
export type Education = z.infer<typeof educationSchema>;
export type WorkExperience = z.infer<typeof workExperienceSchema>;
export type Project = z.infer<typeof projectSchema>;
export type SkillItem = z.infer<typeof skillItemSchema>;
export type Certification = z.infer<typeof certificationSchema>;
export type Skills = z.infer<typeof skillsSchema>;
export type StructuredResume = z.infer<typeof structuredResumeSchema>;
export type OptimizationSuggestion = z.infer<typeof optimizationSuggestionSchema>;
export type OptimizationResult = z.infer<typeof optimizationResultSchema>;
export type ResumeFile = z.infer<typeof resumeFileSchema>;