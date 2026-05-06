import type { InterviewStage } from '../../session-manager/interfaces';
import type { StructuredResume } from '../../resume-parser/interfaces';
import type { InterviewSession } from '../../session-manager/interfaces';

export const generateQuestionPrompt = (params: {
  stage: InterviewStage;
  resume: StructuredResume;
  profile: InterviewSession['profile'];
  history: InterviewSession['messages'];
  difficulty: number;
}) => `你是资深技术面试官，正在面试应聘 ${params.resume.basicInfo.targetPosition} 的候选人。

【候选人背景】
工作年限：${params.resume.basicInfo.years}
技术栈：${Array.from(params.profile.skills.entries()).map(([k, v]) => `${k}(${v})`).join(', ')}

【面试阶段】${params.stage}
【当前难度】${params.difficulty}/5
【已暴露薄弱点】${params.profile.weakAreas.join(', ') || '无'}

【历史对话】（最近3轮）
${params.history.slice(-3).map((m) => `${m.role}: ${m.content}`).join('\n')}

【要求】
1. 生成一个 ${params.difficulty} 难度的面试问题
2. 问题必须具体，有实际业务场景，禁止概念性问题
3. 如果是技术题，要求给出代码思路或架构设计
4. 返回格式：只输出问题内容，不要解释

问题：`;

export default {
  name: 'question-generate',
  template: generateQuestionPrompt,
  description: '问题生成 Prompt',
  variables: ['stage', 'resume', 'profile', 'history', 'difficulty'],
  version: '2.0.0',
};
