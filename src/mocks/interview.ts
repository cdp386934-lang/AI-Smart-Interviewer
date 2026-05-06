import { InterviewStage } from '@/types/shared';

export const mockResume = {
  name: '张三',
  summary: '3年前端开发工程师，擅长 React 和 TypeScript',
  skills: ['React', 'TypeScript', 'Node.js', 'CSS'],
  projects: [
    { name: 'CRM 系统', description: '企业级客户管理平台', technologies: ['React', 'Ant Design'] },
    { name: '监控平台', description: '实时监控告警系统', technologies: ['Node.js', 'WebSocket'] },
  ],
};

export const mockInterviewState = {
  sessionId: 'session-1',
  stage: InterviewStage.TECHNICAL,
  status: 'interviewing' as const,
  currentQuestion: null,
  questionSequence: 1,
  progress: { current: 1, total: 10, elapsedTime: 180 },
};
