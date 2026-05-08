import { describe, expect, it, vi } from 'vitest';
import { LangChainService } from '@/modules/ai-layer/langchain.service';
import { testUtils } from '@/tests/setup';

vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn().mockImplementation(() => ({
    invoke: vi.fn(),
    stream: vi.fn(),
  })),
}));

vi.mock('langchain/output_parsers', () => ({
  JsonOutputFunctionsParser: vi.fn().mockImplementation(() => ({
    invoke: vi.fn(),
  })),
}));

describe('AILayer', () => {
  it('chat 应返回字符串响应', async () => {
    const ai = new LangChainService({ apiKey: 'test', model: 'gpt-4' });
    const spy = vi.spyOn(ai as any, 'chat').mockResolvedValue('测试响应');
    const result = await ai.chat([{ role: 'user', content: '你好' }]);
    expect(result).toBe('测试响应');
    expect(spy).toHaveBeenCalled();
  });

  it('structuredOutput 应处理格式错误', async () => {
    const ai = new LangChainService({ apiKey: 'test', model: 'gpt-4' });
    vi.spyOn(ai as any, 'structuredOutput').mockRejectedValue(new Error('FORMAT_ERROR'));
    await expect(ai.structuredOutput([], { parse: () => ({}) } as any)).rejects.toThrow();
  });

  it('streamChat 应返回 AsyncGenerator', async () => {
    const ai = new LangChainService({ apiKey: 'test', model: 'gpt-4' });
    async function* mockStream() { yield '片段1'; yield '片段2'; }
    vi.spyOn(ai as any, 'streamChat').mockReturnValue(mockStream());
    const chunks: string[] = [];
    for await (const c of ai.streamChat([])) chunks.push(c);
    expect(chunks).toEqual(['片段1', '片段2']);
  });

  it('embed 应返回向量数组', async () => {
    const ai = new LangChainService({ apiKey: 'test', model: 'gpt-4' });
    vi.spyOn(ai as any, 'embed').mockResolvedValue([0.1, 0.2, 0.3]);
    const result = await ai.embed('测试文本');
    expect(result).toHaveLength(3);
  });
});
