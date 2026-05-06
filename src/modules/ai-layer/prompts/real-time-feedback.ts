import type { Evaluation } from '../../interview-engine/interfaces';

export const generateRealtimeFeedbackPrompt = (params: { evaluation: Evaluation }) => `请基于以下评估，生成1-2句建设性实时反馈：

得分：${params.evaluation.score}
反馈：${params.evaluation.feedback}
缺失点：${params.evaluation.missingPoints.join('，')}

要求：鼓励式表达，不打击候选人信心，指出最关键的改进点。`;

export default {
  name: 'real-time-feedback',
  template: generateRealtimeFeedbackPrompt,
  description: '实时反馈 Prompt',
  variables: ['evaluation'],
  version: '2.0.0',
};
