import type { IncomingMessage } from 'http';
import type WebSocket from 'ws';
import type { InterviewSession, InterviewStage } from '../session-manager/interfaces';
import type { Evaluation, InterviewReport, Question } from '../interview-engine/interfaces';

export interface ClientEvents {
  auth: { token: string };
  'interview:start': { resumeId: string; jobId?: string; config?: any };
  'interview:answer': { content: string; questionId: string };
  'interview:voice': { audioBase64: string; questionId: string };
  'interview:pause': {};
  'interview:resume': {};
  'interview:end': { reason: 'user' | 'timeout' | 'completed' | 'error' };
  ping: { timestamp: number };
}

export interface ServerEvents {
  'auth:result': { success: boolean; userId?: string; error?: string };
  'interview:started': { sessionId: string; stage: InterviewStage; firstQuestion: Question; config: any };
  'interviewer:question': { question: Question; stage: InterviewStage; sequence: number };
  'interviewer:typing': { duration: number };
  'interviewer:stream': { chunk: string; done: boolean };
  'evaluation:realtime': { score: number; dimensions: Evaluation['dimensions']; feedback: string; followUpNeeded: boolean };
  'interview:stage_change': { from: InterviewStage; to: InterviewStage; reason: string };
  'interview:progress': { currentQuestion: number; totalQuestions: number; elapsedTime: number };
  'interview:ended': { report: InterviewReport; duration: number };
  'interview:paused': { remainingTime: number };
  'interview:resumed': {};
  error: { code: string; message: string; recoverable: boolean };
  pong: { timestamp: number; serverTime: number };
}

export interface WebSocketMessage<T = any> { event: keyof ClientEvents | keyof ServerEvents; data: T; timestamp: string; sessionId?: string; userId?: string }

export interface ConnectionStats { totalConnections: number; authenticatedConnections: number; activeInterviews: number; avgConnectionDuration: number }
export interface IConnectionManager { register(ws: WebSocket, userId: string): void; unregister(userId: string): void; getConnection(userId: string): WebSocket | undefined; send(userId: string, event: string, payload: any): boolean; broadcast(event: string, payload: any): void; isOnline(userId: string): boolean; getStats(): ConnectionStats }

export interface HandlerContext { userId: string; ws: WebSocket; sessionId?: string; timestamp: number }
export type MessageHandler<T extends keyof ClientEvents> = (context: HandlerContext, payload: ClientEvents[T]) => Promise<void>;
export interface HandlerOptions { requireAuth?: boolean; requireInterview?: boolean; rateLimit?: { limit: number; windowMs: number }; timeout?: number }
export interface IMessageRouter { register<T extends keyof ClientEvents>(event: T, handler: MessageHandler<T>, options?: HandlerOptions): void; dispatch(userId: string, event: string, payload: any): Promise<void> }

export interface IStreamManager { startStream(userId: string, streamId: string, generator: AsyncGenerator<string>): void; stopStream(userId: string, streamId: string): void; getActiveStreams(userId: string): string[] }

export interface WebSocketConnection { socket: WebSocket; sessionId: string; userId: string; connectedAt: Date; lastActivity: Date; authenticated: boolean; interviewSessionId?: string }
export interface WebSocketGatewayConfig { port: number; path: string; pingInterval: number; connectionTimeout: number; maxMessageSize: number; jwtSecret: string; enableReconnect: boolean; maxReconnectAttempts: number; reconnectDelay: number }
export interface MessagePipeline { validate: (message: any) => boolean; deserialize: (data: Buffer) => WebSocketMessage; route: (message: WebSocketMessage) => any; serialize: (message: WebSocketMessage) => string }

export class WebSocketError extends Error { constructor(public code: string, message: string, public statusCode = 400) { super(message); this.name = 'WebSocketError'; } }
