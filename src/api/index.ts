import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authRouter } from './routes/auth';
import { resumeRouter } from './routes/resume';
import { jobsRouter } from './routes/jobs';
import { interviewRouter } from './routes/interview';
import { errorHandler } from './middleware/error-handler';

export function createApiApp() {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.use('/api/resume', resumeRouter);
  app.use('/api/jobs', jobsRouter);
  app.use('/api/interview', interviewRouter);
  app.use(errorHandler);
  return app;
}
