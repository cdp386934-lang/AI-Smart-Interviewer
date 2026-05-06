import pino from 'pino';
import config from '@/config';

// 创建logger实例
const logger = pino({
  level: config.env === 'production' ? 'info' : 'debug',
  transport: config.env === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  } : undefined,
  serializers: {
    error: pino.stdSerializers.err,
  },
  base: {
    env: config.env,
    pid: process.pid,
  },
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
});

// 导出logger实例
export default logger;

// 创建子logger
export const createChildLogger = (context: Record<string, any>) => {
  return logger.child(context);
};

// 请求日志中间件
export const requestLogger = (req: any, res: any, next: any) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };
    
    if (res.statusCode >= 400) {
      logger.warn(logData, '请求处理失败');
    } else {
      logger.info(logData, '请求处理完成');
    }
  });
  
  next();
};