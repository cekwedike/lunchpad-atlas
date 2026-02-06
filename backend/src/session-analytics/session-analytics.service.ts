import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';

interface AIAnalysisResult {
  engagementScore: number;
  participationRate: number;
  averageAttention: number;
  keyTopics: string[];
  insights: {
    strengths: string[];
    improvements: string[];
    recommendations: string[];
  };
  participantAnalysis: Array<{
    userId: string;
    engagement: number;
    participation: number;
    questions: number;
  }>;
}

@Injectable()
export class SessionAnalyticsService {
  private openai: OpenAI;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  /**
   * Analyze session transcript using OpenAI
   */
  async analyzeSessionWithAI(sessionId: string, transcript: string): Promise<AIAnalysisResult> {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    const prompt = `Analyze this LaunchPad fellowship session transcript and provide detailed insights:

${transcript}

Please provide a JSON response with the following structure:
{
  "engagementScore": <0-100>,
  "participationRate": <0-100>,
  "averageAttention": <0-100>,
  "keyTopics": ["topic1", "topic2", ...],
  "insights": {
    "strengths": ["strength1", "strength2", ...],
    "improvements": ["improvement1", "improvement2", ...],
    "recommendations": ["recommendation1", "recommendation2", ...]
  },
  "participantAnalysis": [
    {
      "participantName": "name",
      "engagement": <0-100>,
      "contribution": "brief description"
    }
  ]
}

Consider:
- Overall engagement and energy level
- Quality and depth of discussions
- Participation distribution
- Key learning moments
- Areas for improvement`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert education analyst specializing in evaluating session quality and engagement for a youth leadership development program.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const analysis = JSON.parse(completion.choices[0].message.content);
    
    return {
      engagementScore: analysis.engagementScore,
      participationRate: analysis.participationRate,
      averageAttention: analysis.averageAttention,
      keyTopics: analysis.keyTopics || [],
      insights: analysis.insights || {
        strengths: [],
        improvements: [],
        recommendations: [],
      },
      participantAnalysis: analysis.participantAnalysis || [],
    };
  }

  /**
   * Process and store AI analytics for a session
   */
  async processSessionAnalytics(sessionId: string, transcript: string) {
    // Get existing analytics or create new
    let analytics = await this.prisma.sessionAnalytics.findFirst({
      where: { sessionId },
    });

    if (!analytics) {
      const session = await this.prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          cohort: { include: { fellows: true } },
        },
      });

      if (!session) {
        throw new Error('Session not found');
      }

      analytics = await this.prisma.sessionAnalytics.create({
        data: {
          sessionId,
          totalFellows: session.cohort.fellows.length,
          fellowsAttended: session.attendanceCount || 0,
          avgResourcesCompleted: 0,
          avgPoints: 0,
          transcript,
        },
      });
    }

    // Analyze with AI
    const aiAnalysis = await this.analyzeSessionWithAI(sessionId, transcript);

    // Count questions and interactions from transcript
    const questionMatches = transcript.match(/\?/g) || [];
    const questionCount = questionMatches.length;

    // Update analytics with AI insights
    return this.prisma.sessionAnalytics.update({
      where: { id: analytics.id },
      data: {
        transcript,
        engagementScore: aiAnalysis.engagementScore,
        participationRate: aiAnalysis.participationRate,
        averageAttention: aiAnalysis.averageAttention,
        keyTopics: aiAnalysis.keyTopics,
        insights: aiAnalysis.insights,
        participantAnalysis: aiAnalysis.participantAnalysis,
        questionCount,
        interactionCount: transcript.split('\n').length,
        aiProcessedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get analytics for a specific session
   */
  async getSessionAnalytics(sessionId: string) {
    return this.prisma.sessionAnalytics.findFirst({
      where: { sessionId },
      include: {
        session: {
          include: {
            cohort: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get analytics for all sessions in a cohort
   */
  async getCohortAnalytics(cohortId: string) {
    const sessions = await this.prisma.session.findMany({
      where: { cohortId },
      include: {
        analytics: true,
      },
      orderBy: { date: 'desc' },
    });

    const analytics = sessions.map((session) => session.analytics).filter((a) => a !== null);

    // Calculate cohort-wide averages
    const avgEngagement = analytics.length > 0
      ? analytics.reduce((sum, a) => sum + (a.engagementScore || 0), 0) / analytics.length
      : 0;

    const avgParticipation = analytics.length > 0
      ? analytics.reduce((sum, a) => sum + (a.participationRate || 0), 0) / analytics.length
      : 0;

    const allTopics = analytics.flatMap((a) => (a.keyTopics as string[]) || []);
    const topicCounts = allTopics.reduce((acc, topic) => {
      acc[topic] = (acc[topic] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      cohortId,
      totalSessions: sessions.length,
      analyzedSessions: analytics.length,
      averageEngagement: avgEngagement,
      averageParticipation: avgParticipation,
      topicFrequency: topicCounts,
      sessions: sessions.map((s) => ({
        id: s.id,
        title: s.title,
        date: s.date,
        analytics: s.analytics,
      })),
    };
  }

  /**
   * Generate AI summary for multiple sessions
   */
  async generateCohortInsights(cohortId: string) {
    const cohortData = await this.getCohortAnalytics(cohortId);

    if (!this.openai || cohortData.analyzedSessions === 0) {
      return null;
    }

    const prompt = `Analyze the following cohort session analytics and provide comprehensive insights:

Total Sessions: ${cohortData.totalSessions}
Analyzed Sessions: ${cohortData.analyzedSessions}
Average Engagement: ${cohortData.averageEngagement.toFixed(1)}/100
Average Participation: ${cohortData.averageParticipation.toFixed(1)}/100

Provide insights on:
1. Overall cohort performance trends
2. Areas of strength
3. Opportunities for improvement
4. Specific recommendations for facilitators`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert education analyst providing cohort-level insights.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    return {
      ...cohortData,
      aiInsights: completion.choices[0].message.content,
      generatedAt: new Date(),
    };
  }
}
