import {
  InterviewEvent,
  InterviewStage,
  SessionErrors,
} from './interfaces';

export type StageTransitionHook = (ctx: {
  sessionId: string;
  from: InterviewStage;
  to: InterviewStage;
  event: InterviewEvent;
}) => Promise<void>;

const transitionKey = (stage: InterviewStage, event: InterviewEvent): string =>
  `${stage}::${event}`;

/**
 * 合法 (当前阶段, 事件) -> 下一阶段
 * 未列出的组合视为非法转移
 */
const TRANSITION_TABLE: Record<string, InterviewStage> = {
  [transitionKey(InterviewStage.IDLE, InterviewEvent.RESUME_UPLOADED)]:
    InterviewStage.RESUME_CONFIRM,

  [transitionKey(InterviewStage.RESUME_CONFIRM, InterviewEvent.RESUME_CONFIRMED)]:
    InterviewStage.SELF_INTRO,

  [transitionKey(InterviewStage.SELF_INTRO, InterviewEvent.SELF_INTRO_COMPLETED)]:
    InterviewStage.TECHNICAL,

  [transitionKey(InterviewStage.TECHNICAL, InterviewEvent.TECHNICAL_STARTED)]:
    InterviewStage.TECHNICAL,
  [transitionKey(InterviewStage.TECHNICAL, InterviewEvent.TECHNICAL_COMPLETED)]:
    InterviewStage.PROJECT_DEEP,

  [transitionKey(InterviewStage.PROJECT_DEEP, InterviewEvent.PROJECT_DEEP_STARTED)]:
    InterviewStage.PROJECT_DEEP,
  [transitionKey(InterviewStage.PROJECT_DEEP, InterviewEvent.PROJECT_DEEP_COMPLETED)]:
    InterviewStage.BEHAVIORAL,

  [transitionKey(InterviewStage.BEHAVIORAL, InterviewEvent.BEHAVIORAL_STARTED)]:
    InterviewStage.BEHAVIORAL,
  [transitionKey(InterviewStage.BEHAVIORAL, InterviewEvent.BEHAVIORAL_COMPLETED)]:
    InterviewStage.CODING,

  [transitionKey(InterviewStage.CODING, InterviewEvent.CODING_STARTED)]:
    InterviewStage.CODING,
  [transitionKey(InterviewStage.CODING, InterviewEvent.CODING_COMPLETED)]:
    InterviewStage.Q_AND_A,

  [transitionKey(InterviewStage.Q_AND_A, InterviewEvent.Q_AND_A_STARTED)]:
    InterviewStage.Q_AND_A,
  [transitionKey(InterviewStage.Q_AND_A, InterviewEvent.Q_AND_A_COMPLETED)]:
    InterviewStage.ENDED,
};

const GLOBAL_END_EVENTS = new Set<InterviewEvent>([
  InterviewEvent.SESSION_ENDED,
  InterviewEvent.SESSION_TIMEOUT,
]);

export function resolveNextStage(
  sessionId: string,
  from: InterviewStage,
  event: InterviewEvent
): InterviewStage {
  if (from === InterviewStage.ENDED) {
    throw SessionErrors.SESSION_ENDED(sessionId);
  }

  if (GLOBAL_END_EVENTS.has(event)) {
    return InterviewStage.ENDED;
  }

  const next = TRANSITION_TABLE[transitionKey(from, event)];
  if (!next) {
    throw SessionErrors.INVALID_EVENT(from, event);
  }
  return next;
}

export function describeTransition(
  from: InterviewStage,
  event: InterviewEvent,
  to: InterviewStage
): string {
  return `${from} + ${event} -> ${to}`;
}
