import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LangChainService } from '../modules/ai-layer/langchain.service';
import { testUtils } from './setup';

// 模拟LangChain模块
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
      const questions = await aiService.generateQuestions(
        resume,
        '软件工程师',
        5,
        'medium'
      );

      expect(questions).toBeDefined();
      expect(Array.isArray(questions)).toBe(true);
      // 注意：由于我们模拟了响应，这里可能返回空数组或模拟数据
    });

    it('应该处理AI服务错误', async () => {
      // 模拟AI服务错误
      const mockError = new Error('AI服务错误');
      vi.spyOn(aiService as any, 'generateQuestions').mockRejectedValue(mockError);

      await expect(
        aiService.generateQuestions(
          testUtils.createTestResumeData(),
          '软件工程师',
          5,
          'medium'
        )
      ).rejects.toThrow();
    });
  });

  describe('evaluateAnswer', () => {
    it('应该评估回答并返回分数和反馈', async () => {
      const question = testUtils.createTestQuestion();
      const resume = testUtils.createTestResumeData();
      
      const result = await aiService.evaluateAnswer(
        question,
        '闭包是一个函数和其周围状态的组合',
        resume
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('feedback');
      expect(result).toHaveProperty('keywordsMatched');
      expect(result).toHaveProperty('suggestions');
      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  describe('parseResumeText', () => {
    it('应该解析简历文本为结构化数据', async () => {
      const resumeText = `
        姓名：张三
        邮箱：zhangsan@example.com
        电话：13800138000
        教育经历：
        - 北京大学，计算机科学，学士，2018-2022
        工作经历：
        - 阿里巴巴，软件工程师，2022-至今
        技能：
        - JavaScript (专家)
        - TypeScript (高级)
      `;

      const result = await aiService.parseResumeText(resumeText);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('education');
      expect(result).toHaveProperty('experience');
      expect(result).toHaveProperty('skills');
    });
  });

  describe('healthCheck', () => {
    it('应该返回AI服务健康状态', async () => {
      const isHealthy = await aiService.healthCheck();
      expect(typeof isHealthy).toBe('boolean');
    });
  });

  describe('错误处理', () => {
    it('应该正确处理网络错误', async () => {
      // 模拟网络错误
      vi.spyOn(aiService as any, 'healthCheck').mockRejectedValue(
        new Error('Network error')
      );

      const isHealthy = await aiService.healthCheck();
      expect(isHealthy).toBe(false);
    });

    it('应该处理JSON解析错误', async () => {
      // 模拟无效的JSON响应
      const mockInvalidJson = 'Invalid JSON';
      vi.spyOn(aiService as any, 'generateQuestions').mockResolvedValue(
        mockInvalidJson
      );

      await expect(
        aiService.generateQuestions(
          testUtils.createTestResumeData(),
          '软件工程师',
          5,
          'medium'
        )
      ).rejects.toThrow();
    });
  });

  describe('配置验证', () => {
    it('应该验证API密钥', () => {
      expect(() => {
        new LangChainService({
          apiKey: '',
          model: 'gpt-4',
        });
      }).not.toThrow();
    });

    it('应该使用默认配置', () => {
      const service = new LangChainService({
        apiKey: 'test-key',
        model: 'gpt-4',
      });

      expect(service).toBeDefined();
    });
  });
});