import type { HandlerContext, ClientEvents } from '../types';

export class HeartbeatHandler {
  async handlePing(context: HandlerContext, payload: ClientEvents['ping']): Promise<void> {
    context.ws.send(JSON.stringify({ event: 'pong', data: { timestamp: payload.timestamp, serverTime: Date.now() }, timestamp: new Date().toISOString(), userId: context.userId }));
  }
}
