import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';

export const validate = (schema: ZodSchema<any>) => (req: Request, res: Response, next: NextFunction) => {
  const result = schema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ code: 'VALIDATION_ERROR', message: result.error.message, timestamp: new Date().toISOString(), path: req.path });
  req.body = result.data;
  next();
};
