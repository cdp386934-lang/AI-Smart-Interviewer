import type { StructuredResume } from '../../resume-parser/interfaces';
import type { Question } from '../../interview-engine/interfaces';

export const evaluateAnswerPrompt = (params: {
  question: Question;
  answer: string;
  resume: StructuredResume;
}) => `你是技术面试官，请对以下回答进行评分。

【题目】${params.question.content}
【期望要点】${params.question.expectedPoints.join(', ')}
【候选人回答】${params.answer}

【评分标准】
- technical(0-100)：技术深度和准确性
- communication(0-100)：表达清晰度和结构化
- logic(0-100)：逻辑推理是否严密
- experience(0-100)：是否结合实际经验

请返回 JSON 格式（严格遵循）：
{
  "score": 85,
  "dimensions": { "technical": 90, "communication": 80, "logic": 85, "experience": 85 },
  "feedback": "具体评语",
  "missingPoints": ["遗漏点1", "遗漏点2"],
  "followUpNeeded": true,
  "skillUpdates": [{"skill": "React", "level": 0.8}],
  "answerQuality": "good"
}`;

export default {
  name: 'answer-evaluate',
  template: evaluateAnswerPrompt,
  description: '回答评分 Prompt',
  variables: ['question', 'answer', 'resume'],
  version: '2.0.0',
};
