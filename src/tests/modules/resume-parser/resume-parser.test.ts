import { describe, expect, it, vi } from 'vitest';
import { ResumeParser } from '@/modules/resume-parser/resume.parser';

describe('ResumeParser', () => {
  it('extractText 应拒绝不支持格式', async () => {
    const parser = new ResumeParser({ uploadDir: './tmp', maxFileSize: 10, supportedFormats: ['.pdf'], cacheTTL: 1, enableCache: false, enableFallback: true, timeout: 1 }, {} as any);
    await expect(parser.extractText({ buffer: Buffer.from('x'), filename: 'test.txt', mimetype: 'text/plain' } as any)).rejects.toBeTruthy();
  });

  it('parseToStructured 应返回标准格式', async () => {
    const parser = new ResumeParser({ uploadDir: './tmp', maxFileSize: 10, supportedFormats: ['.pdf'], cacheTTL: 1, enableCache: false, enableFallback: true, timeout: 1 }, { structuredOutput: vi.fn().mockResolvedValue({ basicInfo: { name: '张三', phone: '13800138000', email: 'zhangsan@example.com', targetPosition: '前端工程师' }, education: [], workExperience: [], projects: [], skills: { proficient: ['React', 'TypeScript'], familiar: ['Node.js'] }, rawText: '原始文本' }) } as any);
    const result = await parser.parseToStructured('原始简历文本');
    expect(result.basicInfo.name).toBe('张三');
    expect(result.skills.proficient).toContain('React');
  });
});
