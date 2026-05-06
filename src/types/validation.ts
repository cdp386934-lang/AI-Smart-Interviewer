/**
 * 验证类型定义
 */

import { z } from 'zod';

// 文件上传验证
export const fileUploadSchema = z.object({
  fieldname: z.string(),
  originalname: z.string(),
  encoding: z.string(),
  mimetype: z.string(),
  size: z.number().positive(),
  destination: z.string(),
  filename: z.string(),
  path: z.string(),
});

export type FileUpload = z.infer<typeof fileUploadSchema>;

// WebSocket连接验证
export const wsConnectSchema = z.object({
  sessionId: z.string().min(1, '会话ID不能为空'),
  userId: z.string().min(1, '用户ID不能为空'),
});

export type WSConnectParams = z.infer<typeof wsConnectSchema>;

// 简历上传验证
export const resumeUploadSchema = z.object({
  candidateId: z.string().min(1, '候选人ID不能为空'),
  position: z.string().min(1, '职位不能为空'),
});

export type ResumeUploadParams = z.infer<typeof resumeUploadSchema>;

// 会话创建验证
export const sessionCreateSchema = z.object({
  candidateId: z.string().min(1, '候选人ID不能为空'),
  resumeId: z.string().min(1, '简历ID不能为空'),
  position: z.string().min(1, '职位不能为空'),
  questionCount: z.number().min(1).max(50).default(10),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
});

export type SessionCreateParams = z.infer<typeof sessionCreateSchema>;

// WebSocket消息验证
export const wsMessageSchema = z.object({
  type: z.enum(['connect', 'disconnect', 'message', 'error', 'heartbeat']),
  sessionId: z.string().optional(),
  userId: z.string().optional(),
  data: z.any(),
  timestamp: z.string().datetime(),
});

export type WSMessage = z.infer<typeof wsMessageSchema>;