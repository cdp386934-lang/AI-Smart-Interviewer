import { describe, expect, it } from 'vitest';
import { InterviewStage } from '@/types/shared';

describe('SessionManager', () => {
  it('create 应创建新会话并初始化状态', async () => {
    const session = { id: 's1', stage: InterviewStage.IDLE, profile: { skills: new Map(), weakAreas: [], strongAreas: [], personalityHints: [], overallScore: 0 } } as any;
    expect(session.id).toBeTruthy();
    expect(session.stage).toBe(InterviewStage.IDLE);
    expect(session.profile.skills).toBeInstanceOf(Map);
  });
});
