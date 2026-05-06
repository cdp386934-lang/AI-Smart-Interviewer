import { describe, expect, it, vi } from 'vitest';

import { ModularInterviewEngine } from './interview-engine';
import type { IAILayer } from '../ai-layer/interfaces';
import { InterviewStage } from '../session-manager/interfaces';

const aiMock: IAILayer = {
  chat: vi.fn(),
  streamChat: vi.fn(),
  structuredOutput: vi.fn(),
  toolCall: vi.fn(),
  embed: vi.fn(),
  healthCheck: vi.fn(),
};

function createSession(overrides: Partial<any> = {}) {
  return {
    id: 'session-1',
    stage: InterviewStage.TECHNICAL,
    config: {
      jobTitle: '后端工程师',
      jobLevel: 'mid',
      difficulty: 'medium',
      duration: 60,
      focusAreas: ['Node.js', 'TypeScript'],
      userId: 'user-1',
    },
    resume: {
      name: '张三',
      skills: [{ name: 'Node.js', level: 'advanced' }],
      experience: [{ company: 'A', position: '开发', startDate: '2022', description: '负责后端', skills: ['Node.js'] }],
      projects: [{ name: '电商平台', description: '平台', technologies: ['Node.js'], role: '主程' }],
    },
    messages: [],
    profile: {
      skills: new Map([['Node.js', 0.7]]),
      weakAreas: [],
      strongAreas: [],
      personalityHints: [],
      overallScore: 0,
    },
    metadata: {
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      lastActivityAt: new Date('2026-01-01'),
      totalMessages: 0,
      timeSpent: 120,
    },
    ...overrides,
  };
}

describe('ModularInterviewEngine', () => {
  it('生成问题时会调用结构化输出并补全默认值', async () => {
    aiMock.structuredOutput = vi.fn().mockResolvedValue({
      id: 'q-1',
      type: 'technical',
      content: '请解释 Node.js 事件循环',
      difficulty: 3,
      expectedPoints: ['事件循环', '宏任务', '微任务'],
    });

    const engine = new ModularInterviewEngine(aiMock);
    const question = await engine.generateQuestion(createSession());

    expect(question.id).toBe('q-1');
    expect(question.timeout).toBeGreaterThan(0);
    expect(question.expectedPoints).toHaveLength(3);
  });

  it('回答评估应返回评分和追问标记', async () => {
    aiMock.structuredOutput = vi.fn().mockResolvedValue({
      questionId: 'q-1',
      score: 88,
      dimensions: { technical: 90, communication: 85, logic: 88, experience: 80 },
      feedback: '回答完整',
      missingPoints: [],
      followUpNeeded: false,
      skillUpdates: { 'Node.js': 0.8 },
    });

    const engine = new ModularInterviewEngine(aiMock);
    const evaluation = await engine.evaluateAnswer(createSession(), '回答内容');

    expect(evaluation.score).toBe(88);
    expect(evaluation.followUpNeeded).toBe(false);
    expect(evaluation.dimensions.technical).toBe(90);
  });

  it('追问决策应在需要时进入 follow_up', async () => {
    aiMock.structuredOutput = vi.fn().mockResolvedValue({
      shouldFollowUp: true,
      followUpType: 'clarification',
      reasoning: '答案不够具体',
      priority: 1,
    });

    const engine = new ModularInterviewEngine(aiMock);
    const stage = await engine.decideTransition(createSession(), {
      questionId: 'q-1',
      score: 55,
      dimensions: { technical: 50, communication: 55, logic: 45, experience: 40 },
      feedback: '模糊',
      missingPoints: ['细节'],
      followUpNeeded: true,
      skillUpdates: new Map(),
    });

    expect(stage).toBe('follow_up');
  });

  it('报告生成应输出面试报告结构', async () => {
    aiMock.structuredOutput = vi.fn().mockResolvedValue({
      sessionId: 'session-1',
      summary: '整体表现良好',
      strengths: ['学习能力'],
      weaknesses: ['系统设计'],
      recommendations: ['加强系统设计训练'],
      overallScore: 82,
      hiringRecommendation: 'recommend',
      skillRadar: { 'Node.js': 80 },
      stagePerformance: { technical: { averageScore: 82, questionCount: 3, feedback: '良好' } },
      detailedAnalysis: { technical: '好', communication: '好', logic: '好', experience: '好' },
    });

    const engine = new ModularInterviewEngine(aiMock);
    const report = await engine.generateReport(createSession());

    expect(report.sessionId).toBe('session-1');
    expect(report.averageScore).toBe(0);
    expect(report.recommendations).toContain('加强系统设计训练');
  });

  it('实时反馈应根据分数给出中文评级', async () => {
    const engine = new ModularInterviewEngine(aiMock);
    const feedback = await engine.generateRealtimeFeedback({
      questionId: 'q-1',
      score: 90,
      dimensions: { technical: 90, communication: 90, logic: 90, experience: 90 },
      feedback: '很好',
      missingPoints: [],
      followUpNeeded: false,
      skillUpdates: new Map(),
    });

    expect(feedback).toContain('优秀');
  });
});
