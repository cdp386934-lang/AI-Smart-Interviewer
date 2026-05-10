import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { container } from '@/container';

export const interviewRouter = Router();

interviewRouter.post('/start', async (req, res) => {
  const { resume, jobDescription = '', companyName = '', focusSkills = [], userId = 'demo-user' } = req.body || {};
  const sessionManager = container.getSessionManager();
  const interviewEngine = container.getInterviewEngine();

  const session = await sessionManager.create({
    jobTitle: resume?.basicInfo?.targetPosition || '未命名岗位',
    jobLevel: 'mid',
    difficulty: 'medium',
    duration: 60,
    focusAreas: Array.isArray(focusSkills) ? focusSkills : [],
    userId,
    resume,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  } as any);

  (session.config as any).jobDescription = jobDescription;
  (session.config as any).companyName = companyName;
  (session.config as any).focusSkills = focusSkills;
  await sessionManager.updateSession(session as any);

  const firstQuestion = await interviewEngine.initializeInterview(session as any);
  await sessionManager.addMessage(session.id, {
    id: uuidv4(),
    role: 'assistant',
    content: firstQuestion.content,
    timestamp: new Date(),
    metadata: { questionType: firstQuestion.type },
  } as any);

  res.json({
    sessionId: session.id,
    stage: session.stage,
    firstQuestion,
  });
});

interviewRouter.get('/history', (_req, res) => res.json({ interviews: [], total: 0 }));
interviewRouter.get('/:id', (_req, res) => res.json({ interview: null }));
interviewRouter.get('/:id/report', (_req, res) => res.json({ report: null }));
interviewRouter.delete('/:id', (_req, res) => res.json({ success: true }));
