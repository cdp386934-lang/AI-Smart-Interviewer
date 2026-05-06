import { v4 as uuidv4 } from 'uuid';

import {
  ILegacyInterviewEngine,
  LegacyInterviewEngineConfig,
} from './legacy-engine.interface';
import type { ResumeData } from '@/types';
import type {
  InterviewQuestion,
  InterviewFeedback,
  InterviewAnswer,
  LegacyInterviewSession,
} from '@/types/legacy-interview';
import { IAIService } from '../ai-layer/interfaces';
import type { ILegacySessionStorage } from '../session-manager/legacy-session.storage';
import logger from '@/utils/logger';
import { Errors } from '@/utils/errors';

export class InterviewEngine implements ILegacyInterviewEngine {
  private config: LegacyInterviewEngineConfig;
  private aiService: IAIService;
  private sessionManager: ILegacySessionStorage;

  constructor(
    config: LegacyInterviewEngineConfig,
    aiService: IAIService,
    sessionManager: ILegacySessionStorage
  ) {
    this.config = config;
    this.aiService = aiService;
    this.sessionManager = sessionManager;
  }

  async createSession(
    candidateId: string,
    resume: ResumeData,
    position: string,
    questionCount: number = this.config.defaultQuestionCount,
    difficulty: 'easy' | 'medium' | 'hard' = this.config.defaultDifficulty
  ): Promise<LegacyInterviewSession> {
    try {
      // 生成面试问题
      const questions = await this.aiService.generateQuestions(
        resume,
        position,
        questionCount,
        difficulty
      );

      // 创建会话
      const session: LegacyInterviewSession = {
        id: uuidv4(),
        candidateId,
        resumeId: resume.id,
        position,
        status: 'pending',
        currentQuestionIndex: 0,
        questions: questions.map((q) => ({
          ...q,
          id: uuidv4(),
          timeLimit: q.timeLimit || this.config.timePerQuestion,
        })),
        answers: [],
        startedAt: new Date(),
        createdAt: new Date(),
      };

      // 保存会话
      await this.sessionManager.createSession(session);
      
      logger.info(`创建面试会话: ${session.id} for candidate: ${candidateId}`);
      return session;
    } catch (error) {
      logger.error('创建面试会话失败:', error);
      throw error;
    }
  }

  async getNextQuestion(sessionId: string): Promise<InterviewQuestion | null> {
    try {
      const session = await this.sessionManager.getSession(sessionId);
      
      if (session.status !== 'active' && session.status !== 'pending') {
        throw Errors.SESSION_ALREADY_COMPLETED(sessionId);
      }

      // 如果会话是pending状态，激活它
      if (session.status === 'pending') {
        session.status = 'active';
        await this.sessionManager.updateSession(session);
      }

      // 检查是否还有问题
      if (session.currentQuestionIndex >= session.questions.length) {
        return null;
      }

      const question = session.questions[session.currentQuestionIndex];
      logger.debug(`获取下一个问题: ${question.id} for session: ${sessionId}`);
      return question;
    } catch (error) {
      logger.error('获取下一个问题失败:', error);
      throw error;
    }
  }

  async submitAnswer(
    sessionId: string,
    questionId: string,
    answer: string,
    audioUrl?: string
  ): Promise<{
    score: number;
    feedback: string;
    isComplete: boolean;
  }> {
    try {
      const session = await this.sessionManager.getSession(sessionId);
      
      if (session.status !== 'active') {
        throw Errors.SESSION_ALREADY_COMPLETED(sessionId);
      }

      // 验证问题ID
      const currentQuestion = session.questions[session.currentQuestionIndex];
      if (currentQuestion.id !== questionId) {
        throw Errors.createError('INVALID_QUESTION', '问题ID不匹配', 400);
      }

      // 获取简历数据
      const resume = await this.sessionManager.getResume(session.resumeId);
      
      // 评估回答
      const evaluation = await this.aiService.evaluateAnswer(
        currentQuestion,
        answer,
        resume
      );

      // 保存回答
      const interviewAnswer: InterviewAnswer = {
        questionId,
        answer,
        audioUrl,
        timestamp: new Date(),
        duration: 0, // 可以从音频中计算
      };

      session.answers.push(interviewAnswer);
      session.currentQuestionIndex++;

      // 检查是否完成所有问题
      const isComplete = session.currentQuestionIndex >= session.questions.length;
      if (isComplete) {
        session.status = 'completed';
        session.completedAt = new Date();
      }

      // 更新会话
      await this.sessionManager.updateSession(session);
      
      // 保存评估结果
      await this.sessionManager.saveAnswerEvaluation(
        sessionId,
        questionId,
        evaluation.score,
        evaluation.feedback,
        evaluation.keywordsMatched
      );

      logger.info(`提交回答: session=${sessionId}, question=${questionId}, score=${evaluation.score}`);
      
      return {
        score: evaluation.score,
        feedback: evaluation.feedback,
        isComplete,
      };
    } catch (error) {
      logger.error('提交回答失败:', error);
      throw error;
    }
  }

