import { BusinessError } from '@/types';
import logger from './logger';

export class ErrorHandler {
  static handle(error: Error): { statusCode: number; message: string } {
    logger.error(error);
    
    if (error instanceof BusinessError) {
      return {
        statusCode: error.statusCode,
        message: error.message,
      };
    }
    
    // 处理已知错误类型
    if (error.name === 'ValidationError') {
      return {
        statusCode: 400,
        message: '请求数据验证失败',
      };
    }
    
    if (error.name === 'UnauthorizedError') {
      return {
        statusCode: 401,
        message: '未授权访问',
      };
    }
    
    if (error.name === 'NotFoundError') {
      return {
        statusCode: 404,
        message: '资源未找到',
      };
    }
    
    // 默认错误
    return {
      statusCode: 500,
      message: process.env.NODE_ENV === 'production' 
        ? '服务器内部错误' 
        : error.message,
    };
  }
  
  static createError(code: string, message: string, statusCode: number = 400): BusinessError {
    return new BusinessError(code, message, statusCode);
  }
}

// 常用错误
export const Errors = {
  // 简历解析错误
  RESUME_PARSE_FAILED: (details: string) => 
    ErrorHandler.createError('RESUME_PARSE_FAILED', `简历解析失败: ${details}`),
  
  // 文件错误
  FILE_TOO_LARGE: (maxSize: number) =>
    ErrorHandler.createError('FILE_TOO_LARGE', `文件大小超过限制: ${maxSize} bytes`, 413),
  
  FILE_TYPE_NOT_SUPPORTED: (supportedTypes: string[]) =>
    ErrorHandler.createError('FILE_TYPE_NOT_SUPPORTED', `不支持的文件类型，支持的类型: ${supportedTypes.join(', ')}`),
  
  // 会话错误
  SESSION_NOT_FOUND: (sessionId: string) =>
    ErrorHandler.createError('SESSION_NOT_FOUND', `会话不存在: ${sessionId}`, 404),
  
  SESSION_ALREADY_COMPLETED: (sessionId: string) =>
    ErrorHandler.createError('SESSION_ALREADY_COMPLETED', `会话已结束: ${sessionId}`, 400),
  
  // AI 错误
  AI_SERVICE_UNAVAILABLE: () =>
    ErrorHandler.createError('AI_SERVICE_UNAVAILABLE', 'AI 服务暂时不可用', 503),
  
  // 认证错误
  UNAUTHORIZED: () =>
    ErrorHandler.createError('UNAUTHORIZED', '未授权访问', 401),
  
  INVALID_TOKEN: () =>
    ErrorHandler.createError('INVALID_TOKEN', '无效的认证令牌', 401),
};