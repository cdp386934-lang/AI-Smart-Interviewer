import type { ClientEvents, HandlerContext, HandlerOptions, IMessageRouter, MessageHandler } from './types';

export class MessageRouter implements IMessageRouter {
  private handlers = new Map<string, { handler: MessageHandler<any>; options?: HandlerOptions }>();
  register<T extends keyof ClientEvents>(event: T, handler: MessageHandler<T>, options?: HandlerOptions): void { this.handlers.set(event, { handler, options }); }
  async dispatch(userId: string, event: string, payload: any): Promise<void> { const entry = this.handlers.get(event); if (!entry) return; await entry.handler({ userId, ws: payload.ws, sessionId: payload.sessionId, timestamp: Date.now() }, payload); }
}
