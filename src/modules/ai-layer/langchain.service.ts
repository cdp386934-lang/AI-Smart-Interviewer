import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { JsonOutputFunctionsParser } from 'langchain/output_parsers';

import { IAIService, AIServiceConfig } from './interfaces';
import { ResumeData } from '@/types';
import {
  getQuestionText,
  type InterviewFeedback,
  type InterviewQuestion,
} from '@/types/legacy-interview';
import logger from '@/utils/logger';
import { Errors } from '@/utils/errors';

export class LangChainService implements IAIService {
  private llm: ChatOpenAI;
  private config: AIServiceConfig;

  constructor(config: AIServiceConfig) {
    this.config = config;
    this.llm = new ChatOpenAI({
      openAIApiKey: config.apiKey,
      modelName: config.model,
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 2000,
      timeout: config.timeout || 30000,
    });
  }

  async generateQuestions(
    resume: ResumeData,
    position: string,
    count: number,
    difficulty: 'easy' | 'medium' | 'hard'
  ): Promise<InterviewQuestion[]> {
    try {
      const prompt = PromptTemplate.fromTemplate(`
        你是一个专业的面试官，需要为{position}职位生成面试问题。
        
        候选人简历信息：
        {resume}
        
        要求：
        1. 生成 {count} 个问题
        2. 难度级别：{difficulty}
        3. 问题类型分布：技术问题 60%，行为问题 30%，情境问题 10%
        4. 每个问题需要包含：
           - 问题文本
           - 问题类型（technical/behavioral/situational/cultural）
           - 难度级别（easy/medium/hard）
           - 期望关键词（3-5个）
           - 时间限制（秒）
        
        请以JSON数组格式返回。
      `);

      const chain = RunnableSequence.from([
        prompt,
        this.llm,
        new StringOutputParser(),
      ]);

      const response = await chain.invoke({
        position,
        resume: JSON.stringify(resume, null, 2),
        count,
        difficulty,
      });

      // 解析JSON响应
      const questions = JSON.parse(response) as InterviewQuestion[];
      return questions.slice(0, count);
    } catch (error) {
      logger.error('生成面试问题失败:', error);
      throw Errors.AI_SERVICE_UNAVAILABLE();
    }
  }

  async evaluateAnswer(
    question: InterviewQuestion,
    answer: string,
    resume: ResumeData
  ): Promise<{
    score: number;
    feedback: string;
    keywordsMatched: string[];
    suggestions: string[];
  }> {
    try {
      const evaluationSchema = z.object({
        score: z.number().min(0).max(100).describe("回答得分 (0-100)"),
        feedback: z.string().describe("详细反馈"),
        keywordsMatched: z.array(z.string()).describe("匹配的关键词"),
        suggestions: z.array(z.string()).describe("改进建议"),
      });

      const functionSchema = {
        name: "evaluate_answer",
        description: "评估面试回答",
        parameters: zodToJsonSchema(evaluationSchema),
      };

      const prompt = PromptTemplate.fromTemplate(`
        评估面试回答：
        
        问题：{question}
        问题类型：{type}
        难度：{difficulty}
        期望关键词：{keywords}
        
        候选人回答：{answer}
        
        候选人简历摘要：{resumeSummary}
        
        请评估回答的质量，考虑：
        1. 回答的相关性和准确性
        2. 技术深度
        3. 表达清晰度
        4. 与期望关键词的匹配度
        5. 基于简历背景的适当性
      `);

      const chain = RunnableSequence.from([
        prompt,
        this.llm.bind({
          functions: [functionSchema],
          function_call: { name: "evaluate_answer" },
        }),
        new JsonOutputFunctionsParser(),
      ]);

      const result = await chain.invoke({
        question: getQuestionText(question),
        type: question.type,
        difficulty: question.difficulty,
        keywords: question.expectedKeywords?.join(', ') || '无',
        answer,
        resumeSummary: `${resume.name} - ${resume.summary || '无摘要'}`,
      });

      return result;
    } catch (error) {
      logger.error('评估回答失败:', error);
      throw Errors.AI_SERVICE_UNAVAILABLE();
    }
  }

