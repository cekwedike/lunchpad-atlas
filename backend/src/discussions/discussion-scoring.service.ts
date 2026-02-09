import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
  private genAI: GoogleGenerativeAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  private getModel() {
    const modelName =
      this.configService.get<string>('GEMINI_MODEL') || 'gemini-2.5-flash';
    return this.genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
        topP: 0.9,
      },
    });
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
    if (!this.genAI) {
      return { available: false, message: 'Gemini key missing' };
    }

    try {
      const model = this.getModel();
      await model.generateContent('Return JSON: {"ok": true}');
      return { available: true };
    } catch (error) {
      console.error('Error checking Gemini availability:', error);
      const modelName =
        this.configService.get<string>('GEMINI_MODEL') || 'gemini-2.5-flash';
      return {
        available: false,
        message: `Gemini model not accessible (${modelName})`,
      };
    }
  }

  async scoreDiscussion(
    title: string,
    content: string,
    resourceContext?: string,
  ): Promise<DiscussionQualityAnalysis> {
    if (!this.genAI) {
      throw new Error('Gemini API key not configured');
    }

    const model = this.getModel();

    const prompt = `You are a rubric-based reviewer for a career development learning platform.
Analyze the discussion post and provide actionable, specific feedback.
Be generous when the post is on-topic and coherent.

Discussion Post:
Title: ${title}
Content: ${content}
${resourceContext ? `Learning Context: ${resourceContext}` : ''}

Evaluate on these criteria (0-10 scale each):
1) Depth: How thorough and detailed is the discussion?
2) Relevance: How well does it relate to the learning topic?
3) Constructiveness: Does it add value, ask good questions, or spark meaningful conversation?

Return ONLY JSON with this shape:
{
  "depth": <number 0-10>,
  "relevance": <number 0-10>,
  "constructiveness": <number 0-10>,
  "insights": ["<2-4 concise strengths, complete sentences>"],
  "suggestions": ["<2-4 actionable improvements, complete sentences>"],
  "badge": <"High Quality" | "Insightful" | "Helpful" | null>
}

Badge criteria:
- "High Quality": Score >= 80, depth >= 8
- "Insightful": Score >= 70, constructiveness >= 8
- "Helpful": Score >= 60, relevance >= 7
- null: Below threshold

Return integer values 1-10 unless the content is empty (then use 0).
Avoid scores below 4 if the post is on-topic and clear.
Do not include markdown or extra text.`;

    try {
      const result = await model.generateContent(prompt);
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
      const message = error instanceof Error ? error.message : 'Gemini analysis failed';
      throw new Error(message);
    }
  }

  async scoreComment(
    content: string,
    discussionTitle?: string,
    discussionContext?: string,
    learningContext?: string,
  ): Promise<DiscussionQualityAnalysis> {
    if (!this.genAI) {
      throw new Error('Gemini API key not configured');
    }

    const model = this.getModel();

    const prompt = `You are a rubric-based reviewer for a career development learning platform.
Analyze the comment and provide actionable, specific feedback.
Be generous when the comment is on-topic and respectful.

Discussion Title: ${discussionTitle || 'N/A'}
${discussionContext ? `Discussion Context: ${discussionContext}` : ''}
${learningContext ? `Learning Context: ${learningContext}` : ''}
Comment: ${content}

Evaluate on these criteria (0-10 scale each):
1) Depth: How thoughtful and detailed is the comment?
2) Relevance: How well does it respond to the discussion topic?
3) Constructiveness: Does it add value, insight, or helpful questions?

Return ONLY JSON with this shape:
{
  "depth": <number 0-10>,
  "relevance": <number 0-10>,
  "constructiveness": <number 0-10>,
  "insights": ["<2-4 concise strengths, complete sentences>"],
  "suggestions": ["<2-4 actionable improvements, complete sentences>"],
  "badge": <"High Quality" | "Insightful" | "Helpful" | null>
}

Badge criteria:
- "High Quality": Score >= 80, depth >= 8
- "Insightful": Score >= 70, constructiveness >= 8
- "Helpful": Score >= 60, relevance >= 7
- null: Below threshold

Return integer values 1-10 unless the content is empty (then use 0).
Avoid scores below 3 if the comment is on-topic and clear.
Do not include markdown or extra text.`;

    try {
      const result = await model.generateContent(prompt);
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
      const message = error instanceof Error ? error.message : 'Gemini analysis failed';
      throw new Error(message);
    }
  }

  async summarizeResourceContent(
    title: string,
    content: string,
    resourceType?: string,
  ): Promise<ResourceSummaryResult> {
    if (!this.genAI) {
      throw new Error('Gemini API key not configured');
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
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const parsed = JSON.parse(text);
      return {
        summary: typeof parsed?.summary === 'string' ? parsed.summary : '',
        keyPoints: Array.isArray(parsed?.keyPoints)
          ? parsed.keyPoints.filter((item: unknown) => typeof item === 'string')
          : [],
      };
    } catch (error) {
      console.error('Error summarizing resource content:', error);
      const message = error instanceof Error ? error.message : 'Gemini analysis failed';
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
