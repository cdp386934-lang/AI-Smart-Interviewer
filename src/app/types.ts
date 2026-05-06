export type InterviewStage = 'idle' | 'resume_confirm' | 'self_intro' | 'technical' | 'project_deep' | 'behavioral' | 'coding' | 'q_and_a' | 'ended';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    questionType?: string;
    evaluation?: {
      score: number;
      feedback: string;
      keywordsMatched: string[];
    };
  };
}

export interface InterviewState {
  sessionId: string | null;
  stage: InterviewStage;
  currentQuestion?: string;
  currentSkill?: string;
  questionIndex: number;
  totalQuestions: number;
  timeSpent: number;
  currentScore: number;
  jobTitle?: string;
  resumeId?: string;
}

export interface SkillRadarPoint {
  label: string;
  value: number;
}

export interface ResumeSummary {
  id: string;
  name: string;
  summary: string;
  skills: string[];
  projects: Array<{ name: string; description: string; technologies: string[] }>;
}

export interface JobCard {
  id: string;
  title: string;
  company: string;
  level: 'junior' | 'mid' | 'senior' | 'lead';
  description: string;
  requiredSkills: string[];
}

export interface ReportData {
  sessionId: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  overallScore: number;
  hiringRecommendation: 'strongly_recommend' | 'recommend' | 'pending' | 'not_recommend';
  skillRadar: Record<string, number>;
  stagePerformance: Record<string, { averageScore: number; questionCount: number; feedback: string }>;
  detailedAnalysis: { technical: string; communication: string; logic: string; experience: string };
}
