import { afterAll, afterEach, beforeAll } from 'vitest';
import { container } from '../container';

// 测试前的准备工作
beforeAll(async () => {
  // 可以在这里初始化测试数据库或模拟服务
  console.log('测试环境初始化...');
});

// 每个测试后的清理工作
afterEach(async () => {
  // 清理测试数据
});

// 所有测试后的清理工作
afterAll(async () => {
  // 清理容器资源
  await container.cleanup();
  console.log('测试环境清理完成');
});

// 测试工具函数
export const testUtils = {
  // 生成测试简历数据
  createTestResumeData: () => ({
    id: 'test-resume-123',
    name: '测试用户',
    email: 'test@example.com',
    phone: '13800138000',
    education: [
      {
        institution: '测试大学',
        degree: '学士',
        field: '计算机科学',
        startDate: '2018-09-01',
        endDate: '2022-06-30',
        gpa: 3.8,
      },
    ],
    experience: [
      {
        company: '测试公司',
        position: '软件工程师',
        startDate: '2022-07-01',
        endDate: '2024-05-01',
        description: '负责后端开发',
        skills: ['Node.js', 'TypeScript', 'PostgreSQL'],
      },
    ],
    skills: [
      {
        name: 'JavaScript',
        level: 'expert' as const,
        category: '编程语言',
      },
      {
        name: 'TypeScript',
        level: 'advanced' as const,
        category: '编程语言',
      },
    ],
    projects: [
      {
        name: '测试项目',
        description: '一个测试项目',
        technologies: ['React', 'Node.js'],
        role: '全栈开发者',
        duration: '6个月',
      },
    ],
    summary: '有经验的软件工程师',
    rawText: '测试简历文本内容',
    filePath: '/tmp/test-resume.pdf',
    createdAt: new Date(),
  }),

  // 生成测试面试问题
  createTestQuestion: () => ({
    id: 'test-question-123',
    text: '请解释什么是闭包？',
    type: 'technical' as const,
    difficulty: 'medium' as const,
    expectedKeywords: ['函数', '作用域', '变量', '访问'],
    timeLimit: 120,
  }),

  // 等待函数
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
};