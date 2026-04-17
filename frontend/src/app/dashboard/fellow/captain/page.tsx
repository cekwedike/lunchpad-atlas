"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  Crown,
  Loader2,
  Lock,
  MessageSquare,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { useProfile } from "@/hooks/api/useProfile";
import {
  useCohortStats,
  useFellowEngagement,
  useFellowResourceMatrix,
} from "@/hooks/api/useCohortInsights";
import { useSessions } from "@/hooks/api/useAdmin";
import { useOpenDM } from "@/hooks/api/useChat";
import type {
  CohortStats,
  FellowEngagement,
  FellowResourceMatrixFellow,
  FellowResourceMatrixResource,
} from "@/hooks/api/useFacilitator";
import { cn } from "@/lib/utils";
import { CohortLeadershipRole, UserRole } from "@/types/api";

type QuizRow = {
  id: string;
  title: string;
  openAt?: string | null;
  closeAt?: string | null;
  sessionTitle?: string;
};

function cellKey(userId: string, resourceId: string) {
  return `${userId}:${resourceId}`;
}

function ProgressCell({
  state,
  needsAttention,
}: {
  state: string | null;
  needsAttention: boolean;
}) {
  if (state === "COMPLETED") {
    return (
      <span className="flex justify-center" title="Completed">
        <Check className="h-4 w-4 text-emerald-600" strokeWidth={2.5} aria-hidden />
        <span className="sr-only">Completed</span>
      </span>
    );
  }
  if (state === "LOCKED") {
    return (
      <span className="flex justify-center text-slate-400" title="Locked">
        <Lock className="h-3.5 w-3.5" aria-hidden />
        <span className="sr-only">Locked</span>
      </span>
    );
  }
  if (state === null) {
    return (
      <span className="flex justify-center text-xs text-slate-400" title="No activity recorded yet">
        —
      </span>
    );
  }
  if (needsAttention) {
    return (
      <span className="flex justify-center text-amber-600" title="Unlocked or in progress — not completed yet">
        <AlertCircle className="h-4 w-4" aria-hidden />
        <span className="sr-only">Needs attention</span>
      </span>
    );
  }
  return (
    <span className="flex justify-center text-slate-500" title={state ?? ""}>
      …
    </span>
  );
}

function StatTile({
  label,
  value,
  loading,
}: {
  label: string;
  value: ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200/90 bg-white/80 p-3 shadow-sm backdrop-blur-sm transition hover:border-cyan-200/80 hover:shadow-md sm:p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      {loading ? (
        <div className="mt-2 h-8 w-16 animate-pulse rounded-md bg-slate-100" />
      ) : (
        <p className="mt-1.5 text-xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-2xl">{value}</p>
      )}
    </div>
  );
}

function FellowMobileCard({
  f,
  currentUserId,
  onCheckIn,
  dmLoadingUserId,
}: {
  f: FellowEngagement;
  currentUserId?: string;
  onCheckIn: (userId: string) => void;
  dmLoadingUserId: string | null;
}) {
  const isSelf = f.userId === currentUserId;
  const showCheckIn = f.needsAttention && !isSelf;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">{f.name}</p>
          <p className="truncate text-xs text-slate-500">{f.email}</p>
        </div>
        {showCheckIn ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="shrink-0 gap-1 border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
            onClick={() => onCheckIn(f.userId)}
            disabled={dmLoadingUserId === f.userId}
          >
            {dmLoadingUserId === f.userId ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <MessageSquare className="h-3.5 w-3.5" aria-hidden />
            )}
            Check in
          </Button>
        ) : null}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-slate-50 px-2 py-1.5">
          <p className="text-[10px] font-medium uppercase text-slate-500">Progress</p>
          <p className="font-semibold tabular-nums text-slate-900">{f.progress}%</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-2 py-1.5">
          <p className="text-[10px] font-medium uppercase text-slate-500">Points</p>
          <p className="font-semibold tabular-nums text-slate-900">{f.totalPoints}</p>
        </div>
      </div>
    </div>
  );
}

function QuizMobileCard({ q }: { q: QuizRow }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <Link
        href={`/quiz/${q.id}`}
        className="font-semibold text-cyan-800 underline-offset-2 hover:text-cyan-950 hover:underline"
      >
        {q.title}
      </Link>
      <p className="mt-1 text-xs text-slate-600">
        <span className="font-medium text-slate-500">Session</span> · {q.sessionTitle ?? "—"}
      </p>
      <p className="mt-2 text-xs text-slate-500">
        <span className="font-medium text-slate-500">Closes</span> ·{" "}
        {q.closeAt ? format(new Date(q.closeAt), "MMM d, yyyy") : "—"}
      </p>
    </div>
  );
}

