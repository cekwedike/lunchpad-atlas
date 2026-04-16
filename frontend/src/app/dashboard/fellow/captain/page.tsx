"use client";

import { useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Loader2,
  MessageSquare,
  Users,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProfile } from "@/hooks/api/useProfile";
import {
  useCohortStats,
  useFellowEngagement,
  useResourceCompletions,
} from "@/hooks/api/useCohortInsights";
import { useSessions } from "@/hooks/api/useAdmin";
import { CohortLeadershipRole, UserRole } from "@/types/api";

export default function FellowCaptainDashboardPage() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const cohortId = profile?.cohortId ?? undefined;
  const isCaptain =
    profile?.role === UserRole.FELLOW &&
    profile?.cohortLeadershipRole != null &&
    profile.cohortLeadershipRole !== CohortLeadershipRole.NONE;

  const { data: stats, isLoading: statsLoading } = useCohortStats(cohortId);
  const { data: fellows, isLoading: fellowsLoading } = useFellowEngagement(cohortId);
  const { data: resources, isLoading: resourcesLoading } = useResourceCompletions(cohortId);
  const { data: sessions = [], isLoading: sessionsLoading } = useSessions(cohortId);

  const upcoming = useMemo(() => {
    const now = Date.now();
    return [...sessions]
      .filter((s: { scheduledDate?: string }) => s.scheduledDate && new Date(s.scheduledDate).getTime() >= now)
      .sort(
        (a: { scheduledDate?: string }, b: { scheduledDate?: string }) =>
          new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime(),
      )
      .slice(0, 6);
  }, [sessions]);

  const quizRows = useMemo(() => {
    const rows: { id: string; title: string; openAt?: string | null; closeAt?: string | null; sessionTitle?: string }[] = [];
    for (const s of sessions as Array<{
      title?: string;
      quizSessions?: Array<{ quiz: { id: string; title: string; openAt?: string | null; closeAt?: string | null } }>;
    }>) {
      for (const qs of s.quizSessions ?? []) {
        rows.push({
          id: qs.quiz.id,
          title: qs.quiz.title,
          openAt: qs.quiz.openAt,
          closeAt: qs.quiz.closeAt,
          sessionTitle: s.title,
        });
      }
    }
    return rows;
  }, [sessions]);

  if (profileLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isCaptain) {
    return (
      <DashboardLayout>
        <div className="max-w-lg space-y-4">
          <Button variant="ghost" asChild className="gap-2 -ml-2 w-fit">
            <Link href="/dashboard/fellow">
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Link>
          </Button>
          <Card>
            <CardHeader>
              <CardTitle>Cohort captain tools</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              This area is only available when your facilitator has assigned you as cohort captain or assistant captain.
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const loading = statsLoading || fellowsLoading || resourcesLoading;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Button variant="ghost" asChild className="mb-1 -ml-2 w-fit gap-2 text-slate-700">
              <Link href="/dashboard/fellow">
                <ArrowLeft className="h-4 w-4" />
                Fellow dashboard
              </Link>
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Cohort pulse</h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Read-only snapshot for {profile?.cohort?.name ?? "your cohort"}. Fellow emails are masked here for privacy.
            </p>
          </div>
          <Badge variant="outline" className="w-fit shrink-0">
            {profile?.cohortLeadershipRole === CohortLeadershipRole.COHORT_CAPTAIN ? "Captain" : "Assistant captain"}
          </Badge>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-indigo-600" />
                  Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div className="rounded-lg border bg-slate-50/80 p-3">
                  <p className="text-xs text-muted-foreground">Fellows</p>
                  <p className="text-xl font-semibold">{stats?.fellowCount ?? "–"}</p>
                </div>
                <div className="rounded-lg border bg-slate-50/80 p-3">
                  <p className="text-xs text-muted-foreground">Active (7d)</p>
                  <p className="text-xl font-semibold">{stats?.activeFellows ?? "–"}</p>
                </div>
                <div className="rounded-lg border bg-slate-50/80 p-3">
                  <p className="text-xs text-muted-foreground">Avg progress</p>
                  <p className="text-xl font-semibold">{stats?.avgProgress != null ? `${stats.avgProgress}%` : "–"}</p>
                </div>
                <div className="rounded-lg border bg-slate-50/80 p-3">
                  <p className="text-xs text-muted-foreground">Discussions</p>
                  <p className="text-xl font-semibold">{stats?.totalDiscussions ?? "–"}</p>
                </div>
                <div className="rounded-lg border bg-slate-50/80 p-3">
                  <p className="text-xs text-muted-foreground">New posts (7d)</p>
                  <p className="text-xl font-semibold">{stats?.activeDiscussions ?? "–"}</p>
                </div>
                <div className="rounded-lg border bg-slate-50/80 p-3">
                  <p className="text-xs text-muted-foreground">Attendance</p>
                  <p className="text-xl font-semibold">{stats?.attendanceRate != null ? `${stats.attendanceRate}%` : "–"}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-indigo-600" />
                  Upcoming sessions & quizzes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Sessions</p>
                  {sessionsLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                  ) : upcoming.length === 0 ? (
                    <p className="text-muted-foreground">No upcoming sessions scheduled.</p>
                  ) : (
                    <ul className="space-y-2">
                      {upcoming.map((s: { id: string; title?: string; scheduledDate?: string }) => (
                        <li key={s.id} className="flex flex-wrap justify-between gap-2 border-b border-dashed pb-2 last:border-0">
                          <span className="font-medium text-slate-800">{s.title ?? "Session"}</span>
                          <span className="text-muted-foreground">
                            {s.scheduledDate ? format(new Date(s.scheduledDate), "MMM d, yyyy") : "—"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Quizzes</p>
                  {quizRows.length === 0 ? (
                    <p className="text-muted-foreground">No quizzes linked to sessions yet.</p>
                  ) : (
                    <div className="overflow-x-auto -mx-1">
                      <table className="min-w-full text-left text-xs sm:text-sm">
                        <thead>
                          <tr className="border-b text-muted-foreground">
                            <th className="py-2 pr-3 font-medium">Quiz</th>
                            <th className="py-2 pr-3 font-medium">Session</th>
                            <th className="py-2 pr-3 font-medium">Closes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {quizRows.map((q) => (
                            <tr key={q.id} className="border-b border-slate-100 last:border-0">
                              <td className="py-2 pr-3">
                                <Link className="text-indigo-600 hover:underline" href={`/quiz/${q.id}`}>
                                  {q.title}
                                </Link>
                              </td>
                              <td className="py-2 pr-3 text-muted-foreground">{q.sessionTitle ?? "—"}</td>
                              <td className="py-2 pr-3 text-muted-foreground">
                                {q.closeAt ? format(new Date(q.closeAt), "MMM d, yyyy") : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-600" />
                  Fellow activity
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto -mx-1 px-1">
                <table className="min-w-[640px] w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Name</th>
                      <th className="py-2 pr-3 font-medium">Email</th>
                      <th className="py-2 pr-3 font-medium">Progress</th>
                      <th className="py-2 pr-3 font-medium">Points</th>
                      <th className="py-2 pr-3 font-medium">Flag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(fellows ?? []).map((f) => (
                      <tr key={f.userId} className="border-b border-slate-100 last:border-0">
                        <td className="py-2 pr-3 font-medium text-slate-800">{f.name}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{f.email}</td>
                        <td className="py-2 pr-3">{f.progress}%</td>
                        <td className="py-2 pr-3">{f.totalPoints}</td>
                        <td className="py-2 pr-3">
                          {f.needsAttention ? (
                            <Badge variant="outline" className="text-amber-800 border-amber-200 bg-amber-50">
                              Check in
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-indigo-600" />
                  Resource completion heatmap
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto -mx-1 px-1">
                <table className="min-w-[560px] w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Resource</th>
                      <th className="py-2 pr-3 font-medium">Type</th>
                      <th className="py-2 pr-3 font-medium">Completion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(resources ?? []).map((r) => (
                      <tr key={r.resourceId} className="border-b border-slate-100 last:border-0">
                        <td className="py-2 pr-3">{r.title}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{r.type}</td>
                        <td className="py-2 pr-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full bg-indigo-500 rounded-full"
                                style={{ width: `${Math.min(100, r.completionRate)}%` }}
                              />
                            </div>
                            <span>{r.completionRate}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
