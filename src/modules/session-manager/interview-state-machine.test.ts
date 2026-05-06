import { describe, expect, it } from 'vitest';

import { InterviewEvent, InterviewStage } from './interfaces';
import { resolveNextStage } from './interview-state-machine';

describe('interview-state-machine', () => {
  it('linear happy path', () => {
    const sid = 's1';
    expect(
      resolveNextStage(sid, InterviewStage.IDLE, InterviewEvent.RESUME_UPLOADED)
    ).toBe(InterviewStage.RESUME_CONFIRM);
    expect(
      resolveNextStage(
        sid,
        InterviewStage.RESUME_CONFIRM,
        InterviewEvent.RESUME_CONFIRMED
      )
    ).toBe(InterviewStage.SELF_INTRO);
    expect(
      resolveNextStage(
        sid,
        InterviewStage.TECHNICAL,
        InterviewEvent.TECHNICAL_COMPLETED
      )
    ).toBe(InterviewStage.PROJECT_DEEP);
  });

  it('rejects illegal event at stage', () => {
    expect(() =>
      resolveNextStage(
        's2',
        InterviewStage.TECHNICAL,
        InterviewEvent.RESUME_CONFIRMED
      )
    ).toThrow(/不接受事件 resume_confirmed/);
  });

  it('global end from technical', () => {
    expect(
      resolveNextStage(
        's3',
        InterviewStage.TECHNICAL,
        InterviewEvent.SESSION_ENDED
      )
    ).toBe(InterviewStage.ENDED);
  });

  it('ended stage rejects further events', () => {
    expect(() =>
      resolveNextStage('s4', InterviewStage.ENDED, InterviewEvent.TECHNICAL_STARTED)
    ).toThrow();
  });
});
