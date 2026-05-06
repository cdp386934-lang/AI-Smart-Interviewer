export * from './interfaces';
export * from './interview-state-machine';
export * from './session-serializer';
export * from './long-term-message.store';
export * from './legacy-session.storage';
export * from './session.manager';

import type { ISessionManager } from './interfaces';
import type { ILegacySessionStorage } from './legacy-session.storage';

/** 同时实现状态机会话与旧版 REST 存储 */
export type AppSessionManager = ISessionManager & ILegacySessionStorage;
