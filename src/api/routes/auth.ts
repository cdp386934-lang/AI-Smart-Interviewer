import { Router } from 'express';

export const authRouter = Router();

authRouter.post('/login', (req, res) => { res.json({ token: 'mock-token', user: { id: 'u1', email: req.body.email, name: 'Demo User' } }); });
authRouter.post('/refresh', (_req, res) => { res.json({ token: 'mock-token' }); });
