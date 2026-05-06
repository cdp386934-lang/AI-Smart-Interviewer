import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

import config from '@/config';
import { container } from './container';
import { IResumeParser } from './modules/resume-parser/interfaces';
import { IInterviewEngine } from './modules/interview-engine/interfaces';
import { ISessionManager } from './modules/session-manager/interfaces';
import { ApiResponse, ResumeData } from './types';
import logger from './utils/logger';
import { ErrorHandler, Errors } from './utils/errors';

export class Server {
  private app: express.Application;
  private upload: multer.Multer;

  constructor() {
    this.app = express();
    this.upload = this.configureUpload();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private configureUpload(): multer.Multer {
    // 确保上传目录存在
    const uploadDir = config.upload.dir;
    fs.mkdir(uploadDir, { recursive: true }).catch(error => {
      logger.warn(`创建上传目录失败: ${error.message}`);
    });

    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
      },
    });

    return multer({
      storage,
      limits: {
        fileSize: config.upload.maxFileSize,
      },
      fileFilter: (req, file, cb) => {
        const resumeParser = container.getResumeParser();
        const ext = path.extname(file.originalname).toLowerCase();
        
        if (resumeParser.supportedFormats().includes(ext)) {
          cb(null, true);
        } else {
          cb(new Error('不支持的文件类型'));
        }
      },
    });
  }

  private setupMiddleware(): void {
    // 安全中间件
    this.app.use(helmet());
    
    // CORS配置
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://your-frontend-domain.com'] 
        : ['http://localhost:3000', 'http://localhost:5173'],
      credentials: true,
    }));
    
    // JSON解析
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // 请求日志
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.url} - ${req.ip}`);
      next();
    });
  }

  private setupRoutes(): void {
    const router = express.Router();
    
    // 健康检查
    router.get('/health', async (req, res) => {
      try {
        const health = await container.healthCheck();
        const response: ApiResponse = {
          success: true,
          data: health,
          timestamp: new Date().toISOString(),
        };
        res.json(response);
      } catch (error) {
        const response: ApiResponse = {
          success: false,
          error: '健康检查失败',
          timestamp: new Date().toISOString(),
        };
        res.status(500).json(response);
      }
    });
    
    // 简历上传和解析
    router.post('/resumes/upload', this.upload.single('resume'), async (req, res) => {
      try {
        if (!req.file) {
          throw Errors.createError('NO_FILE', '请上传文件', 400);
        }
        
        const resumeParser = container.getResumeParser();
        const resume = await resumeParser.parse(req.file.path);
        
        // 保存简历数据
        const sessionManager = container.getSessionManager();
        await sessionManager.saveResume(resume);
        
        // 清理临时文件
        await resumeParser.cleanup(req.file.path);
        
        const response: ApiResponse<ResumeData> = {
          success: true,
          data: resume,
          message: '简历解析成功',
          timestamp: new Date().toISOString(),
        };
        
        res.json(response);
      } catch (error) {
        const { statusCode, message } = ErrorHandler.handle(error);
        const response: ApiResponse = {
          success: false,
          error: message,
          timestamp: new Date().toISOString(),
        };
        res.status(statusCode).json(response);
      }
    });
    
    // 创建面试会话
    router.post('/sessions', async (req, res) => {
      try {
        const { candidateId, resumeId, position, questionCount, difficulty } = req.body;
        
        if (!candidateId || !resumeId || !position) {
          throw Errors.createError('MISSING_PARAMS', '缺少必要参数', 400);
        }
        
        const interviewEngine = container.getInterviewEngine();
        const sessionManager = container.getSessionManager();
        
        // 获取简历数据
        const resume = await sessionManager.getResume(resumeId);
        
        // 创建会话
        const session = await interviewEngine.createSession(
          candidateId,
          resume,
          position,
          questionCount || 10,
          difficulty || 'medium'
        );
        
        const response: ApiResponse = {
          success: true,
          data: session,
          message: '面试会话创建成功',
          timestamp: new Date().toISOString(),
        };
        
        res.json(response);
      } catch (error) {
        const { statusCode, message } = ErrorHandler.handle(error);
        const response: ApiResponse = {
          success: false,
          error: message,
          timestamp: new Date().toISOString(),
        };
        res.status(statusCode).json(response);
      }
    });
    
    // 获取会话状态
    router.get('/sessions/:sessionId', async (req, res) => {
      try {
        const { sessionId } = req.params;
        
        const interviewEngine = container.getInterviewEngine();
        const session = await interviewEngine.getSessionStatus(sessionId);
        
        const response: ApiResponse = {
          success: true,
          data: session,
          timestamp: new Date().toISOString(),
        };
        
        res.json(response);
      } catch (error) {
        const { statusCode, message } = ErrorHandler.handle(error);
        const response: ApiResponse = {
          success: false,
          error: message,
          timestamp: new Date().toISOString(),
        };
        res.status(statusCode).json(response);
      }
    });
    
    // 获取用户的所有会话
    router.get('/users/:userId/sessions', async (req, res) => {
      try {
        const { userId } = req.params;
        
        const sessionManager = container.getSessionManager();
        const sessions = await sessionManager.getUserSessions(userId);
        
        const response: ApiResponse = {
          success: true,
          data: sessions,
          timestamp: new Date().toISOString(),
        };
        
        res.json(response);
      } catch (error) {
        const { statusCode, message } = ErrorHandler.handle(error);
        const response: ApiResponse = {
          success: false,
          error: message,
          timestamp: new Date().toISOString(),
        };
        res.status(statusCode).json(response);
      }
    });
    
    // 完成会话并获取反馈
    router.post('/sessions/:sessionId/complete', async (req, res) => {
      try {
        const { sessionId } = req.params;
        
        const interviewEngine = container.getInterviewEngine();
        const feedback = await interviewEngine.completeSession(sessionId);
        
        const response: ApiResponse = {
          success: true,
          data: feedback,
          message: '面试反馈生成成功',
          timestamp: new Date().toISOString(),
        };
        
        res.json(response);
      } catch (error) {
        const { statusCode, message } = ErrorHandler.handle(error);
        const response: ApiResponse = {
          success: false,
          error: message,
          timestamp: new Date().toISOString(),
        };
        res.status(statusCode).json(response);
      }
    });
    
    // 获取会话统计
    router.get('/sessions/:sessionId/stats', async (req, res) => {
      try {
        const { sessionId } = req.params;
        
        const interviewEngine = container.getInterviewEngine();
        const stats = await (interviewEngine as any).getSessionStats(sessionId);
        
        const response: ApiResponse = {
          success: true,
          data: stats,
          timestamp: new Date().toISOString(),
        };
        
        res.json(response);
      } catch (error) {
        const { statusCode, message } = ErrorHandler.handle(error);
        const response: ApiResponse = {
          success: false,
          error: message,
          timestamp: new Date().toISOString(),
        };
        res.status(statusCode).json(response);
      }
    });
    
    // WebSocket连接信息
    router.get('/ws/info', (req, res) => {
      const wsGateway = container.getWebSocketGateway();
      const stats = (wsGateway as any).getConnectionStats();
      
      const response: ApiResponse = {
        success: true,
        data: {
          wsPort: config.port + 1,
          wsPath: '/ws',
          connectionStats: stats,
        },
        timestamp: new Date().toISOString(),
      };
      
      res.json(response);
    });
    
    // 将路由挂载到API前缀
    this.app.use(config.apiPrefix, router);
  }

  private setupErrorHandling(): void {
    // 404处理
    this.app.use((req, res) => {
      const response: ApiResponse = {
        success: false,
        error: '路由未找到',
        timestamp: new Date().toISOString(),
      };
      res.status(404).json(response);
    });
    
    // 全局错误处理
    this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('全局错误处理:', error);
      
      const { statusCode, message } = ErrorHandler.handle(error);
      const response: ApiResponse = {
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      };
      
      res.status(statusCode).json(response);
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      const server = this.app.listen(config.port, () => {
        logger.info(`REST API服务器启动在端口 ${config.port}`);
        logger.info(`API前缀: ${config.apiPrefix}`);
        logger.info(`环境: ${process.env.NODE_ENV || 'development'}`);
        resolve();
      });
      
      server.on('error', reject);
      
      // 优雅关闭
      process.on('SIGTERM', async () => {
        logger.info('收到SIGTERM信号，开始优雅关闭...');
        await this.shutdown();
        server.close(() => {
          logger.info('服务器已关闭');
          process.exit(0);
        });
      });
      
      process.on('SIGINT', async () => {
        logger.info('收到SIGINT信号，开始优雅关闭...');
        await this.shutdown();
        server.close(() => {
          logger.info('服务器已关闭');
          process.exit(0);
        });
      });
    });
  }

  private async shutdown(): Promise<void> {
    logger.info('开始关闭服务器...');
    await container.cleanup();
    logger.info('服务器关闭完成');
  }

  getApp(): express.Application {
    return this.app;
  }
}