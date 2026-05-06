import type Redis from 'ioredis';
import type WebSocket from 'ws';
import type { ConnectionStats, IConnectionManager } from './types';

export class ConnectionManager implements IConnectionManager {
  private connections = new Map<string, WebSocket>();
  private connectedAt = new Map<string, number>();
  constructor(private redis?: Redis, private maxPerUser = 2) {}

  register(ws: WebSocket, userId: string): void {
    const existing = this.redis ? undefined : this.connections.get(userId);
    if (existing && this.maxPerUser <= 1) return;
    this.connections.set(userId, ws);
    this.connectedAt.set(userId, Date.now());
    void this.redis?.set(`ws:user:${userId}`, '1', 'EX', 300);
  }

  unregister(userId: string): void {
    this.connections.delete(userId);
    this.connectedAt.delete(userId);
    void this.redis?.del(`ws:user:${userId}`);
  }

  getConnection(userId: string): WebSocket | undefined { return this.connections.get(userId); }
  send(userId: string, event: string, payload: any): boolean {
    const ws = this.connections.get(userId);
    if (!ws || ws.readyState !== 1) return false;
    ws.send(JSON.stringify({ event, data: payload, timestamp: new Date().toISOString(), userId }));
    return true;
  }
  broadcast(event: string, payload: any): void { for (const userId of this.connections.keys()) this.send(userId, event, payload); }
  isOnline(userId: string): boolean { return this.connections.has(userId); }
  getStats(): ConnectionStats {
    const durations = [...this.connectedAt.values()].map((t) => Date.now() - t);
    return { totalConnections: this.connections.size, authenticatedConnections: this.connections.size, activeInterviews: 0, avgConnectionDuration: durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0 };
  }
}
