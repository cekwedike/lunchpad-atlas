import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface DiscussionQualityAnalysis {
  score: number; // 0-100
  depth: number; // 0-10
  relevance: number; // 0-10
  constructiveness: number; // 0-10
  insights: string[];
  suggestions: string[];
  badge?: 'High Quality' | 'Insightful' | 'Helpful' | null;
}

interface ResourceSummaryResult {
  summary: string;
  keyPoints: string[];
}

@Injectable()
export class DiscussionScoringService {
  private readonly openRouterApiKey: string | null;
  private readonly openRouterBaseUrl = 'https://openrouter.ai/api/v1/chat/completions';
  private readonly openRouterReferer: string | null;
  private readonly openRouterTitle: string | null;
  private readonly openRouterMaxTokens: number;

  /** Invalid/retired model IDs — never use. */
  private static readonly BLOCKED_MODEL_IDS = new Set([
    'qwen/qwen2.5-72b-instruct:free',
  ]);

  constructor(private configService: ConfigService) {
    this.openRouterApiKey =
      this.configService.get<string>('OPENROUTER_API_KEY')?.trim() || null;
    this.openRouterReferer =
      this.configService.get<string>('OPENROUTER_HTTP_REFERER')?.trim() || null;
    this.openRouterTitle =
      this.configService.get<string>('OPENROUTER_APP_TITLE')?.trim() || null;
    const maxTokensRaw =
      this.configService.get<string>('OPENROUTER_MAX_TOKENS');
    const parsedMaxTokens = Number(maxTokensRaw);
    this.openRouterMaxTokens =
      Number.isFinite(parsedMaxTokens) && parsedMaxTokens > 0
        ? Math.floor(parsedMaxTokens)
        : 800;
  }

  /** Drop blocked IDs; return null if nothing usable. */
  private sanitizeModelId(raw: string | undefined): string | null {
    const id = raw?.trim();
    if (!id) return null;
    if (DiscussionScoringService.BLOCKED_MODEL_IDS.has(id)) {
      return null;
    }
    return id;
  }

  private defaultPrimaryModel(): string {
    return 'qwen/qwen3.6-plus';
  }

  /** Primary + fallbacks, deduped — must match what `generateWithRetry` uses. */
  private getModelCandidates(): string[] {
    const primary =
      this.sanitizeModelId(
        this.configService.get<string>('OPENROUTER_MODEL') ||
          this.defaultPrimaryModel(),
      ) ?? this.defaultPrimaryModel();
    const fallbacks = this.getFallbackModels().filter((m) => m !== primary);
    return [primary, ...fallbacks].filter((v, i, a) => a.indexOf(v) === i);
  }

  private getModel() {
    const modelName =
      this.sanitizeModelId(
        this.configService.get<string>('OPENROUTER_MODEL') ||
          this.defaultPrimaryModel(),
      ) ?? this.defaultPrimaryModel();
    return modelName;
  }

  /**
   * Env list is merged with safe defaults (deduped) so a bad or stale
   * OPENROUTER_MODEL_FALLBACKS value cannot wipe working fallbacks.
   * Blocked/retired IDs are always stripped.
   */
  private getFallbackModels(): string[] {
    const raw =
      this.configService.get<string>('OPENROUTER_MODEL_FALLBACKS') || '';
    const fromEnv = raw
      .split(',')
      .map((s) => this.sanitizeModelId(s))
      .filter((x): x is string => x !== null);
    const safeDefaults = [
      'openai/gpt-oss-120b:free',
      'z-ai/glm-4.5-air:free',
      'minimax/minimax-m2.5:free',
    ];
    const merged = [...fromEnv, ...safeDefaults];
    return merged.filter((v, i, a) => a.indexOf(v) === i);
  }

