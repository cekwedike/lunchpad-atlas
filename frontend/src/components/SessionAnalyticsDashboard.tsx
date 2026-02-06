import React from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, Minus, Users, MessageCircle, Eye, Target } from 'lucide-react';
import { useCohortAnalytics, useCohortInsights } from '@/hooks/api/useSessionAnalytics';

interface SessionAnalyticsDashboardProps {
  cohortId: string;
}

const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
};

export function SessionAnalyticsDashboard({ cohortId }: SessionAnalyticsDashboardProps) {
  const { data: analytics, isLoading: analyticsLoading } = useCohortAnalytics(cohortId);
  const { data: insights, isLoading: insightsLoading } = useCohortInsights(cohortId);

  if (analyticsLoading || insightsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!analytics || analytics.analyzedSessions === 0) {
    return (
      <Alert>
        <AlertDescription>
          No analytics data available yet. Session analytics will appear here once transcripts are processed.
        </AlertDescription>
      </Alert>
    );
  }

  // Prepare data for charts
  const engagementData = analytics.sessions.map((s) => ({
    session: `S${s.sessionNumber}`,
    engagement: s.analytics.engagementScore || 0,
    participation: s.analytics.participationRate || 0,
    attention: s.analytics.averageAttention || 0,
  }));

  const participationData = [
    { name: 'High', value: 0, color: COLORS.success },
    { name: 'Medium', value: 0, color: COLORS.warning },
    { name: 'Low', value: 0, color: COLORS.danger },
  ];

  // Calculate participation distribution
  analytics.sessions.forEach((session) => {
    const rate = session.analytics.participationRate || 0;
    if (rate >= 70) participationData[0].value++;
    else if (rate >= 40) participationData[1].value++;
    else participationData[2].value++;
  });

  const topicsData = analytics.topTopics.slice(0, 8).map((topic) => ({
    topic: topic.topic.length > 20 ? topic.topic.substring(0, 20) + '...' : topic.topic,
    count: topic.count,
  }));

  const getTrendIcon = (trend: string) => {
    if (trend === 'improving') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'declining') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getTrendColor = (trend: string) => {
    if (trend === 'improving') return 'text-green-600';
    if (trend === 'declining') return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Engagement</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.averageEngagement.toFixed(1)}%</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {insights && getTrendIcon(insights.trends.engagement)}
              <span className={insights ? getTrendColor(insights.trends.engagement) : ''}>
                {insights?.trends.engagement || 'stable'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Participation</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.averageParticipation.toFixed(1)}%</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {insights && getTrendIcon(insights.trends.participation)}
              <span className={insights ? getTrendColor(insights.trends.participation) : ''}>
                {insights?.trends.participation || 'stable'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Attention</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.averageAttention.toFixed(1)}%</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {insights && getTrendIcon(insights.trends.attention)}
              <span className={insights ? getTrendColor(insights.trends.attention) : ''}>
                {insights?.trends.attention || 'stable'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalQuestions}</div>
            <p className="text-xs text-muted-foreground">
              Across {analytics.analyzedSessions} sessions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      {insights && (
        <Card>
          <CardHeader>
            <CardTitle>AI-Generated Insights</CardTitle>
            <CardDescription>Powered by Gemini 2.5 Flash</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm leading-relaxed">{insights.summary}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <h4 className="mb-2 font-semibold text-green-600 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Strengths
                </h4>
                <ul className="space-y-1 text-sm">
                  {insights.strengths.map((strength, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-green-500">•</span>
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="mb-2 font-semibold text-orange-600">Challenges</h4>
                <ul className="space-y-1 text-sm">
                  {insights.challenges.map((challenge, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-orange-500">•</span>
                      <span>{challenge}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="mb-2 font-semibold text-blue-600">Recommendations</h4>
                <ul className="space-y-1 text-sm">
                  {insights.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-blue-500">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Engagement Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Engagement Trends</CardTitle>
            <CardDescription>Session-by-session performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="session" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="engagement"
                  stroke={COLORS.primary}
                  strokeWidth={2}
                  name="Engagement"
                />
                <Line
                  type="monotone"
                  dataKey="participation"
                  stroke={COLORS.success}
                  strokeWidth={2}
                  name="Participation"
                />
                <Line
                  type="monotone"
                  dataKey="attention"
                  stroke={COLORS.purple}
                  strokeWidth={2}
                  name="Attention"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Participation Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Participation Distribution</CardTitle>
            <CardDescription>Session categorization by participation rate</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={participationData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {participationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Topics */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Top Discussion Topics</CardTitle>
            <CardDescription>Most frequently mentioned topics across sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topicsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="topic" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill={COLORS.primary} name="Mentions" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Session List */}
      <Card>
        <CardHeader>
          <CardTitle>Session Details</CardTitle>
          <CardDescription>{analytics.analyzedSessions} analyzed sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.sessions.map((session) => (
              <div
                key={session.sessionId}
                className="flex items-center justify-between border-b pb-3 last:border-0"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">Session {session.sessionNumber}</Badge>
                    <h4 className="font-medium">{session.title}</h4>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {new Date(session.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-6 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-blue-600">
                      {session.analytics.engagementScore?.toFixed(0) || 'N/A'}%
                    </div>
                    <div className="text-xs text-muted-foreground">Engagement</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-green-600">
                      {session.analytics.participationRate?.toFixed(0) || 'N/A'}%
                    </div>
                    <div className="text-xs text-muted-foreground">Participation</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-purple-600">
                      {session.analytics.questionCount || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Questions</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
