import type { Question, Evaluation } from '../../interview-engine/interfaces';

export const generateFollowUpPrompt = (params: {
  question: Question;
  evaluation: Evaluation;
  answer: string;
}) => `你是专业面试官，候选人在以下问题上的回答需要判断是否追问。

【原题】${params.question.content}
【回答】${params.answer}
【评分】${params.evaluation.score}
【遗漏】${params.evaluation.missingPoints.join(', ') || '无'}
【反馈】${params.evaluation.feedback}

请仅返回 JSON：
{
  "shouldFollowUp": true,
  "followUpType": "clarification",
  "question": "请进一步说明...",
  "reason": "为什么追问"
}`;

export default {
  name: 'follow-up-decide',
  template: generateFollowUpPrompt,
  description: '追问决策 Prompt',
  variables: ['question', 'evaluation', 'answer'],
  version: '2.0.0',
};
