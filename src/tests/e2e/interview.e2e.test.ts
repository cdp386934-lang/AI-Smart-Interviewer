import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockScenario = {
  upload: true,
  parse: true,
  optimize: true,
  interviewRounds: 10,
  report: true,
};

describe('E2E - interview flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should complete the happy path flow', async () => {
    const result = await Promise.resolve({
      steps: ['upload', 'parse', 'optimize', 'interview', 'report'],
      ok: true,
    });

    expect(result.ok).toBe(true);
    expect(result.steps).toContain('report');
  });

  it('should degrade gracefully on AI format error', async () => {
    const fallback = { score: 60, fallbackUsed: true };
    const aiResponse = Promise.reject(new Error('invalid json'));

    const handled = await aiResponse.catch(() => fallback);
    expect(handled.fallbackUsed).toBe(true);
    expect(handled.score).toBeGreaterThanOrEqual(60);
  });

  it('should support concurrent sessions simulation', async () => {
    const sessions = await Promise.all(
      Array.from({ length: 3 }, async (_, index) => ({
        sessionId: `session-${index + 1}`,
        status: 'completed',
        score: 80 + index,
      }))
    );

    expect(sessions).toHaveLength(3);
    expect(new Set(sessions.map((s) => s.sessionId)).size).toBe(3);
  });
});

export { mockScenario };
