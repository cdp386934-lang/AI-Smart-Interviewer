import type { NextFunction, Request, Response } from 'express';

export const authMiddleware = (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  const header = req.headers.authorization || '';
  const token = header.toString().replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing token', timestamp: new Date().toISOString(), path: req.path });
  req.user = { id: token.startsWith('user-') ? token : 'demo-user', email: 'demo@example.com' };
  next();
};