  async completeSession(sessionId: string): Promise<InterviewFeedback> {
    try {
      const session = await this.sessionManager.getSession(sessionId);
      
      if (session.status !== 'completed') {
        throw Errors.createError('SESSION_NOT_COMPLETED', '会话尚未完成', 400);
      }

      if (session.feedback) {
        return session.feedback;
      }

      // 获取所有回答的评估结果
      const answerEvaluations = await this.sessionManager.getAnswerEvaluations(sessionId);
      
      // 获取简历数据
      const resume = await this.sessionManager.getResume(session.resumeId);
      
      // 准备数据用于生成反馈
      const qaData = session.questions.map((question, index) => {
        const answer = session.answers[index];
        const evaluation = answerEvaluations.find(e => e.questionId === question.id);
        
        return {
          question,
          answer: answer?.answer || '',
          score: evaluation?.score || 0,
        };
      });

      // 生成完整反馈
      const feedback = await this.aiService.generateFeedback(
        sessionId,
        session.questions,
        qaData,
        resume
      );

      // 保存反馈
      session.feedback = feedback;
      await this.sessionManager.updateSession(session);

      logger.info(`完成面试会话: ${sessionId}, 总体得分: ${feedback.overallScore}`);
      return feedback;
    } catch (error) {
      logger.error('完成会话失败:', error);
      throw error;
    }
  }

  async getSessionStatus(sessionId: string): Promise<LegacyInterviewSession> {
    try {
      const session = await this.sessionManager.getSession(sessionId);
      return session;
    } catch (error) {
      logger.error('获取会话状态失败:', error);
      throw error;
    }
  }

  async cancelSession(sessionId: string): Promise<void> {
    try {
      const session = await this.sessionManager.getSession(sessionId);
      
      if (session.status === 'completed' || session.status === 'cancelled') {
        throw Errors.SESSION_ALREADY_COMPLETED(sessionId);
      }

      session.status = 'cancelled';
      await this.sessionManager.updateSession(session);
      
      logger.info(`取消面试会话: ${sessionId}`);
    } catch (error) {
      logger.error('取消会话失败:', error);
      throw error;
    }
  }

  /**
   * 获取会话统计信息
   */
  async getSessionStats(sessionId: string): Promise<{
    totalQuestions: number;
    answeredQuestions: number;
    averageScore: number;
    timeSpent: number; // 秒
  }> {
    try {
      const session = await this.sessionManager.getSession(sessionId);
      const evaluations = await this.sessionManager.getAnswerEvaluations(sessionId);
      
      const totalQuestions = session.questions.length;
      const answeredQuestions = session.answers.length;
      
      const totalScore = evaluations.reduce((sum, evalItem) => sum + evalItem.score, 0);
      const averageScore = answeredQuestions > 0 ? totalScore / answeredQuestions : 0;
      
      // 计算时间花费（简化版本）
      const timeSpent = session.startedAt && session.completedAt 
        ? (session.completedAt.getTime() - session.startedAt.getTime()) / 1000
        : 0;

      return {
        totalQuestions,
        answeredQuestions,
        averageScore,
        timeSpent,
      };
    } catch (error) {
      logger.error('获取会话统计失败:', error);
      throw error;
    }
  }
}