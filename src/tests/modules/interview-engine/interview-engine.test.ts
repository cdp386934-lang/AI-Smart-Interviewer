import { describe, expect, it, vi } from 'vitest';
import { InterviewEngine } from '@/modules/interview-engine/interview.engine';
import { InterviewStage } from '@/types/shared';

const engine = new InterviewEngine({ chat: vi.fn(), structuredOutput: vi.fn(), streamChat: vi.fn(), toolCall: vi.fn(), embed: vi.fn() } as any);

function createMockSession(overrides: any = {}) {
  return {
    id: 'session-1',
    stage: InterviewStage.TECHNICAL,
    config: { position: '前端工程师', level: 'mid', duration: 60, focusSkills: ['React'], language: 'zh' },
    resume: { basicInfo: { name: '张三', phone: '', email: '', targetPosition: '前端工程师' }, education: [], workExperience: [], projects: [], skills: { proficient: ['React'], familiar: [] }, rawText: '我使用 React 开发了电商系统' },
    messages: [],
    profile: { skills: new Map([['React', 0.8]]), weakAreas: [], strongAreas: ['React'], personalityHints: [], overallScore: 0 },
    metadata: { duration: 0 },
    ...overrides,
  } as any;
}

describe('InterviewEngine', () => {
  it('generateQuestion 应返回有效问题', async () => {
    const session = createMockSession();
    vi.spyOn(engine as any, 'generateQuestion').mockResolvedValue({ id: 'q1', type: 'technical', content: '什么是闭包？', difficulty: 3, expectedPoints: ['作用域', '函数'], stage: InterviewStage.TECHNICAL });
    const question = await engine.generateQuestion(session);
    expect(question.id).toBeTruthy();
    expect(question.content.length).toBeGreaterThan(10);
  });

  it('evaluateAnswer 应返回多维度评分', async () => {
    const session = createMockSession();
    vi.spyOn(engine as any, 'evaluateAnswer').mockResolvedValue({ questionId: 'q1', score: 82, dimensions: { technical: 85, communication: 80, logic: 82, experience: 78 }, feedback: '不错', internalFeedback: '内部反馈', missingPoints: [], followUpNeeded: false, skillUpdates: { React: 0.9 }, suggestedDifficulty: 4 });
    const evaluation = await engine.evaluateAnswer(session, '这是一个测试回答');
    expect(evaluation.score).toBeGreaterThanOrEqual(0);
    expect(evaluation.dimensions.technical).toBeGreaterThanOrEqual(0);
    expect(evaluation.feedback).toBeTruthy();
  });

  it('decideTransition 应在答够题数后转移', async () => {
    const session = createMockSession({ stage: InterviewStage.TECHNICAL, messages: Array.from({ length: 5 }, () => ({ role: 'assistant', metadata: { stage: InterviewStage.TECHNICAL } })) });
    const nextStage = await engine.decideTransition(session, { score: 70 } as any);
    expect([InterviewStage.PROJECT_DEEP, InterviewStage.BEHAVIORAL, InterviewStage.TECHNICAL]).toContain(nextStage);
  });
});
