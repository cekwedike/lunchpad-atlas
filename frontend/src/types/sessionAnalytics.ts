export interface SessionAnalytics {
  id: string;
  sessionId: string;
  totalFellows: number;
  fellowsAttended: number;
  avgResourcesCompleted: number;
  avgPoints: number;
  
  // AI-Generated Analytics
  transcript?: string;
  engagementScore?: number; // 0-100
  participationRate?: number; // 0-100
  averageAttention?: number; // 0-100
  keyTopics?: string[];
  insights?: {
    strengths?: string[];
    improvements?: string[];
    recommendations?: string[];
  };
  participantAnalysis?: ParticipantAnalysis[];
  questionCount: number;
  interactionCount: number;
  aiProcessedAt?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface ParticipantAnalysis {
  userId: string;
  userName: string;
  engagementLevel: 'high' | 'medium' | 'low';
  contributionCount: number;
  questionsAsked: number;
  attentionScore: number;
}

export interface CohortAnalytics {
  cohortId: string;
  totalSessions: number;
  analyzedSessions: number;
  averageEngagement: number;
  averageParticipation: number;
  averageAttention: number;
  totalQuestions: number;
  topTopics: { topic: string; count: number }[];
  sessions: {
    sessionId: string;
    sessionNumber: number;
    title: string;
    date: string;
    analytics: SessionAnalytics;
  }[];
}

export interface CohortInsights {
  summary: string;
  strengths: string[];
  challenges: string[];
  recommendations: string[];
  trends: {
    engagement: 'improving' | 'stable' | 'declining';
    participation: 'improving' | 'stable' | 'declining';
    attention: 'improving' | 'stable' | 'declining';
  };
}
