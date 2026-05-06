import { describe, expect, it } from 'vitest';
import { calculateDifficulty, InterviewEngine } from './interview.engine';
import type { InterviewSession } from '../session-manager/interfaces';

const session = {
  id: 's1',
  stage: 'technical',
  config: { jobTitle: '前端工程师', jobLevel: 'mid', difficulty: 'medium', duration: 60, focusAreas: ['React'], userId: 'u1', resume: {} as any },
  resume: {
    basicInfo: { targetPosition: '前端工程师', years: 3 },
    projects: [{ name: 'CRM', description: 'crm', technologies: ['React'], role: '开发' }],
    workExperience: [{ company: 'A', position: 'B', duration: '1年', description: 'd', technologies: ['React'] }],
    skills: [],
    rawText: 'React React',
  } as any,
  messages: [],
  profile: {
    skills: new Map([['React', 0.8]]),
    weakAreas: ['Node.js'],
    strongAreas: ['React'],
    personalityHints: [],
    overallScore: 0,
  },
  metadata: { createdAt: new Date(), updatedAt: new Date(), lastActivityAt: new Date(), totalMessages: 0, timeSpent: 0 },
} as InterviewSession;

describe('InterviewEngine helpers', () => {
  it('calculateDifficulty should respect strong area', () => {
    expect(calculateDifficulty(session.profile, 'React')).toBe(5);
  });

  it('calculateDifficulty should respect weak area', () => {
    expect(calculateDifficulty(session.profile, 'Node.js')).toBeLessThan(3);
  });
});

class MockAI {
  async chat() { return '你可以结合实际项目说明一下吗？'; }
  async structuredOutput() { return { score: 80, dimensions: { technical: 80, communication: 75, logic: 78, experience: 82 }, feedback: '不错', missingPoints: [], followUpNeeded: false, skillUpdates: [], answerQuality: 'good' as const, questionId: 'q1' }; }
}

describe('InterviewEngine', () => {
  const engine = new InterviewEngine(new MockAI() as any);

  it('should transition from self_intro to technical', async () => {
    const next = await engine.decideTransition({ ...session, stage: 'self_intro' } as any, { score: 80 } as any);
    expect(next).toBe('technical');
  });

  it('should transition from technical to project_deep after 3 correct answers', async () => {
    const s = { ...session, stage: 'technical', messages: Array.from({ length: 3 }, (_, i) => ({ role: 'assistant', content: `q${i}`, metadata: { evaluation: { score: 90 } } })) } as any;
    const next = await engine.decideTransition(s, { score: 90 } as any);
    expect(next).toBe('project_deep');
  });

  it('should fallback generate realtime feedback', async () => {
    const text = await engine.generateRealtimeFeedback({ score: 88, feedback: '答得很好', missingPoints: [], dimensions: { technical: 0, communication: 0, logic: 0, experience: 0 }, followUpNeeded: false, skillUpdates: [], answerQuality: 'excellent', questionId: 'q1' });
    expect(text.length).toBeGreaterThan(0);
  });
});
