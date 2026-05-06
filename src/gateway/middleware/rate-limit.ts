import type { HandlerContext } from '../types';
export const wsRateLimit = (_opts: { limit: number; windowMs: number }) => async (_context: HandlerContext, _payload: any) => undefined;
