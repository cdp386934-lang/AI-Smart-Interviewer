import { Router } from 'express';
export const jobsRouter = Router();
jobsRouter.get('/', (_req, res) => res.json({ jobs: [], total: 0 }));
jobsRouter.get('/:id', (_req, res) => res.json({ job: null }));
