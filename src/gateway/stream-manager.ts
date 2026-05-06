import type { IStreamManager } from './types';

export class StreamManager implements IStreamManager {
  private active = new Map<string, Set<string>>();
  startStream(userId: string, streamId: string, generator: AsyncGenerator<string>): void { const set = this.active.get(userId) ?? new Set<string>(); set.add(streamId); this.active.set(userId, set); void (async () => { for await (const _chunk of generator) { if (!set.has(streamId)) break; } set.delete(streamId); })(); }
  stopStream(userId: string, streamId: string): void { this.active.get(userId)?.delete(streamId); }
  getActiveStreams(userId: string): string[] { return [...(this.active.get(userId) ?? new Set())]; }
}