function overviewValues(stats: CohortStats | undefined) {
  return {
    fellows: stats?.fellowCount ?? "—",
    active: stats?.activeFellows ?? "—",
    avgProgress: stats?.avgProgress != null ? `${stats.avgProgress}%` : "—",
    discussions: stats?.totalDiscussions ?? "—",
    newPosts: stats?.activeDiscussions ?? "—",
    attendance: stats?.attendanceRate != null ? `${stats.attendanceRate}%` : "—",
  };
}

function MatrixLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-xs text-slate-600 sm:px-5">
      <span className="inline-flex items-center gap-1.5">
        <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
        Done
      </span>
      <span className="inline-flex items-center gap-1.5">
        <AlertCircle className="h-3.5 w-3.5 text-amber-600" aria-hidden />
        Needs attention
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Lock className="h-3.5 w-3.5 text-slate-400" aria-hidden />
        Locked
      </span>
      <span className="inline-flex items-center gap-1.5 text-slate-500">— No activity yet</span>
    </div>
  );
}

export default function FellowCaptainDashboardPage() {
  const router = useRouter();
  const openDM = useOpenDM();
  const [dmLoadingUserId, setDmLoadingUserId] = useState<string | null>(null);
  const [selectedFellowId, setSelectedFellowId] = useState<string | null>(null);

  const { data: profile, isLoading: profileLoading } = useProfile();
  const cohortId = profile?.cohortId ?? undefined;
  const isCaptain =
    profile?.role === UserRole.FELLOW &&
    profile?.cohortLeadershipRole != null &&
    profile.cohortLeadershipRole !== CohortLeadershipRole.NONE;

  const { data: stats, isLoading: statsLoading } = useCohortStats(cohortId);
  const { data: fellows, isLoading: fellowsLoading } = useFellowEngagement(cohortId);
  const { data: matrix, isLoading: matrixLoading } = useFellowResourceMatrix(cohortId);
  const { data: sessions = [], isLoading: sessionsLoading } = useSessions(cohortId);

  const metrics = useMemo(() => overviewValues(stats), [stats]);

  const cellMap = useMemo(() => {
    const m = new Map<string, { state: string | null; needsAttention: boolean }>();
    for (const c of matrix?.cells ?? []) {
      m.set(cellKey(c.userId, c.resourceId), {
        state: c.state,
        needsAttention: c.needsAttention,
      });
    }
    return m;
  }, [matrix]);

  useEffect(() => {
    if (!matrix?.fellows?.length) return;
    setSelectedFellowId((prev) => {
      if (prev && matrix.fellows.some((f) => f.userId === prev)) return prev;
      return matrix.fellows[0].userId;
    });
  }, [matrix]);

  const handleCheckIn = useCallback(
    async (targetUserId: string) => {
      if (!targetUserId || targetUserId === profile?.id) return;
      setDmLoadingUserId(targetUserId);
      try {
        const channel = await openDM.mutateAsync(targetUserId);
        router.push(`/dashboard/chats?channelId=${channel.id}`);
      } catch {
        toast.error("Could not open conversation", {
          description: "Try again or message them from Chats if the problem continues.",
        });
      } finally {
        setDmLoadingUserId(null);
      }
    },
    [openDM, profile?.id, router],
  );

  const upcoming = useMemo(() => {
    const now = Date.now();
    return [...sessions]
      .filter((s: { scheduledDate?: string }) => s.scheduledDate && new Date(s.scheduledDate).getTime() >= now)
      .sort(
        (a: { scheduledDate?: string }, b: { scheduledDate?: string }) =>
          new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime(),
      )
      .slice(0, 8);
  }, [sessions]);

  const quizRows = useMemo(() => {
    const byId = new Map<string, QuizRow>();
    for (const s of sessions as Array<{
      title?: string;
      quizSessions?: Array<{ quiz: { id: string; title: string; openAt?: string | null; closeAt?: string | null } }>;
    }>) {
      for (const qs of s.quizSessions ?? []) {
        const id = qs.quiz.id;
        if (!byId.has(id)) {
          byId.set(id, {
            id,
            title: qs.quiz.title,
            openAt: qs.quiz.openAt,
            closeAt: qs.quiz.closeAt,
            sessionTitle: s.title,
          });
        }
      }
    }
    return [...byId.values()];
  }, [sessions]);

  const leadershipLabel =
    profile?.cohortLeadershipRole === CohortLeadershipRole.COHORT_CAPTAIN
      ? "Captain"
      : "Assistant Captain";

  const selectedFellow = useMemo(() => {
    if (!matrix?.fellows || !selectedFellowId) return null;
    return matrix.fellows.find((f) => f.userId === selectedFellowId) ?? null;
  }, [matrix, selectedFellowId]);

  const mobileAttentionCount = useMemo(() => {
    if (!selectedFellowId || !matrix?.resources.length) return 0;
    let n = 0;
    for (const r of matrix.resources) {
      const cell = cellMap.get(cellKey(selectedFellowId, r.resourceId));
      if (cell?.needsAttention) n += 1;
    }
    return n;
  }, [cellMap, matrix?.resources, selectedFellowId]);

  if (profileLoading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
          <Loader2 className="h-9 w-9 animate-spin text-cyan-600" aria-hidden />
          <p className="text-sm text-slate-600">Loading Cohort Pulse…</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!isCaptain) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-lg space-y-6 px-1">
          <Button variant="ghost" asChild className="gap-2 -ml-2 w-fit text-slate-700">
            <Link href="/dashboard/fellow">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to dashboard
            </Link>
          </Button>
          <Card className="overflow-hidden border-slate-200 shadow-md">
            <CardHeader className="border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-200/80">
                  <Crown className="h-5 w-5 text-slate-600" aria-hidden />
                </div>
                <div>
                  <CardTitle className="text-lg">Cohort leadership</CardTitle>
                  <CardDescription>Restricted access</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 text-sm leading-relaxed text-slate-600">
              Cohort Pulse is only available when your facilitator has assigned you as{" "}
              <span className="font-medium text-slate-800">cohort captain</span> or{" "}
              <span className="font-medium text-slate-800">assistant captain</span>.
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const cohortName = profile?.cohort?.name ?? "your cohort";
  const matrixResources: FellowResourceMatrixResource[] = matrix?.resources ?? [];
  const matrixFellows: FellowResourceMatrixFellow[] = matrix?.fellows ?? [];

  return (
    <DashboardLayout>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 pb-10 sm:gap-8">
        <section
          className={cn(
            "relative overflow-hidden rounded-2xl border border-slate-200/90",
            "bg-gradient-to-br from-slate-50 via-white to-cyan-50/50 shadow-sm ring-1 ring-slate-900/[0.04]",
          )}
        >
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-teal-400/10 blur-2xl"
            aria-hidden
          />
          <div className="relative flex flex-col gap-6 p-5 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 space-y-3">
              <Button variant="ghost" size="sm" asChild className="-ml-2 h-9 w-fit gap-2 text-slate-700">
                <Link href="/dashboard/fellow">
                  <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
                  Fellow dashboard
                </Link>
              </Button>
              <div className="flex flex-wrap items-center gap-2">
                <Sparkles className="hidden h-5 w-5 text-cyan-600 sm:block" aria-hidden />
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
                  Cohort Pulse
                </h1>
              </div>
              <p className="max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
                Read-only snapshot for <span className="font-semibold text-slate-800">{cohortName}</span>. Fellow
                emails are masked for privacy. Use the matrix below to see who has finished each resource—then use{" "}
                <span className="font-medium text-slate-800">Check in</span> to open a direct message when someone may
                need support.
              </p>
            </div>
            <Badge
              variant="outline"
              className="h-fit w-fit shrink-0 gap-1.5 border-cyan-200/80 bg-white/90 px-3 py-1.5 text-sm font-semibold text-cyan-950 shadow-sm backdrop-blur-sm"
            >
              <Crown className="h-3.5 w-3.5" aria-hidden />
              {leadershipLabel}
            </Badge>
          </div>
        </section>

        <section aria-labelledby="pulse-metrics-heading">
          <div className="mb-3 flex items-center gap-2 sm:mb-4">
            <BarChart3 className="h-5 w-5 text-cyan-700" aria-hidden />
            <h2 id="pulse-metrics-heading" className="text-lg font-semibold text-slate-900">
              Cohort metrics
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-6">
            <StatTile label="Fellows" value={metrics.fellows} loading={statsLoading} />
            <StatTile label="Active (7d)" value={metrics.active} loading={statsLoading} />
            <StatTile label="Avg progress" value={metrics.avgProgress} loading={statsLoading} />
            <StatTile label="Discussions" value={metrics.discussions} loading={statsLoading} />
            <StatTile label="New posts (7d)" value={metrics.newPosts} loading={statsLoading} />
            <StatTile label="Attendance" value={metrics.attendance} loading={statsLoading} />
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          <Card className="overflow-hidden border-slate-200/90 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-white to-slate-50/80 pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <CalendarDays className="h-5 w-5 text-cyan-700" aria-hidden />
                Upcoming sessions
              </CardTitle>
              <CardDescription className="mt-1.5">Scheduled cohort sessions</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {sessionsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-7 w-7 animate-spin text-cyan-600" aria-label="Loading sessions" />
                </div>
              ) : upcoming.length === 0 ? (
                <p className="p-6 text-sm text-slate-600">No upcoming sessions scheduled.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {upcoming.map((s: { id: string; title?: string; scheduledDate?: string }) => (
                    <li key={s.id} className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-xs font-bold text-cyan-800 ring-1 ring-cyan-100">
                        {s.scheduledDate ? format(new Date(s.scheduledDate), "d") : "—"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium leading-snug text-slate-900">{s.title ?? "Session"}</p>
                        <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                          {s.scheduledDate ? format(new Date(s.scheduledDate), "EEEE, MMMM d, yyyy") : "Date TBD"}
                        </p>
                      </div>
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300" aria-hidden />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-slate-200/90 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-white to-slate-50/80 pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <ClipboardList className="h-5 w-5 text-cyan-700" aria-hidden />
                Session quizzes
              </CardTitle>
              <CardDescription className="mt-1.5">Linked quizzes and close dates</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {sessionsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-7 w-7 animate-spin text-cyan-600" aria-label="Loading quizzes" />
                </div>
              ) : quizRows.length === 0 ? (
                <p className="p-6 text-sm text-slate-600">No quizzes linked to sessions yet.</p>
              ) : (
                <>
                  <div className="space-y-3 p-4 sm:hidden">
                    {quizRows.map((q) => (
                      <QuizMobileCard key={q.id} q={q} />
                    ))}
                  </div>
                  <div className="hidden overflow-x-auto sm:block">
                    <table className="w-full min-w-[520px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          <th className="px-5 py-3">Quiz</th>
                          <th className="px-3 py-3">Session</th>
                          <th className="px-5 py-3">Closes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {quizRows.map((q) => (
                          <tr key={q.id} className="bg-white/80">
                            <td className="px-5 py-3">
                              <Link
                                className="font-medium text-cyan-800 underline-offset-2 hover:text-cyan-950 hover:underline"
                                href={`/quiz/${q.id}`}
                              >
                                {q.title}
                              </Link>
                            </td>
                            <td className="px-3 py-3 text-slate-600">{q.sessionTitle ?? "—"}</td>
                            <td className="px-5 py-3 text-slate-600 tabular-nums">
                              {q.closeAt ? format(new Date(q.closeAt), "MMM d, yyyy") : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden border-slate-200/90 shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-white to-slate-50/80">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Users className="h-5 w-5 text-cyan-700" aria-hidden />
              Fellow activity
            </CardTitle>
            <CardDescription>Overall progress, points, and quick check-ins (masked emails)</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {fellowsLoading ? (
              <div className="flex justify-center py-14">
                <Loader2 className="h-7 w-7 animate-spin text-cyan-600" aria-label="Loading fellow activity" />
              </div>
            ) : !(fellows ?? []).length ? (
              <p className="p-6 text-sm text-slate-600">No fellow data for this cohort yet.</p>
            ) : (
              <>
                <div className="space-y-3 p-4 sm:hidden">
                  {(fellows ?? []).map((f) => (
                    <FellowMobileCard
                      key={f.userId}
                      f={f}
                      currentUserId={profile?.id}
                      onCheckIn={handleCheckIn}
                      dmLoadingUserId={dmLoadingUserId}
                    />
                  ))}
                </div>
                <div className="hidden overflow-x-auto sm:block">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-5 py-3 text-left">Name</th>
                        <th className="px-3 py-3 text-left">Email</th>
                        <th className="px-3 py-3 text-left">Progress</th>
                        <th className="px-3 py-3 text-left">Points</th>
                        <th className="px-5 py-3 text-left">Flag</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(fellows ?? []).map((f) => {
                        const isSelf = f.userId === profile?.id;
                        const showCheckIn = f.needsAttention && !isSelf;
                        return (
                          <tr key={f.userId} className="bg-white/80">
                            <td className="px-5 py-3 font-medium text-slate-900">{f.name}</td>
                            <td className="px-3 py-3 text-slate-600">{f.email}</td>
                            <td className="px-3 py-3 tabular-nums text-slate-800">{f.progress}%</td>
                            <td className="px-3 py-3 tabular-nums text-slate-800">{f.totalPoints}</td>
                            <td className="px-5 py-3">
                              {showCheckIn ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-8 gap-1 border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
                                  onClick={() => handleCheckIn(f.userId)}
                                  disabled={dmLoadingUserId === f.userId}
                                >
                                  {dmLoadingUserId === f.userId ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                                  ) : (
                                    <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                                  )}
                                  Check in
                                </Button>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-slate-200/90 shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-white to-slate-50/80">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <MessageSquare className="h-5 w-5 text-cyan-700" aria-hidden />
              Resource progress by fellow
            </CardTitle>
            <CardDescription>
              Each cell is one fellow and one resource. Open a chat from Fellow activity when someone needs a nudge.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {matrixLoading ? (
              <div className="flex justify-center py-14">
                <Loader2 className="h-7 w-7 animate-spin text-cyan-600" aria-label="Loading resource matrix" />
              </div>
            ) : !matrixResources.length || !matrixFellows.length ? (
              <p className="p-6 text-sm text-slate-600">No resources or fellows to display for this cohort yet.</p>
            ) : (
              <>
                <div className="md:hidden space-y-4 p-4">
                  <div className="space-y-2">
                    <Label htmlFor="pulse-fellow-select" className="text-xs font-semibold uppercase text-slate-500">
                      Fellow
                    </Label>
                    <select
                      id="pulse-fellow-select"
                      className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      value={selectedFellowId ?? ""}
                      onChange={(e) => setSelectedFellowId(e.target.value || null)}
                    >
                      {matrixFellows.map((f) => (
                        <option key={f.userId} value={f.userId}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedFellow ? (
                    <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2 text-xs text-slate-600">
                      <span className="font-medium text-slate-800">{selectedFellow.name}</span>
                      <span className="mx-1">·</span>
                      <span>{mobileAttentionCount} resource{mobileAttentionCount === 1 ? "" : "s"} need attention</span>
                    </div>
                  ) : null}
                  <ul className="space-y-2">
                    {matrixResources.map((r) => {
                      const cell = selectedFellowId
                        ? cellMap.get(cellKey(selectedFellowId, r.resourceId))
                        : undefined;
                      return (
                        <li
                          key={r.resourceId}
                          className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-snug text-slate-900">{r.title}</p>
                            <p className="mt-0.5 text-[11px] text-slate-500">
                              Session {r.sessionNumber}
                              {r.isCore ? "" : " · Optional"} · {r.type}
                            </p>
                          </div>
                          <div className="shrink-0 pt-0.5">
                            <ProgressCell
                              state={cell?.state ?? null}
                              needsAttention={cell?.needsAttention ?? false}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="hidden md:block">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] border-collapse text-sm">
                      <thead>
                        <tr>
                          <th
                            scope="col"
                            className="sticky left-0 z-20 min-w-[140px] border-b border-r border-slate-200 bg-slate-50 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                          >
                            Fellow
                          </th>
                          {matrixResources.map((r) => (
                            <th
                              key={r.resourceId}
                              scope="col"
                              title={`${r.title} (${r.type})`}
                              className="min-w-[76px] max-w-[100px] border-b border-slate-200 bg-slate-50 px-1 py-2 text-center align-bottom text-[10px] font-semibold leading-tight text-slate-700"
                            >
                              <span className="block text-[9px] font-bold uppercase text-cyan-700">
                                S{r.sessionNumber}
                              </span>
                              <span className="line-clamp-3 text-slate-600">{r.title}</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {matrixFellows.map((fellow) => (
                          <tr key={fellow.userId} className="border-b border-slate-100">
                            <th
                              scope="row"
                              className="sticky left-0 z-10 border-r border-slate-200 bg-white px-3 py-2.5 text-left font-medium text-slate-900 shadow-[2px_0_8px_-4px_rgba(15,23,42,0.12)]"
                            >
                              <span className="line-clamp-2 leading-snug">{fellow.name}</span>
                            </th>
                            {matrixResources.map((r) => {
                              const cell = cellMap.get(cellKey(fellow.userId, r.resourceId));
                              return (
                                <td key={r.resourceId} className="border-l border-slate-50 px-1 py-2 text-center">
                                  <ProgressCell
                                    state={cell?.state ?? null}
                                    needsAttention={cell?.needsAttention ?? false}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <MatrixLegend />
              </>
            )}
          </CardContent>
        </Card>

        <Separator className="opacity-60" />

        <p className="flex flex-wrap items-center gap-2 text-center text-xs text-slate-500 sm:text-left">
          <MessageSquare className="mx-auto h-4 w-4 shrink-0 text-slate-400 sm:mx-0" aria-hidden />
          <span>
            This page is read-only for privacy. For policy or grading questions, loop in your facilitator—they can see
            full detail in their tools.
          </span>
        </p>
      </div>
    </DashboardLayout>
  );
}
