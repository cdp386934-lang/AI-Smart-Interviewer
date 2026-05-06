import type { IConnectionManager, HandlerContext, ClientEvents, IStreamManager } from '../types';
import type { ISessionManager, InterviewSession } from '../../session-manager/interfaces';
import type { IInterviewEngine } from '../../interview-engine/interfaces';

export class InterviewHandler {
  constructor(private sessionManager: ISessionManager, private interviewEngine: IInterviewEngine, private connectionManager: IConnectionManager, private streamManager: IStreamManager) {}
  async handleStart(context: HandlerContext, payload: ClientEvents['interview:start']): Promise<void> {
    const session = await this.sessionManager.get(payload.resumeId as any) as InterviewSession;
    const firstQuestion = await this.interviewEngine.initializeInterview(session);
    context.ws.send(JSON.stringify({ event: 'interview:started', data: { sessionId: session.id, stage: session.stage, firstQuestion, config: session.config }, timestamp: new Date().toISOString(), userId: context.userId }));
  }
  async handleAnswer(context: HandlerContext, payload: ClientEvents['interview:answer']): Promise<void> { const session = await this.sessionManager.get(context.sessionId!); if (!session) return; const evaluation = await this.interviewEngine.evaluateAnswer(session, payload.content); context.ws.send(JSON.stringify({ event: 'evaluation:realtime', data: { score: evaluation.score, dimensions: evaluation.dimensions, feedback: evaluation.feedback, followUpNeeded: evaluation.followUpNeeded }, timestamp: new Date().toISOString(), userId: context.userId })); }
  async handleEnd(context: HandlerContext, _payload: ClientEvents['interview:end']): Promise<void> { const session = await this.sessionManager.get(context.sessionId!); if (!session) return; const report = await this.interviewEngine.generateReport(session); context.ws.send(JSON.stringify({ event: 'interview:ended', data: { report, duration: 0 }, timestamp: new Date().toISOString(), userId: context.userId })); }
}
