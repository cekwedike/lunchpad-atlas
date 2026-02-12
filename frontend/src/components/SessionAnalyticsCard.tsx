import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Users, MessageCircle, Eye, Target, Sparkles } from 'lucide-react';
import { useSessionAnalytics } from '@/hooks/api/useSessionAnalytics';

interface SessionAnalyticsCardProps {
  sessionId: string;
  showDetails?: boolean;
}

export function SessionAnalyticsCard({ sessionId, showDetails = true }: SessionAnalyticsCardProps) {
  const { data: analytics, isLoading, error } = useSessionAnalytics(sessionId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !analytics) {
    return (
      <Alert>
        <AlertDescription>
          No analytics available for this session yet. Upload a transcript to generate AI insights.
        </AlertDescription>
      </Alert>
    );
  }

  const hasAIData = !!analytics.aiProcessedAt;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Session Analytics
            {hasAIData && (
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" />
                AI Analyzed
              </Badge>
            )}
          </CardTitle>
        </div>
        {hasAIData && analytics.aiProcessedAt && (
          <CardDescription>
            Analyzed {new Date(analytics.aiProcessedAt).toLocaleDateString()}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Target className="h-4 w-4" />
              Engagement
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {analytics.engagementScore?.toFixed(0) || 'N/A'}
              {analytics.engagementScore && '%'}
            </div>
            {analytics.engagementScore && (
              <Progress value={analytics.engagementScore} className="h-2" />
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="h-4 w-4" />
              Participation
            </div>
            <div className="text-2xl font-bold text-green-600">
              {analytics.participationRate?.toFixed(0) || 'N/A'}
              {analytics.participationRate && '%'}
            </div>
            {analytics.participationRate && (
              <Progress value={analytics.participationRate} className="h-2" />
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Eye className="h-4 w-4" />
              Attention
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {analytics.averageAttention?.toFixed(0) || 'N/A'}
              {analytics.averageAttention && '%'}
            </div>
            {analytics.averageAttention && (
              <Progress value={analytics.averageAttention} className="h-2" />
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MessageCircle className="h-4 w-4" />
              Questions
            </div>
            <div className="text-2xl font-bold">{analytics.questionCount}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.interactionCount} interactions
            </p>
          </div>
        </div>

        {/* Attendance */}
        <div className="rounded-lg border p-4">
          <h4 className="mb-2 font-semibold">Attendance</h4>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Fellows Attended</span>
            <span className="font-medium">
              {analytics.fellowsAttended} / {analytics.totalFellows}
            </span>
          </div>
          <Progress
            value={(analytics.fellowsAttended / analytics.totalFellows) * 100}
            className="mt-2 h-2"
          />
        </div>

        {/* Key Topics */}
        {showDetails && analytics.keyTopics && analytics.keyTopics.length > 0 && (
          <div>
            <h4 className="mb-3 font-semibold">Key Topics Discussed</h4>
            <div className="flex flex-wrap gap-2">
              {analytics.keyTopics.map((topic, i) => (
                <Badge key={i} variant="outline">
                  {topic}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* AI Insights */}
        {showDetails && analytics.insights && (
          <div className="space-y-4">
            {analytics.insights.strengths && analytics.insights.strengths.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-2 font-semibold text-green-600">
                  <span className="text-xl">✓</span>
                  Strengths
                </h4>
                <ul className="space-y-1 text-sm">
                  {analytics.insights.strengths.map((strength, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-green-500">•</span>
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analytics.insights.improvements && analytics.insights.improvements.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-2 font-semibold text-orange-600">
                  <span className="text-xl">⚠</span>
                  Areas for Improvement
                </h4>
                <ul className="space-y-1 text-sm">
                  {analytics.insights.improvements.map((improvement, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-orange-500">•</span>
                      <span>{improvement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analytics.insights.recommendations && analytics.insights.recommendations.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-2 font-semibold text-blue-600">
                  <span className="text-xl">→</span>
                  Recommendations
                </h4>
                <ul className="space-y-1 text-sm">
                  {analytics.insights.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-blue-500">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Fellow Participation */}
        {showDetails &&
          analytics.participantAnalysis &&
          analytics.participantAnalysis.length > 0 && (
            <div>
              <h4 className="mb-3 font-semibold flex items-center gap-2">
                Fellow Participation
                <span className="text-xs font-normal text-muted-foreground">suggested points out of 50</span>
              </h4>
              <div className="space-y-2">
                {(analytics.participantAnalysis as Array<{
                  name: string;
                  participationScore: number;
                  contributionSummary: string;
                  suggestedPoints: number;
                }>).map((fellow, i) => (
                  <div key={i} className="rounded-lg border p-3 space-y-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-medium text-sm">{fellow.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          className={
                            fellow.participationScore >= 70
                              ? 'bg-green-100 text-green-700 hover:bg-green-100'
                              : fellow.participationScore >= 40
                              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100'
                              : 'bg-red-100 text-red-700 hover:bg-red-100'
                          }
                        >
                          {fellow.participationScore}/100
                        </Badge>
                        <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">
                          +{fellow.suggestedPoints} pts
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{fellow.contributionSummary}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
      </CardContent>
    </Card>
  );
}
