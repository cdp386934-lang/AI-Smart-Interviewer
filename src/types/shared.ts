export enum InterviewStage {
  IDLE = 'idle',
  RESUME_CONFIRM = 'resume_confirm',
  SELF_INTRO = 'self_intro',
  TECHNICAL = 'technical',
  PROJECT_DEEP = 'project_deep',
  BEHAVIORAL = 'behavioral',
  CODING = 'coding',
  Q_AND_A = 'q_and_a',
  ENDED = 'ended',
}

export type QuestionType = 'technical' | 'behavioral' | 'project' | 'coding' | 'follow_up' | 'self_intro';

export interface Question {
  id: string;
  type: QuestionType;
  content: string;
  difficulty: number;
  expectedPoints: string[];
  context?: string;
  timeout?: number;
  stage: InterviewStage;
}

export interface EvaluationDimensions {
  technical: number;
  communication: number;
  logic: number;
  experience: number;
}

export interface RealtimeEvaluation {
  score: number;
  dimensions: EvaluationDimensions;
  feedback: string;
  followUpNeeded: boolean;
}

export interface InterviewReport {
  sessionId: string;
  overallScore: number;
  stageScores: Record<string, number>;
  skillRadar: Array<{ skill: string; score: number; fullMark: number }>;
  strengths: string[];
  weaknesses: string[];
  detailedFeedback: string;
  recommendation: 'strong_recommend' | 'recommend' | 'neutral' | 'not_recommend';
  questionDetails: Array<{ question: string; answer: string; score: number; feedback: string }>;
  duration: number;
}

export interface ServerEvents {
  'auth:result': { success: boolean; userId?: string; error?: string };
  'interview:started': { sessionId: string; stage: InterviewStage; firstQuestion: Question; config: any };
  'interviewer:question': { question: Question; stage: InterviewStage; sequence: number };
  'interviewer:typing': { duration: number };
  'interviewer:stream': { chunk: string; done: boolean };
  'evaluation:realtime': RealtimeEvaluation;
  'interview:stage_change': { from: InterviewStage; to: InterviewStage; reason: string };
  'interview:progress': { currentQuestion: number; totalQuestions: number; elapsedTime: number };
  'interview:ended': { report: InterviewReport; duration: number };
  'interview:paused': { remainingTime: number };
  'interview:resumed': {};
  error: { code: string; message: string; recoverable: boolean };
  pong: { timestamp: number; serverTime: number };
}

export interface ClientEvents {
  'auth': { token: string };
  'interview:start': { resumeId: string; jobId?: string; config?: any };
  'interview:answer': { content: string; questionId: string };
  'interview:voice': { audioBase64: string; questionId: string };
  'interview:pause': {};
  'interview:resume': {};
  'interview:end': { reason: 'user' | 'timeout' | 'completed' | 'error' };
  'ping': { timestamp: number };
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
}

export interface ResumeSummary {
  name: string;
  summary: string;
  skills: string[];
  projects: Array<{ name: string; description: string; technologies: string[] }>;
}

export interface OptimizationResult {
  suggestions: Array<{
    priority: 'high' | 'medium' | 'low';
    category: 'content' | 'format' | 'keywords';
    issue: string;
    suggestion: string;
    example: string;
  }>;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  questionId?: string;
  evaluation?: RealtimeEvaluation;
  timestamp: number;
  isStreaming?: boolean;
}

export interface InterviewState {
  sessionId: string | null;
  stage: InterviewStage;
  status: 'idle' | 'connecting' | 'interviewing' | 'paused' | 'ended' | 'error';
  currentQuestion: Question | null;
  questionSequence: number;
  progress: { current: number; total: number; elapsedTime: number };
}
