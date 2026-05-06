import type { NextFunction, Request, Response } from 'express';

export const rateLimitMiddleware = (_opts: { limit: number; windowMs: number }) => (req: Request, res: Response, next: NextFunction) => next();
