import {
  Injectable,
  BadGatewayException,
  NotFoundException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';

interface FellowParticipation {
  name: string;
  participationScore: number;
  contributionSummary: string;
  suggestedPoints: number;
}

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
  fellowParticipation: FellowParticipation[];
}

@Injectable()
export class SessionAnalyticsService {
  private readonly openRouterApiKey: string | null;
  private readonly openRouterBaseUrl = 'https://openrouter.ai/api/v1/chat/completions';
  private readonly openRouterReferer: string | null;
  private readonly openRouterTitle: string | null;
  private readonly modelCooldownUntil = new Map<string, number>();
  private static readonly BLOCKED_OPENROUTER_MODEL_IDS = new Set([
    'qwen/qwen2.5-72b-instruct:free',
  ]);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.openRouterApiKey =
      this.config.get<string>('OPENROUTER_API_KEY')?.trim() || null;
    this.openRouterReferer =
      this.config.get<string>('OPENROUTER_HTTP_REFERER')?.trim() || null;
    this.openRouterTitle =
      this.config.get<string>('OPENROUTER_APP_TITLE')?.trim() || null;
  }

  private sanitizeOpenRouterModelId(raw: string | undefined): string | null {
    const id = raw?.trim();
    if (!id) return null;
    if (SessionAnalyticsService.BLOCKED_OPENROUTER_MODEL_IDS.has(id)) return null;
    return id;
  }

  private getOpenRouterModelCandidates(): string[] {
    const primary =
      this.sanitizeOpenRouterModelId(this.config.get<string>('OPENROUTER_MODEL')) ??
      'qwen/qwen3.6-plus';
    const fallbackRaw =
      this.config.get<string>('OPENROUTER_MODEL_FALLBACKS') || '';
    const fallbackFromEnv = fallbackRaw
      .split(',')
      .map((s) => this.sanitizeOpenRouterModelId(s))
      .filter((x): x is string => x !== null);
    const safeDefaults = [
      'qwen/qwen3-coder:free',
      'anthropic/claude-opus-4.6-fast',
    ];
    return [primary, ...fallbackFromEnv, ...safeDefaults].filter(
      (value, index, arr) => value && arr.indexOf(value) === index,
    );
  }

  private isRetryableProviderError(err: unknown): boolean {
    const msg = err instanceof Error ? err.message : String(err ?? '');
    return /429|503|rate limit|resource has been exhausted|temporarily unavailable|overloaded/i.test(
      msg,
    );
  }

  private coerceScore(value: unknown, fallback = 0): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.max(0, Math.min(100, value));
    }
    if (typeof value === 'string') {
      const parsed = Number(value.replace('%', '').trim());
      if (Number.isFinite(parsed)) return Math.max(0, Math.min(100, parsed));
    }
    return fallback;
  }

  private coerceStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
      .map((v) => (typeof v === 'string' ? v.trim() : ''))
      .filter(Boolean);
  }

  private normalizeAiAnalysis(analysis: any): AIAnalysisResult {
    const normalizedInsights = {
      strengths: this.coerceStringArray(analysis?.insights?.strengths),
      improvements: this.coerceStringArray(analysis?.insights?.improvements),
      recommendations: this.coerceStringArray(analysis?.insights?.recommendations),
    };

    const fellowParticipation: FellowParticipation[] = Array.isArray(
      analysis?.fellowParticipation,
    )
      ? analysis.fellowParticipation.map((f: any) => ({
          name: typeof f?.name === 'string' ? f.name.trim() : 'Unknown Fellow',
          participationScore: this.coerceScore(f?.participationScore, 0),
          contributionSummary:
            typeof f?.contributionSummary === 'string'
              ? f.contributionSummary
              : '',
          suggestedPoints: Math.round(this.coerceScore(f?.suggestedPoints, 0) / 2),
        }))
      : [];

    return {
      engagementScore: this.coerceScore(analysis?.engagementScore, 0),
      participationRate: this.coerceScore(analysis?.participationRate, 0),
      averageAttention: this.coerceScore(analysis?.averageAttention, 0),
      keyTopics: this.coerceStringArray(analysis?.keyTopics),
      insights: normalizedInsights,
      fellowParticipation,
    };
  }

  private isOnCooldown(modelName: string): boolean {
    const until = this.modelCooldownUntil.get(modelName);
    return typeof until === 'number' && until > Date.now();
  }

  private markCooldown(modelName: string, ms = 30_000): void {
    this.modelCooldownUntil.set(modelName, Date.now() + ms);
  }

  private async callOpenRouterChatCompletions(
    model: string,
    prompt: string,
    temperature: number,
  ): Promise<string> {
    if (!this.openRouterApiKey) {
      throw new ServiceUnavailableException(
        'OpenRouter is not configured on the backend',
      );
    }
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.openRouterApiKey}`,
      'Content-Type': 'application/json',
    };
    if (this.openRouterReferer) {
      headers['HTTP-Referer'] = this.openRouterReferer;
    }
    if (this.openRouterTitle) {
      headers['X-OpenRouter-Title'] = this.openRouterTitle;
    }

    const response = await fetch(this.openRouterBaseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        temperature,
        model,
        reasoning: { enabled: true },
      }),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenRouter ${response.status}: ${text}`);
    }
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }>;
    };
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      const joined = content
        .map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
        .join('')
        .trim();
      if (joined) return joined;
    }

    throw new Error('OpenRouter response missing message content');
  }

  private async generateContentWithOpenRouterFallback(
    prompt: string,
    temperature: number,
  ): Promise<{ response: Promise<{ text: () => string }> }> {
    const candidates = this.getOpenRouterModelCandidates();
    const ordered = [
      ...candidates.filter((m) => !this.isOnCooldown(m)),
      ...candidates.filter((m) => this.isOnCooldown(m)),
    ];
    let lastError: unknown = null;

    for (const modelName of ordered) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const text = await this.callOpenRouterChatCompletions(
            modelName,
            prompt,
            temperature,
          );
          return {
            response: Promise.resolve({
              text: () => text,
            }),
          };
        } catch (err) {
          lastError = err;
          if (!this.isRetryableProviderError(err)) break;
          this.markCooldown(modelName);
          const backoffMs = 600 * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }
      }
    }

    const message =
      lastError instanceof Error ? lastError.message : 'unknown error';
    throw new BadGatewayException(`OpenRouter API error: ${message}`);
  }

  async getAiProviderHealth(): Promise<{
    activeProvider: 'openrouter' | 'none';
    openRouterConfigured: boolean;
    openRouterModels: string[];
    probe: { ok: boolean; message: string };
  }> {
    const activeProvider = this.openRouterApiKey ? 'openrouter' : 'none';

    if (activeProvider === 'none') {
      return {
        activeProvider,
        openRouterConfigured: false,
        openRouterModels: [],
        probe: {
          ok: false,
          message: 'No AI provider configured (set OPENROUTER_API_KEY)',
        },
      };
    }

    try {
      const result = await this.generateContentWithFallback(
        'Return exactly this JSON: {"ok":true}',
        0,
      );
      const response = await result.response;
      const raw = response.text().trim();
      return {
        activeProvider,
        openRouterConfigured: Boolean(this.openRouterApiKey),
        openRouterModels: this.openRouterApiKey
          ? this.getOpenRouterModelCandidates()
          : [],
        probe: {
          ok: true,
          message: raw.slice(0, 220),
        },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        activeProvider,
        openRouterConfigured: Boolean(this.openRouterApiKey),
        openRouterModels: this.openRouterApiKey
          ? this.getOpenRouterModelCandidates()
          : [],
        probe: {
          ok: false,
          message,
        },
      };
    }
  }

  /** Enforce cohort-scoped analytics access (session-analytics IDOR fix). */
  async assertViewerCanAccessCohort(viewerId: string, cohortId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: viewerId },
      select: { role: true, cohortId: true },
    });
    if (!user) throw new ForbiddenException('User not found');
    if (user.role === UserRole.ADMIN) return;
    if (user.role === UserRole.GUEST_FACILITATOR) {
      const guest = await this.prisma.guestSession.findFirst({
        where: { userId: viewerId, session: { cohortId } },
      });
      if (guest) return;
      throw new ForbiddenException('You cannot access analytics for this cohort');
    }
    if (user.role === UserRole.FELLOW && user.cohortId === cohortId) return;
    if (user.role === UserRole.FACILITATOR) {
      const link = await this.prisma.cohortFacilitator.findFirst({
        where: { userId: viewerId, cohortId },
      });
      if (link) return;
    }
    throw new ForbiddenException('You cannot access analytics for this cohort');
  }

  async assertViewerCanAccessSession(viewerId: string, sessionId: string): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { cohortId: true },
    });
    if (!session) throw new NotFoundException('Session not found');

    const user = await this.prisma.user.findUnique({
      where: { id: viewerId },
      select: { role: true, cohortId: true },
    });
    if (!user) throw new ForbiddenException('User not found');
    if (user.role === UserRole.ADMIN) return;

    if (user.role === UserRole.GUEST_FACILITATOR) {
      const guest = await this.prisma.guestSession.findFirst({
        where: { userId: viewerId, sessionId },
      });
      if (!guest) throw new ForbiddenException('You cannot access this session');
      return;
    }

    await this.assertViewerCanAccessCohort(viewerId, session.cohortId);
  }

  /**
   * Analyze session transcript using Google Gemini
   */
  async analyzeSessionWithAI(
    _sessionId: string,
    transcript: string,
    fellows: Array<{ id: string; name: string }> = [],
  ): Promise<AIAnalysisResult> {
    if (!this.openRouterApiKey) {
      throw new ServiceUnavailableException(
        'OpenRouter is not configured on the backend',
      );
    }

    const fellowsSection = fellows.length > 0
      ? `\nRegistered cohort fellows:\n${fellows.map((f) => `- ${f.name}`).join('\n')}\n`
      : '';

    const prompt = `Analyze this LaunchPad fellowship session transcript and provide detailed insights.
${fellowsSection}
Transcript:
${transcript}

Please provide a JSON response with the following structure:
{
  "engagementScore": <0-100 overall session score>,
  "participationRate": <0-100 percentage of fellows who spoke>,
  "averageAttention": <0-100 estimated attention level>,
  "keyTopics": ["topic1", "topic2", ...],
  "insights": {
    "strengths": ["strength1", ...],
    "improvements": ["improvement1", ...],
    "recommendations": ["recommendation1", ...]
  },
  "fellowParticipation": [
    {
      "name": "<fellow name as it appears in transcript>",
      "participationScore": <0-100>,
      "contributionSummary": "<1-2 sentence description of their contribution>",
      "suggestedPoints": <0-50 points to award>
    }
  ]
}

For fellowParticipation:
- Only include fellows whose names appear in the transcript (match first name, last name, or common variations).
${fellows.length > 0 ? '- Cross-reference against the registered fellows list above.' : ''}
- suggestedPoints guide: 1-10 = brief mention, 11-25 = moderate engagement, 26-40 = active participation, 41-50 = exceptional leadership/contribution.
- If no fellows are identifiable in the transcript, return an empty array.

Consider:
- Overall engagement and energy level
- Quality and depth of discussions
- Participation distribution
- Key learning moments
- Areas for improvement`;

    const result = await this.generateContentWithFallback(
      `System: You are an expert education analyst specializing in evaluating session quality and engagement for a youth leadership development program.\n\n${prompt}`,
      0.7,
    );
    const response = await result.response;
    let analysis: any;
    try {
      const raw = response.text();
      // Strip all markdown code fences (thinking models often add explanatory text around JSON)
      const stripped = raw.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/gi, '').trim();
      // Extract the first JSON object from the response
      const jsonMatch = stripped.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new SyntaxError('No JSON object found');
      analysis = JSON.parse(jsonMatch[0]);
    } catch {
      throw new BadGatewayException('AI returned an unparseable response. Try again or shorten the transcript.');
    }
    return this.normalizeAiAnalysis(analysis);
  }

  /**
   * Process and store AI analytics for a session
   */
  async processSessionAnalytics(sessionId: string, transcript: string, viewerId: string) {
    await this.assertViewerCanAccessSession(viewerId, sessionId);

    // Always fetch session with fellows for participation analysis
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        cohort: { include: { fellows: true } },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const fellows = session.cohort.fellows.map((f) => ({ id: f.id, name: `${f.firstName} ${f.lastName}` }));

    // Get existing analytics or create new
    let analytics = await this.prisma.sessionAnalytics.findFirst({
      where: { sessionId },
    });

    if (!analytics) {
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

    // Analyze with AI — pass fellows so Gemini can grade participation
    const aiAnalysis = await this.analyzeSessionWithAI(sessionId, transcript, fellows);

    // Count questions and interactions from transcript
    const questionMatches = transcript.match(/\?/g) || [];
    const questionCount = questionMatches.length;

    // Update analytics with AI insights (store fellowParticipation in participantAnalysis JSON field)
    return this.prisma.sessionAnalytics.update({
      where: { id: analytics.id },
      data: {
        transcript,
        engagementScore: aiAnalysis.engagementScore,
        participationRate: aiAnalysis.participationRate,
        averageAttention: aiAnalysis.averageAttention,
        keyTopics: aiAnalysis.keyTopics,
        insights: aiAnalysis.insights,
        participantAnalysis: aiAnalysis.fellowParticipation as unknown as object[],
        questionCount,
        interactionCount: transcript.split('\n').length,
        aiProcessedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete analytics for a specific session
   */
  async deleteSessionAnalytics(sessionId: string) {
    const analytics = await this.prisma.sessionAnalytics.findFirst({
      where: { sessionId },
    });
    if (!analytics) {
      throw new NotFoundException('No analytics found for this session');
    }
    return this.prisma.sessionAnalytics.delete({
      where: { id: analytics.id },
    });
  }

  /**
   * Get analytics for a specific session
   */
  async getSessionAnalytics(sessionId: string, viewerId: string) {
    await this.assertViewerCanAccessSession(viewerId, sessionId);

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
  async getCohortAnalytics(cohortId: string, viewerId: string) {
    await this.assertViewerCanAccessCohort(viewerId, cohortId);

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
    viewerId: string,
    message: string,
    transcript?: string,
    history: Array<{ role: 'user' | 'model'; content: string }> = [],
  ): Promise<{ reply: string }> {
    await this.assertViewerCanAccessSession(viewerId, sessionId);

    if (!this.openRouterApiKey) {
      throw new ServiceUnavailableException(
        'OpenRouter is not configured on the backend',
      );
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

    const historyBlock = history
      .map((turn) => `${turn.role === 'user' ? 'User' : 'Assistant'}: ${turn.content}`)
      .join('\n');
    const chatPrompt = `${systemInstruction}

Conversation history:
${historyBlock || '(none)'}

User: ${message}
Assistant:`;

    const result = await this.generateContentWithFallback(chatPrompt, 0.8);
    const response = await result.response;
    return { reply: response.text() };
  }

  /**
   * Generate AI summary for multiple sessions
   */
  async generateCohortInsights(cohortId: string, viewerId: string) {
    const cohortData = await this.getCohortAnalytics(cohortId, viewerId);

    if (!this.openRouterApiKey || cohortData.analyzedSessions === 0) {
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

    const result = await this.generateContentWithFallback(
      `System: You are an expert education analyst providing cohort-level insights.\n\n${prompt}`,
      0.7,
    );

    const response = await result.response;

    return {
      ...cohortData,
      aiInsights: response.text(),
      generatedAt: new Date(),
    };
  }
}