  private async generateWithRetry(prompt: string) {
    if (!this.openRouterApiKey) {
      throw new Error('OpenRouter API key not configured');
    }
    const candidates = this.getModelCandidates();

    let lastErr: unknown = null;
    for (const modelName of candidates) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const headers: Record<string, string> = {
            Authorization: `Bearer ${this.openRouterApiKey}`,
            'Content-Type': 'application/json',
          };
          if (this.openRouterReferer) headers['HTTP-Referer'] = this.openRouterReferer;
          if (this.openRouterTitle) headers['X-OpenRouter-Title'] = this.openRouterTitle;
          const response = await fetch(this.openRouterBaseUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model: modelName,
              messages: [{ role: 'user', content: prompt }],
              reasoning: { enabled: true },
              temperature: 0.2,
              max_tokens: this.openRouterMaxTokens,
            }),
          });
          if (!response.ok) {
            const textErr = await response.text();
            throw new Error(`OpenRouter ${response.status}: ${textErr}`);
          }
          const completion = (await response.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const content = completion.choices?.[0]?.message?.content || '';
          return { response: { text: () => content } };
        } catch (err) {
          lastErr = err;
          const msg = err instanceof Error ? err.message : String(err);
          // Retry on common free-tier transient failures
          const retryable =
            /503|429|resource has been exhausted|temporarily unavailable|overloaded/i.test(
              msg,
            );
          if (!retryable) break;
          const backoffMs = 600 * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, backoffMs));
        }
      }
    }
    throw lastErr instanceof Error
      ? lastErr
      : new Error('OpenRouter analysis failed');
  }

  private clampScore(value: number, min: number, max: number) {
    if (Number.isNaN(value)) return min;
    return Math.min(max, Math.max(min, value));
  }

  private coerceArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item) => typeof item === 'string' && item.trim().length > 0);
  }

  private buildBadge(
    score: number,
    depth: number,
    relevance: number,
    constructiveness: number,
    maxScore: number = 100,
  ) {
    const highThreshold = Math.round(maxScore * 0.8);
    const insightThreshold = Math.round(maxScore * 0.7);
    const helpfulThreshold = Math.round(maxScore * 0.6);

    if (score >= highThreshold && depth >= 8) return 'High Quality';
    if (score >= insightThreshold && constructiveness >= 8) return 'Insightful';
    if (score >= helpfulThreshold && relevance >= 7) return 'Helpful';
    return null;
  }

  private parseAnalysisPayload(
    payload: string,
    maxScore: number = 100,
  ): DiscussionQualityAnalysis {
    let parsed: any = null;

    try {
      parsed = JSON.parse(payload);
    } catch (error) {
      const jsonMatch = payload.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw error;
      }
      parsed = JSON.parse(jsonMatch[0]);
    }

    const depth = this.clampScore(Number(parsed?.depth ?? 0), 0, 10);
    const relevance = this.clampScore(Number(parsed?.relevance ?? 0), 0, 10);
    const constructiveness = this.clampScore(Number(parsed?.constructiveness ?? 0), 0, 10);

    const score = Math.round(
      (depth * 0.35 + relevance * 0.35 + constructiveness * 0.3) *
        (maxScore / 10),
    );

    const insights = this.coerceArray(parsed?.insights);
    const suggestions = this.coerceArray(parsed?.suggestions);
    const badge = parsed?.badge || this.buildBadge(score, depth, relevance, constructiveness, maxScore);

    return {
      score,
      depth,
      relevance,
      constructiveness,
      insights,
      suggestions,
      badge,
    };
  }

  private applyLeniency(
    analysis: DiscussionQualityAnalysis,
    maxScore: number,
    minDimension: number,
  ): DiscussionQualityAnalysis {
    if (minDimension <= 0) return analysis;

    const depth = Math.min(10, Math.max(minDimension, analysis.depth));
    const relevance = Math.min(10, Math.max(minDimension, analysis.relevance));
    const constructiveness = Math.min(10, Math.max(minDimension, analysis.constructiveness));
    const score = Math.round(
      (depth * 0.35 + relevance * 0.35 + constructiveness * 0.3) *
        (maxScore / 10),
    );

    return {
      ...analysis,
      depth,
      relevance,
      constructiveness,
      score,
      badge: this.buildBadge(score, depth, relevance, constructiveness, maxScore),
    };
  }

  async getAiStatus(): Promise<{ available: boolean; message?: string }> {
    if (!this.openRouterApiKey) {
      return {
        available: false,
        message:
          'OPENROUTER_API_KEY is empty or whitespace — set it in the backend environment and restart.',
      };
    }

    // Same models as scoring: primary can fail (e.g. wrong name/region) while fallbacks work.
    const candidates = this.getModelCandidates();
    let lastErr: unknown = null;

    for (const modelName of candidates) {
      try {
        const headers: Record<string, string> = {
          Authorization: `Bearer ${this.openRouterApiKey}`,
          'Content-Type': 'application/json',
        };
        if (this.openRouterReferer) headers['HTTP-Referer'] = this.openRouterReferer;
        if (this.openRouterTitle) headers['X-OpenRouter-Title'] = this.openRouterTitle;
        const response = await fetch(this.openRouterBaseUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: modelName,
            messages: [{ role: 'user', content: 'Return JSON: {"ok": true}' }],
            reasoning: { enabled: true },
            temperature: 0,
            max_tokens: this.openRouterMaxTokens,
          }),
        });
        if (!response.ok) {
          const textErr = await response.text();
          throw new Error(`OpenRouter ${response.status}: ${textErr}`);
        }
        return { available: true };
      } catch (error) {
        lastErr = error;
        console.error(
          `OpenRouter availability check failed for model ${modelName}:`,
          error,
        );
      }
    }

    const lastMsg =
      lastErr instanceof Error ? lastErr.message : String(lastErr ?? 'unknown');
    const short =
      lastMsg.length > 320 ? `${lastMsg.slice(0, 320)}…` : lastMsg;
    return {
      available: false,
      message: `No working OpenRouter model in this chain: ${candidates.join(' -> ')}. Last error: ${short}`,
    };
  }

  async scoreDiscussion(
    title: string,
    content: string,
    resourceContext?: string,
  ): Promise<DiscussionQualityAnalysis> {
    if (!this.openRouterApiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    // TOON-style compact rubric block (token efficient vs verbose JSON schema prose)
    const rubric = `rubric:
  dims[3]{depth,relevance,constructiveness}
  scale 0..10(int)
  score = round((depth*0.35+relevance*0.35+constructiveness*0.30)*10)
  badges{HighQuality:"score>=80 & depth>=8",Insightful:"score>=70 & constructiveness>=8",Helpful:"score>=60 & relevance>=7"}
output:
  {depth:int,relevance:int,constructiveness:int,insights[str],suggestions[str],badge[HighQuality|Insightful|Helpful|null]}`;

    const prompt = `You are a rubric-based reviewer for a career development learning platform.
Analyze the discussion post and provide actionable, specific feedback.
Be generous when the post is on-topic and coherent.

Discussion Post:
Title: ${title}
Content: ${content}
${resourceContext ? `Learning Context: ${resourceContext}` : ''}

${rubric}

Return integer values 1-10 unless the content is empty (then use 0).
Avoid scores below 4 if the post is on-topic and clear.
Do not include markdown or extra text.`;

    try {
      const result = await this.generateWithRetry(prompt);
      const text = result.response.text();
      let analysis = this.parseAnalysisPayload(text, 100);
      const normalizedContent = content.replace(/\s+/g, ' ').trim();
      let minDimension = 0;
      if (normalizedContent.length >= 40) minDimension = 3;
      if (normalizedContent.length >= 120) minDimension = 4;
      analysis = this.applyLeniency(analysis, 100, minDimension);
      return analysis;
    } catch (error) {
      console.error('Error scoring discussion:', error);
      const message =
        error instanceof Error ? error.message : 'OpenRouter analysis failed';
      throw new Error(message);
    }
  }

  async scoreComment(
    content: string,
    discussionTitle?: string,
    discussionContext?: string,
    learningContext?: string,
  ): Promise<DiscussionQualityAnalysis> {
    if (!this.openRouterApiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const rubric = `rubric:
  dims[3]{depth,relevance,constructiveness}
  scale 0..10(int)
  score = round((depth*0.35+relevance*0.35+constructiveness*0.30)*5)
  badges{HighQuality:"score>=40 & depth>=8",Insightful:"score>=35 & constructiveness>=8",Helpful:"score>=30 & relevance>=7"}
output:
  {depth:int,relevance:int,constructiveness:int,insights[str],suggestions[str],badge[HighQuality|Insightful|Helpful|null]}`;

    const prompt = `You are a rubric-based reviewer for a career development learning platform.
Analyze the comment and provide actionable, specific feedback.
Be generous when the comment is on-topic and respectful.

Discussion Title: ${discussionTitle || 'N/A'}
${discussionContext ? `Discussion Context: ${discussionContext}` : ''}
${learningContext ? `Learning Context: ${learningContext}` : ''}
Comment: ${content}

${rubric}

Return integer values 1-10 unless the content is empty (then use 0).
Avoid scores below 3 if the comment is on-topic and clear.
Do not include markdown or extra text.`;

    try {
      const result = await this.generateWithRetry(prompt);
      const text = result.response.text();
      let analysis = this.parseAnalysisPayload(text, 50);
      const normalizedContent = content.replace(/\s+/g, ' ').trim();
      let minDimension = 0;
      if (normalizedContent.length >= 20) minDimension = 3;
      if (normalizedContent.length >= 80) minDimension = 4;
      analysis = this.applyLeniency(analysis, 50, minDimension);
      return analysis;
    } catch (error) {
      console.error('Error scoring comment:', error);
      const message =
        error instanceof Error ? error.message : 'OpenRouter analysis failed';
      throw new Error(message);
    }
  }

  async summarizeResourceContent(
    title: string,
    content: string,
    resourceType?: string,
  ): Promise<ResourceSummaryResult> {
    if (!this.openRouterApiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const model = this.getModel();

    const prompt = `You are summarizing learning resources for a career development platform.
Create a concise, factual summary and key points.

Resource Title: ${title}
Resource Type: ${resourceType || 'N/A'}
Content:
${content}

Return ONLY JSON with this shape:
{
  "summary": "<3-5 sentences>",
  "keyPoints": ["<3-6 bullet points>"]
}

Do not include markdown or extra text.`;

    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.openRouterApiKey}`,
        'Content-Type': 'application/json',
      };
      if (this.openRouterReferer) headers['HTTP-Referer'] = this.openRouterReferer;
      if (this.openRouterTitle) headers['X-OpenRouter-Title'] = this.openRouterTitle;
      const response = await fetch(this.openRouterBaseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          reasoning: { enabled: true },
          temperature: 0.2,
          max_tokens: this.openRouterMaxTokens,
        }),
      });
      if (!response.ok) {
        const textErr = await response.text();
        throw new Error(`OpenRouter ${response.status}: ${textErr}`);
      }
      const completion = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = completion.choices?.[0]?.message?.content || '';
      const parsed = JSON.parse(text);
      return {
        summary: typeof parsed?.summary === 'string' ? parsed.summary : '',
        keyPoints: Array.isArray(parsed?.keyPoints)
          ? parsed.keyPoints.filter((item: unknown) => typeof item === 'string')
          : [],
      };
    } catch (error) {
      console.error('Error summarizing resource content:', error);
      const message =
        error instanceof Error ? error.message : 'OpenRouter analysis failed';
      throw new Error(message);
    }
  }

  async batchScoreDiscussions(
    discussions: Array<{ id: string; title: string; content: string }>,
  ): Promise<Map<string, DiscussionQualityAnalysis>> {
    const results = new Map<string, DiscussionQualityAnalysis>();

    for (const discussion of discussions) {
      try {
        const analysis = await this.scoreDiscussion(
          discussion.title,
          discussion.content,
        );
        results.set(discussion.id, analysis);

        // Rate limiting - wait 1 second between requests
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to score discussion ${discussion.id}:`, error);
      }
    }

    return results;
  }
}
