import type { IncomingMessage } from 'http';
import type WebSocket from 'ws';

export const wsAuthMiddleware = (_ws: WebSocket, req: IncomingMessage) => {
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const token = url.searchParams.get('token') || req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new Error('Unauthorized');
  return { userId: token.slice(0, 8) };
};