  async generateFeedback(
    sessionId: string,
    questions: InterviewQuestion[],
    answers: Array<{ question: InterviewQuestion; answer: string; score: number }>,
    resume: ResumeData
  ): Promise<InterviewFeedback> {
    try {
      const feedbackSchema = z.object({
        overallScore: z.number().min(0).max(100).describe("总体得分"),
        technicalScore: z.number().min(0).max(100).describe("技术能力得分"),
        communicationScore: z.number().min(0).max(100).describe("沟通能力得分"),
        problemSolvingScore: z.number().min(0).max(100).describe("解决问题能力得分"),
        culturalFitScore: z.number().min(0).max(100).describe("文化匹配度得分"),
        strengths: z.array(z.string()).describe("优势"),
        areasForImprovement: z.array(z.string()).describe("需要改进的方面"),
        summary: z.string().describe("总结评价"),
        recommendations: z.array(z.string()).describe("推荐建议"),
      });

      const functionSchema = {
        name: "generate_feedback",
        description: "生成面试反馈",
        parameters: zodToJsonSchema(feedbackSchema),
      };

      const prompt = PromptTemplate.fromTemplate(`
        生成面试反馈报告：
        
        面试会话：{sessionId}
        候选人：{candidateName}
        职位：{position}
        
        面试问题与回答：
        {qaSummary}
        
        候选人简历：
        {resumeSummary}
        
        请生成全面的面试反馈，包括：
        1. 各项能力评分
        2. 候选人的优势
        3. 需要改进的方面
        4. 总体评价
        5. 具体建议
      `);

      const qaSummary = answers.map((item, index) => `
        问题 ${index + 1} (${item.question.type}, ${item.question.difficulty}):
        Q: ${getQuestionText(item.question)}
        A: ${item.answer}
        得分: ${item.score}/100
      `).join('\n');

      const chain = RunnableSequence.from([
        prompt,
        this.llm.bind({
          functions: [functionSchema],
          function_call: { name: "generate_feedback" },
        }),
        new JsonOutputFunctionsParser(),
      ]);

      const result = await chain.invoke({
        sessionId,
        candidateName: resume.name,
        position: '待定', // 可以从会话中获取
        qaSummary,
        resumeSummary: JSON.stringify(resume, null, 2),
      });

      return result;
    } catch (error) {
      logger.error('生成反馈失败:', error);
      throw Errors.AI_SERVICE_UNAVAILABLE();
    }
  }

  async parseResumeText(text: string): Promise<Partial<ResumeData>> {
    try {
      const resumeSchema = z.object({
        name: z.string().describe("姓名"),
        email: z.string().email().describe("邮箱"),
        phone: z.string().optional().describe("电话"),
        education: z.array(z.object({
          institution: z.string().describe("学校"),
          degree: z.string().describe("学位"),
          field: z.string().describe("专业"),
          startDate: z.string().describe("开始时间"),
          endDate: z.string().optional().describe("结束时间"),
          gpa: z.number().optional().describe("GPA"),
        })).describe("教育经历"),
        experience: z.array(z.object({
          company: z.string().describe("公司"),
          position: z.string().describe("职位"),
          startDate: z.string().describe("开始时间"),
          endDate: z.string().optional().describe("结束时间"),
          description: z.string().describe("工作描述"),
          skills: z.array(z.string()).describe("相关技能"),
        })).describe("工作经历"),
        skills: z.array(z.object({
          name: z.string().describe("技能名称"),
          level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).describe("熟练程度"),
          category: z.string().describe("技能类别"),
        })).describe("技能"),
        summary: z.string().optional().describe("个人总结"),
      });

      const functionSchema = {
        name: "parse_resume",
        description: "解析简历文本为结构化数据",
        parameters: zodToJsonSchema(resumeSchema),
      };

      const prompt = PromptTemplate.fromTemplate(`
        解析以下简历文本，提取结构化信息：
        
        {text}
        
        请提取以下信息：
        1. 个人信息（姓名、邮箱、电话）
        2. 教育经历
        3. 工作经历
        4. 技能
        5. 个人总结（如果有）
      `);

      const chain = RunnableSequence.from([
        prompt,
        this.llm.bind({
          functions: [functionSchema],
          function_call: { name: "parse_resume" },
        }),
        new JsonOutputFunctionsParser(),
      ]);

      const result = await chain.invoke({ text });
      return result;
    } catch (error) {
      logger.error('解析简历失败:', error);
      throw Errors.RESUME_PARSE_FAILED('AI解析失败');
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.llm.invoke('Hello');
      return !!response;
    } catch (error) {
      logger.error('AI服务健康检查失败:', error);
      return false;
    }
  }
}