"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3, TrendingUp, Users, BookOpen, Award, Calendar,
  Download, RefreshCw, GraduationCap, CheckCircle, Sparkles, Trophy,
} from "lucide-react";
import { useCohorts, useAdminMetrics } from "@/hooks/api/useAdmin";
import { useAnalyticsSummary } from "@/hooks/api/useSessionAnalytics";

function StatCard({
  title, value, sub, icon: Icon, color,
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <Card className="bg-white border-gray-200 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {sub && <p className="text-xs text-gray-500">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminAnalyticsPage() {
  const [selectedCohortId, setSelectedCohortId] = useState("");

  const { data: cohortsData } = useCohorts();
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useAdminMetrics();
  const cohorts = Array.isArray(cohortsData) ? cohortsData : [];

  useEffect(() => {
    if (!selectedCohortId && cohorts.length > 0) {
      setSelectedCohortId(cohorts[0].id);
    }
  }, [cohorts, selectedCohortId]);

  const {
    data: rawSummary,
    isLoading: summaryLoading,
    refetch: refetchSummary,
  } = useAnalyticsSummary(selectedCohortId);

  const summary = rawSummary as any;
  const stats = summary?.statistics;
  const topPerformers: Array<{ rank: number; name: string; totalPoints: number }> =
    summary?.topPerformers ?? [];
  const sessionEngagement: Array<{
    sessionNumber: number;
    title: string;
    engagementScore: number | null;
    participationRate: number | null;
  }> = summary?.sessionEngagement ?? [];

  const isLoading = metricsLoading || (!!selectedCohortId && summaryLoading);

  const handleRefresh = async () => {
    await Promise.all([refetchMetrics(), refetchSummary()]);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Platform Analytics</h1>
            <p className="text-gray-600 mt-1 text-sm">Comprehensive insights into platform usage and engagement</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              disabled={!selectedCohortId}
              onClick={() =>
                window.open(`/api/v1/session-analytics/export/cohort/${selectedCohortId}/csv`, "_blank")
              }
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* ── Platform-wide stats ── */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Platform Overview</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {metricsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="bg-white border-gray-200 shadow-sm">
                  <CardContent className="p-5">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-8 w-16 mb-1" />
                    <Skeleton className="h-3 w-32" />
                  </CardContent>
                </Card>
              ))
            ) : (
              <>
                <StatCard
                  title="Total Fellows"
                  value={metrics?.roleCounts.fellowCount ?? 0}
                  sub={`+${metrics?.newUsersThisWeek ?? 0} this week`}
                  icon={Users}
                  color="bg-blue-500"
                />
                <StatCard
                  title="Active Fellows"
                  value={metrics?.activeUsers ?? 0}
                  sub="Engaged with content"
                  icon={TrendingUp}
                  color="bg-emerald-500"
                />
                <StatCard
                  title="Cohorts"
                  value={metrics?.cohortCount ?? 0}
                  sub={`${metrics?.roleCounts.facilitatorCount ?? 0} facilitators`}
                  icon={GraduationCap}
                  color="bg-violet-500"
                />
                <StatCard
                  title="Total Resources"
                  value={metrics?.resourceCount ?? 0}
                  sub="Across all sessions"
                  icon={BookOpen}
                  color="bg-amber-500"
                />
              </>
            )}
          </div>
        </div>

        {/* ── Cohort selector ── */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="text-sm font-medium text-gray-600 shrink-0">Cohort</label>
              <select
                className="w-full sm:w-80 p-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 text-sm"
                value={selectedCohortId}
                onChange={(e) => setSelectedCohortId(e.target.value)}
              >
                <option value="">Select a cohort</option>
                {cohorts.map((cohort: any) => (
                  <option key={cohort.id} value={cohort.id}>
                    {cohort.name}
                  </option>
                ))}
              </select>
              {summary?.cohort && (
                <Badge
                  className={
                    summary.cohort.state === "ACTIVE"
                      ? "bg-green-100 text-green-800 border-green-200"
                      : "bg-gray-100 text-gray-600"
                  }
                >
                  {summary.cohort.state}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedCohortId && (
          <>
            {/* ── Cohort stats ── */}
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Cohort Stats
                {summary?.cohort?.name && (
                  <span className="ml-2 normal-case font-normal text-gray-400">— {summary.cohort.name}</span>
                )}
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {summaryLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="bg-white border-gray-200 shadow-sm">
                      <CardContent className="p-5">
                        <Skeleton className="h-4 w-24 mb-2" />
                        <Skeleton className="h-8 w-16 mb-1" />
                        <Skeleton className="h-3 w-32" />
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <>
                    <StatCard
                      title="Fellows"
                      value={stats?.totalFellows ?? "—"}
                      sub="In this cohort"
                      icon={Users}
                      color="bg-blue-500"
                    />
                    <StatCard
                      title="Completion Rate"
                      value={stats?.overallCompletionRate ?? "—"}
                      sub={`${stats?.completedResources ?? 0} resources completed`}
                      icon={CheckCircle}
                      color="bg-emerald-500"
                    />
                    <StatCard
                      title="Avg AI Engagement"
                      value={stats?.avgEngagementScore ? `${stats.avgEngagementScore}%` : "—"}
                      sub={`From ${stats?.sessionsWithAnalytics ?? 0} analyzed sessions`}
                      icon={Sparkles}
                      color="bg-purple-500"
                    />
                    <StatCard
                      title="Points Awarded"
                      value={(stats?.totalPointsAwarded ?? 0).toLocaleString()}
                      sub="Total in cohort"
                      icon={Award}
                      color="bg-amber-500"
                    />
                  </>
                )}
              </div>
            </div>

            {/* ── Content + Top Performers ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Content Stats */}
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader className="border-b border-gray-100 pb-3">
                  <CardTitle className="text-base font-semibold text-gray-900">Content Overview</CardTitle>
                  <CardDescription className="text-gray-500 text-sm">Resource and session breakdown</CardDescription>
                </CardHeader>
                <CardContent className="p-5 space-y-3">
                  {summaryLoading ? (
                    Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)
                  ) : (
                    [
                      { label: "Total Resources", value: stats?.totalResources ?? 0, icon: BookOpen, color: "bg-blue-100 text-blue-600" },
                      { label: "Completed Resources", value: stats?.completedResources ?? 0, icon: CheckCircle, color: "bg-emerald-100 text-emerald-600" },
                      { label: "Total Sessions", value: stats?.totalSessions ?? 0, icon: Calendar, color: "bg-violet-100 text-violet-600" },
                      { label: "Sessions Analyzed (ATLAS)", value: stats?.sessionsWithAnalytics ?? 0, icon: Sparkles, color: "bg-purple-100 text-purple-600" },
                    ].map(({ label, value, icon: Icon, color }) => (
                      <div key={label} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${color.split(" ")[0]}`}>
                            <Icon className={`h-4 w-4 ${color.split(" ")[1]}`} />
                          </div>
                          <span className="text-sm font-medium text-gray-900">{label}</span>
                        </div>
                        <span className="text-lg font-bold text-gray-900">{value}</span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Top Performers */}
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader className="border-b border-gray-100 pb-3">
                  <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    Top Performers
                  </CardTitle>
                  <CardDescription className="text-gray-500 text-sm">Fellows with the most points</CardDescription>
                </CardHeader>
                <CardContent className="p-5">
                  {summaryLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
                    </div>
                  ) : topPerformers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                      <Trophy className="h-10 w-10 mb-2 text-gray-200" />
                      <p className="text-sm">No leaderboard data yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {topPerformers.map((p) => (
                        <div
                          key={p.rank}
                          className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200"
                        >
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
                              p.rank === 1
                                ? "bg-amber-400 text-white"
                                : p.rank === 2
                                ? "bg-gray-300 text-gray-700"
                                : p.rank === 3
                                ? "bg-orange-300 text-white"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {p.rank}
                          </div>
                          <span className="flex-1 text-sm font-medium text-gray-900 truncate">{p.name}</span>
                          <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                            {p.totalPoints.toLocaleString()} pts
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ── Session Engagement Trend ── */}
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-100 pb-3">
                <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-purple-500" />
                  Session Engagement Trends
                </CardTitle>
                <CardDescription className="text-gray-500 text-sm">
                  AI engagement score per session (only analyzed sessions shown)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                {summaryLoading ? (
                  <Skeleton className="h-40 w-full rounded-lg" />
                ) : sessionEngagement.filter((s) => s.engagementScore !== null).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <Sparkles className="h-10 w-10 mb-2 text-gray-200" />
                    <p className="text-sm font-medium">No session analyses yet</p>
                    <p className="text-xs mt-1">Analyze sessions using ATLAS Session Review to see trends here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sessionEngagement
                      .filter((s) => s.engagementScore !== null)
                      .map((s) => (
                        <div key={s.sessionNumber} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-700 font-medium truncate max-w-[60%]">
                              S{s.sessionNumber}: {s.title}
                            </span>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-gray-500">
                                Participation: <span className="font-semibold text-gray-700">{s.participationRate ?? "—"}%</span>
                              </span>
                              <span
                                className={`font-bold ${
                                  (s.engagementScore ?? 0) >= 70
                                    ? "text-green-600"
                                    : (s.engagementScore ?? 0) >= 40
                                    ? "text-yellow-600"
                                    : "text-red-500"
                                }`}
                              >
                                {s.engagementScore}%
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${
                                (s.engagementScore ?? 0) >= 70
                                  ? "bg-green-500"
                                  : (s.engagementScore ?? 0) >= 40
                                  ? "bg-yellow-400"
                                  : "bg-red-400"
                              }`}
                              style={{ width: `${s.engagementScore ?? 0}%` }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {!selectedCohortId && !metricsLoading && (
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-16 text-gray-400">
              <BarChart3 className="h-14 w-14 mb-4 text-gray-200" />
              <p className="font-medium text-gray-500">Select a cohort to view detailed analytics</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
