import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
  private genAI: GoogleGenerativeAI;
  private model: any;       // JSON-mode model for structured analysis
  private chatModel: any;   // Text model for free-form chat

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    const modelName =
      this.config.get<string>('GEMINI_MODEL') || 'gemini-1.5-flash';

    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      // Structured analysis model — JSON output
      this.model = this.genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.7,
          responseMimeType: 'application/json',
        },
      });
      // Conversational chat model — plain text output
      this.chatModel = this.genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { temperature: 0.8 },
      });
    }
  }

  /**
   * Analyze session transcript using Google Gemini
   */
  async analyzeSessionWithAI(
    sessionId: string,
    transcript: string,
  ): Promise<AIAnalysisResult> {
    if (!this.model) {
      throw new Error('Gemini API key not configured');
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

    const result = await this.model.generateContent([
      {
        role: 'user',
        parts: [
          {
            text: `System: You are an expert education analyst specializing in evaluating session quality and engagement for a youth leadership development program.\n\n${prompt}`,
          },
        ],
      },
    ]);

    const response = await result.response;
    let analysis: any;
    try {
      analysis = JSON.parse(response.text());
    } catch {
      throw new Error('AI returned an unparseable response. Try again or shorten the transcript.');
    }

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

      // Count attendance (all attendance records have checkInTime)
      const attendanceCount = await this.prisma.attendance.count({
        where: { sessionId },
      });

      analytics = await this.prisma.sessionAnalytics.create({
        data: {
          sessionId,
          totalFellows: session.cohort.fellows.length,
          fellowsAttended: attendanceCount,
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
        sessionAnalytics: true,
      },
      orderBy: { scheduledDate: 'desc' },
    });

    const analytics = sessions.flatMap((session) => session.sessionAnalytics);

    // Calculate cohort-wide averages
    const avgEngagement =
      analytics.length > 0
        ? analytics.reduce((sum, a) => sum + (a.engagementScore || 0), 0) /
          analytics.length
        : 0;

    const avgParticipation =
      analytics.length > 0
        ? analytics.reduce((sum, a) => sum + (a.participationRate || 0), 0) /
          analytics.length
        : 0;

    const allTopics = analytics.flatMap((a) => (a.keyTopics as string[]) || []);
    const topicCounts = allTopics.reduce(
      (acc, topic) => {
        acc[topic] = (acc[topic] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

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
        date: s.scheduledDate,
        analytics: s.sessionAnalytics[0] || null,
      })),
    };
  }

  /**
   * Multi-turn AI chat about a session transcript.
   * history: array of {role:'user'|'model', content: string} prior turns.
   */
  async chatAboutSession(
    sessionId: string,
    message: string,
    transcript?: string,
    history: Array<{ role: 'user' | 'model'; content: string }> = [],
  ): Promise<{ reply: string }> {
    if (!this.chatModel) {
      throw new Error('Gemini API key not configured');
    }

    // Fall back to stored transcript if none provided
    let context = transcript;
    if (!context) {
      const analytics = await this.prisma.sessionAnalytics.findFirst({
        where: { sessionId },
        select: { transcript: true },
      });
      context = analytics?.transcript || '';
    }

    const systemInstruction = `You are an expert education analyst for the LaunchPad fellowship program. You help facilitators review session transcripts, understand participation and engagement, and suggest points for fellows.

${context ? `Session Transcript:\n${context}\n` : 'No transcript has been uploaded for this session yet — you can still answer general questions.'}

Be specific and actionable. When suggesting points, use a 0-100 scale per fellow and reference the transcript where possible.`;

    // Build the chat with prior history
    const chat = this.chatModel.startChat({
      history: [
        // Inject system context as the very first user/model exchange
        {
          role: 'user',
          parts: [{ text: systemInstruction }],
        },
        {
          role: 'model',
          parts: [{ text: 'Understood. I\'m ready to help you review the session. What would you like to know?' }],
        },
        // Replay the conversation history
        ...history.map((turn) => ({
          role: turn.role,
          parts: [{ text: turn.content }],
        })),
      ],
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    return { reply: response.text() };
  }

  /**
   * Generate AI summary for multiple sessions
   */
  async generateCohortInsights(cohortId: string) {
    const cohortData = await this.getCohortAnalytics(cohortId);

    if (!this.model || cohortData.analyzedSessions === 0) {
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

    const result = await this.model.generateContent([
      {
        role: 'user',
        parts: [
          {
            text: `System: You are an expert education analyst providing cohort-level insights.\n\n${prompt}`,
          },
        ],
      },
    ]);

    const response = await result.response;

    return {
      ...cohortData,
      aiInsights: response.text(),
      generatedAt: new Date(),
    };
  }
}
