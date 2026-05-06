import { Router } from 'express';

export const resumeRouter = Router();
resumeRouter.post('/upload', (_req, res) => res.json({ id: 'r1', status: 'completed', structured: { basicInfo: { name: 'Demo', phone: '', email: '', targetPosition: 'FE' }, education: [], workExperience: [], projects: [], skills: { proficient: [], familiar: [] }, rawText: 'demo' } }));
resumeRouter.get('/:id', (_req, res) => res.json({ resume: { basicInfo: { name: 'Demo', phone: '', email: '', targetPosition: 'FE' }, education: [], workExperience: [], projects: [], skills: { proficient: [], familiar: [] }, rawText: 'demo' }, rawText: 'demo' }));
resumeRouter.post('/:id/optimize', (_req, res) => res.json({ suggestions: [] }));
resumeRouter.get('/:id/download', (_req, res) => res.send('PDF'));
