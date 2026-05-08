import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LangChainService } from '../modules/ai-layer/langchain.service';
import { testUtils } from './setup';

vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn().mockImplementation(() => ({
    invoke: vi.fn().mockResolvedValue({ content: 'Mock response' }),
    bind: vi.fn().mockReturnThis(),
  })),
}));

vi.mock('@langchain/core/prompts', () => ({
  PromptTemplate: {
    fromTemplate: vi.fn().mockReturnValue({
      invoke: vi.fn().mockResolvedValue({}),
    }),
  },
}));

vi.mock('@langchain/core/output_parsers', () => ({
  StringOutputParser: vi.fn().mockImplementation(() => ({
    invoke: vi.fn().mockResolvedValue('{"test": "data"}'),
  })),
}));

vi.mock('@langchain/core/runnables', () => ({
  RunnableSequence: {
    from: vi.fn().mockReturnValue({
      invoke: vi.fn().mockResolvedValue({}),
    }),
  },
}));

vi.mock('langchain/output_parsers', () => ({
  JsonOutputFunctionsParser: vi.fn().mockImplementation(() => ({
    invoke: vi.fn().mockResolvedValue({ score: 85, feedback: 'Good answer' }),
  })),
}));

describe('AI Layer - LangChainService', () => {
  let aiService: LangChainService;

  beforeEach(() => {
    aiService = new LangChainService({
      apiKey: 'test-api-key',
      model: 'gpt-4-turbo-preview',
      temperature: 0.7,
      maxTokens: 2000,
      timeout: 30000,
    });
  });

  describe('generateQuestions', () => {
    it('应该生成指定数量的面试问题', async () => {
      const resume = testUtils.createTestResumeData();
      const questions = await aiService.generateQuestions(resume as any, '软件工程师', 5, 'medium');
      expect(questions).toBeDefined();
      expect(Array.isArray(questions)).toBe(true);
    });
  });

  describe('evaluateAnswer', () => {
    it('应该评估回答并返回分数和反馈', async () => {
      const question = testUtils.createTestQuestion();
      const resume = testUtils.createTestResumeData();
      const result = await aiService.evaluateAnswer(question as any, '闭包是一个函数和其周围状态的组合', resume as any);
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('feedback');
    });
  });
});
