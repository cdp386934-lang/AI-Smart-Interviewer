import { describe, expect, it, beforeEach } from 'vitest';
import Redis from 'ioredis-mock';

import { SessionManager } from './session.manager';
import { InterviewConfig, InterviewEvent, InterviewStage } from './interfaces';
import { InMemoryLongTermMessageStore } from './long-term-message.store';
import type { StructuredResume } from '../resume-parser/interfaces';

const minimalResume = (): StructuredResume => ({
  basicInfo: { name: 'T', email: 't@t.com' },
  education: [],
  workExperience: [],
  projects: [],
  skills: {
    programming: [],
    frameworks: [],
    tools: [],
    languages: [],
    softSkills: [],
    certifications: [],
  },
  rawText: '',
  extractedAt: new Date(),
});

const baseConfig = (userId: string): InterviewConfig => ({
  jobTitle: 'Backend',
  jobLevel: 'mid',
  difficulty: 'medium',
  duration: 45,
  focusAreas: ['Node'],
  userId,
  resume: minimalResume(),
});

describe('SessionManager', () => {
  let redis: import('ioredis').default;
  let store: InMemoryLongTermMessageStore;

  beforeEach(() => {
    redis = new Redis() as import('ioredis').default;
    store = new InMemoryLongTermMessageStore();
  });

  it('create then transition along main path', async () => {
    const mgr = new SessionManager(
      {
        sessionTTL: 1,
        redisPrefix: 'test',
        maxActiveSessions: 5,
        maxMessagesPerSession: 100,
        timeoutMinutes: 999,
        enableCompression: false,
        compressionThreshold: 999,
      },
      redis,
      store
    );

    const session = await mgr.create(baseConfig('u1'));
    expect(session.stage).toBe(InterviewStage.IDLE);

    await mgr.transition(session.id, InterviewEvent.RESUME_UPLOADED);
    let cur = await mgr.get(session.id);
    expect(cur?.stage).toBe(InterviewStage.RESUME_CONFIRM);

    await mgr.transition(session.id, InterviewEvent.RESUME_CONFIRMED);
    cur = await mgr.get(session.id);
    expect(cur?.stage).toBe(InterviewStage.SELF_INTRO);
  });

  it('blocks second active new session for same user', async () => {
    const mgr = new SessionManager(
      {
        sessionTTL: 1,
        redisPrefix: 'test2',
        maxActiveSessions: 5,
        maxMessagesPerSession: 40,
        timeoutMinutes: 999,
        enableCompression: false,
        compressionThreshold: 20,
      },
      redis,
      store
    );

    const s1 = await mgr.create(baseConfig('u2'));
    await expect(mgr.create(baseConfig('u2'))).rejects.toMatchObject({
      code: 'TOO_MANY_SESSIONS',
    });

    await mgr.transition(s1.id, InterviewEvent.SESSION_ENDED);
    const s2 = await mgr.create(baseConfig('u2'));
    expect(s2.id).not.toBe(s1.id);
  });

  it('persists messages to long-term store', async () => {
    const mgr = new SessionManager(
      {
        sessionTTL: 1,
        redisPrefix: 'test3',
        maxActiveSessions: 5,
        maxMessagesPerSession: 50,
        timeoutMinutes: 999,
        enableCompression: false,
        compressionThreshold: 20,
      },
      redis,
      store
    );

    const s = await mgr.create(baseConfig('u3'));
    await mgr.addMessage(s.id, {
      id: 'm1',
      role: 'user',
      content: 'hi',
      timestamp: new Date(),
    });
    const hist = await store.loadMessages(s.id);
    expect(hist).toHaveLength(1);
    expect(hist[0].content).toBe('hi');
  });

  it('merge profile updates', async () => {
    const mgr = new SessionManager(
      {
        sessionTTL: 1,
        redisPrefix: 'test4',
        maxActiveSessions: 5,
        maxMessagesPerSession: 50,
        timeoutMinutes: 999,
        enableCompression: false,
        compressionThreshold: 20,
      },
      redis,
      store
    );

    const s = await mgr.create(baseConfig('u4'));
    const skills = new Map<string, number>([['go', 0.8]]);
    await mgr.updateProfile(s.id, {
      skills,
      overallScore: 72,
      weakAreas: ['system design'],
    });
    const cur = await mgr.get(s.id);
    expect(cur?.profile.overallScore).toBe(72);
    expect(cur?.profile.skills.get('go')).toBe(0.8);
    expect(cur?.profile.weakAreas).toContain('system design');
  });
});
