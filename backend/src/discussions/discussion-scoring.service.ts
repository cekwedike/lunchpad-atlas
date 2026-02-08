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

@Injectable()
export class DiscussionScoringService {
  private genAI: GoogleGenerativeAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
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

    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
    });

    const prompt = `Analyze the quality of this discussion post from a career development learning platform:

Title: ${title}
Content: ${content}
${resourceContext ? `Resource Context: ${resourceContext}` : ''}

Evaluate the post on these criteria (0-10 scale each):
1. **Depth**: How thorough and detailed is the discussion?
2. **Relevance**: How well does it relate to the learning topic?
3. **Constructiveness**: Does it provide value, ask good questions, or spark meaningful conversation?

Provide a JSON response with:
{
  "depth": <number 0-10>,
  "relevance": <number 0-10>,
  "constructiveness": <number 0-10>,
  "insights": [<array of key insights from the post>],
  "suggestions": [<array of suggestions to improve the post>],
  "badge": <"High Quality" | "Insightful" | "Helpful" | null>
}

Badge criteria:
- "High Quality": Score >= 80, depth >= 8
- "Insightful": Score >= 70, constructiveness >= 8
- "Helpful": Score >= 60, relevance >= 7
- null: Below threshold

Return ONLY valid JSON, no other text.`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format from AI');
      }

      const analysis = JSON.parse(jsonMatch[0]);

      // Calculate overall score (weighted average)
      const score = Math.round(
        (analysis.depth * 0.35 +
          analysis.relevance * 0.35 +
          analysis.constructiveness * 0.3) *
          10,
      );

      return {
        score,
        depth: analysis.depth,
        relevance: analysis.relevance,
        constructiveness: analysis.constructiveness,
        insights: analysis.insights || [],
        suggestions: analysis.suggestions || [],
        badge: analysis.badge || null,
      };
    } catch (error) {
      console.error('Error scoring discussion:', error);
      // Fallback to basic scoring
      return {
        score: 50,
        depth: 5,
        relevance: 5,
        constructiveness: 5,
        insights: [],
        suggestions: ['Unable to analyze post quality automatically'],
        badge: null,
      };
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
