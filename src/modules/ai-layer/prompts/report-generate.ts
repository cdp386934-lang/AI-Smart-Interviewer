import type { InterviewReport } from '../../interview-engine/interfaces';

export const generateReportPrompt = (params: {
  report: InterviewReport;
}) => `你是面试报告专家，请基于以下结构化数据生成中文面试总结。

【总体得分】${params.report.overallScore}
【优势】${params.report.strengths.join('；')}
【不足】${params.report.weaknesses.join('；')}
【建议】${params.report.detailedFeedback}

请返回简洁中文总结。`;

export default {
  name: 'report-generate',
  template: generateReportPrompt,
  description: '面试报告 Prompt',
  variables: ['report'],
  version: '2.0.0',
};
