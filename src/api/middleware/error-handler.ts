import type { NextFunction, Request, Response } from 'express';
export const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => { res.status(err.status || 500).json({ code: err.code || 'INTERNAL_ERROR', message: err.message || 'Server error', timestamp: new Date().toISOString(), path: req.path }); };
