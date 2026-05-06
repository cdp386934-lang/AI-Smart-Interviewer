import type { HandlerContext, ClientEvents, IConnectionManager } from '../types';

export class AuthHandler {
  constructor(private connectionManager: IConnectionManager) {}

  async handleAuth(context: HandlerContext, _payload: ClientEvents['auth']): Promise<void> {
    this.connectionManager.register(context.ws, context.userId);
    context.ws.send(JSON.stringify({ event: 'auth:result', data: { success: true, userId: context.userId }, timestamp: new Date().toISOString() }));
  }
}
