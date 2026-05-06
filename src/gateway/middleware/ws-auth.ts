import type { IncomingMessage } from 'http';
import type WebSocket from 'ws';

export function wsAuthMiddleware(_ws: WebSocket, req: IncomingMessage) {
  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const token = url.searchParams.get('token') || String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('Unauthorized');
  return { userId: token.startsWith('user-') ? token : 'demo-user' };
}
