import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, TrendingUp, Target, MessageSquare } from 'lucide-react';
import { DiscussionQualityBadge, QualityScoreIndicator } from './DiscussionQualityBadge';

interface QualityAnalysis {
  score: number;
  depth: number;
  relevance: number;
  constructiveness: number;
  badges: Array<{ label: string; score: number }>;
  suggestions?: string[];
  strengths?: string[];
}

interface DiscussionQualityPanelProps {
  analysis: QualityAnalysis | null;
  isLoading?: boolean;
  canScore?: boolean;
  onScoreQuality?: () => void;
}

export function DiscussionQualityPanel({
  analysis,
  isLoading,
  canScore,
  onScoreQuality,
}: DiscussionQualityPanelProps) {
  if (!analysis && !canScore) {
    return null;
  }

  if (!analysis) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6 text-center">
          <Sparkles className="h-10 w-10 mx-auto text-gray-400 mb-3" />
          <p className="text-sm text-gray-500 mb-4">
            This discussion hasn't been analyzed yet
          </p>
          {canScore && (
            <Button onClick={onScoreQuality} disabled={isLoading} size="sm">
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analyze Quality
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Discussion Quality Analysis
            </CardTitle>
            <CardDescription>AI-powered assessment of discussion quality</CardDescription>
          </div>
          <QualityScoreIndicator score={analysis.score} size="lg" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quality Badges */}
        {analysis.badges.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {analysis.badges.map((badge, index) => (
              <DiscussionQualityBadge key={index} badge={badge} />
            ))}
          </div>
        )}

        {/* Dimension Scores */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700">Quality Dimensions</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <Target className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-blue-900">Depth</span>
                  <span className="text-xs font-bold text-blue-600">{analysis.depth}/10</span>
                </div>
                <div className="h-1.5 bg-blue-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${(analysis.depth / 10) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 border border-purple-200">
              <TrendingUp className="h-5 w-5 text-purple-600 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-purple-900">Relevance</span>
                  <span className="text-xs font-bold text-purple-600">{analysis.relevance}/10</span>
                </div>
                <div className="h-1.5 bg-purple-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-600 transition-all duration-300"
                    style={{ width: `${(analysis.relevance / 10) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
              <MessageSquare className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-green-900">Constructive</span>
                  <span className="text-xs font-bold text-green-600">
                    {analysis.constructiveness}/10
                  </span>
                </div>
                <div className="h-1.5 bg-green-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-600 transition-all duration-300"
                    style={{ width: `${(analysis.constructiveness / 10) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Strengths */}
        {analysis.strengths && analysis.strengths.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Strengths</h4>
            <ul className="space-y-1.5">
              {analysis.strengths.map((strength, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                  <Badge variant="outline" className="mt-0.5 bg-green-50 text-green-700 border-green-300">
                    ✓
                  </Badge>
                  {strength}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggestions */}
        {analysis.suggestions && analysis.suggestions.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Suggestions for Improvement</h4>
            <ul className="space-y-1.5">
              {analysis.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                  <Badge variant="outline" className="mt-0.5 bg-blue-50 text-blue-700 border-blue-300">
                    💡
                  </Badge>
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}

        {canScore && (
          <div className="pt-4 border-t">
            <Button onClick={onScoreQuality} disabled={isLoading} variant="outline" size="sm" className="w-full">
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2" />
                  Re-analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Re-analyze Quality
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
