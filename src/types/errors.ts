/**
 * 错误类型定义
 */

// 基础错误代码
export enum ErrorCode {
  // 通用错误
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  
  // WebSocket错误
  WS_CONNECTION_FAILED = 'WS_CONNECTION_FAILED',
  WS_INVALID_MESSAGE = 'WS_INVALID_MESSAGE',
  WS_SESSION_NOT_FOUND = 'WS_SESSION_NOT_FOUND',
  
  // 文件错误
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  FILE_TYPE_NOT_SUPPORTED = 'FILE_TYPE_NOT_SUPPORTED',
  
  // 会话错误
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  SESSION_ALREADY_COMPLETED = 'SESSION_ALREADY_COMPLETED',
}

// 错误消息映射
export const ErrorMessages: Record<ErrorCode, string> = {
  [ErrorCode.VALIDATION_ERROR]: '请求数据验证失败',
  [ErrorCode.NOT_FOUND]: '资源未找到',
  [ErrorCode.UNAUTHORIZED]: '未授权访问',
  [ErrorCode.FORBIDDEN]: '禁止访问',
  [ErrorCode.INTERNAL_ERROR]: '服务器内部错误',
  
  [ErrorCode.WS_CONNECTION_FAILED]: 'WebSocket连接失败',
  [ErrorCode.WS_INVALID_MESSAGE]: '无效的WebSocket消息',
  [ErrorCode.WS_SESSION_NOT_FOUND]: 'WebSocket会话不存在',
  
  [ErrorCode.FILE_TOO_LARGE]: '文件大小超过限制',
  [ErrorCode.FILE_TYPE_NOT_SUPPORTED]: '不支持的文件类型',
  
  [ErrorCode.SESSION_NOT_FOUND]: '会话不存在',
  [ErrorCode.SESSION_EXPIRED]: '会话已过期',
  [ErrorCode.SESSION_ALREADY_COMPLETED]: '会话已结束',
};

// HTTP状态码映射
export const ErrorStatusCodes: Record<ErrorCode, number> = {
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.INTERNAL_ERROR]: 500,
  
  [ErrorCode.WS_CONNECTION_FAILED]: 400,
  [ErrorCode.WS_INVALID_MESSAGE]: 400,
  [ErrorCode.WS_SESSION_NOT_FOUND]: 404,
  
  [ErrorCode.FILE_TOO_LARGE]: 413,
  [ErrorCode.FILE_TYPE_NOT_SUPPORTED]: 400,
  
  [ErrorCode.SESSION_NOT_FOUND]: 404,
  [ErrorCode.SESSION_EXPIRED]: 410,
  [ErrorCode.SESSION_ALREADY_COMPLETED]: 400,
};