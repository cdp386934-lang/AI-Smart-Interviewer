import { Router } from 'express';
export const interviewRouter = Router();
interviewRouter.get('/history', (_req, res) => res.json({ interviews: [], total: 0 }));
interviewRouter.get('/:id', (_req, res) => res.json({ interview: null }));
interviewRouter.get('/:id/report', (_req, res) => res.json({ report: null }));
interviewRouter.delete('/:id', (_req, res) => res.json({ success: true }));
