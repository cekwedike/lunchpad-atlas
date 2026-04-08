"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorMessage } from "@/components/ui/error-message";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Trophy,
  Medal,
  Award,
  Crown,
  RefreshCw,
  Sparkles,
  Flame,
  Zap,
  Star,
} from "lucide-react";
import { useLeaderboard, useLeaderboardRank, useLeaderboardMonths } from "@/hooks/api/useLeaderboard";
import { useProfile } from "@/hooks/api/useProfile";
import { useCohorts, useAdminUsers } from "@/hooks/api/useAdmin";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export default function LeaderboardPage() {
  const [selectedMonth, setSelectedMonth] = useState<{ month: number; year: number } | null>(null);
  const [selectedCohortId, setSelectedCohortId] = useState<string | null>(null);
  const [adjustUserId, setAdjustUserId] = useState("");
  const [adjustPoints, setAdjustPoints] = useState("");
  const [adjustDescription, setAdjustDescription] = useState("");
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [fellowSearchInput, setFellowSearchInput] = useState("");
  const [debouncedFellowSearch, setDebouncedFellowSearch] = useState("");
  const [selectedFellow, setSelectedFellow] = useState<any | null>(null);
  const [adjustCohortId, setAdjustCohortId] = useState<string | null>(null);

  const { data: profile } = useProfile();
  const isAdmin = profile?.role === 'ADMIN';
  const isFacilitator = profile?.role === 'FACILITATOR';
  const isFellow = profile?.role === 'FELLOW';
  const canAdjustPoints = isAdmin || isFacilitator;
  const canViewLeaderboard = isFellow || isAdmin || isFacilitator;
  const normalizedFellowSearch = debouncedFellowSearch.trim();
  const shouldSearchFellows = canAdjustPoints && normalizedFellowSearch.length >= 2;
  // Cohorts endpoint is role-aware; don't disable it for facilitators.
  const { data: cohortsData } = useCohorts(true);
  const cohorts = Array.isArray(cohortsData) ? cohortsData : [];
  const availableCohorts = (() => {
    if (isAdmin) return cohorts;
    if (!isFacilitator) return [];

    // Prefer profile-provided cohorts if present, otherwise derive from cohorts list.
    const fromProfile = (profile as any)?.facilitatedCohorts;
    if (Array.isArray(fromProfile) && fromProfile.length > 0) return fromProfile;

    return cohorts.filter((c: any) => {
      if (c.facilitatorId && c.facilitatorId === profile?.id) return true;
      const facilitators = c.facilitators ?? [];
      return Array.isArray(facilitators) && facilitators.some((f: any) => f.userId === profile?.id || f.id === profile?.id);
    });
  })();
  const { data: fellowsData, isLoading: fellowsLoading } = useAdminUsers(
    shouldSearchFellows
      ? {
          role: 'FELLOW',
          cohortId: adjustCohortId || undefined,
          search: normalizedFellowSearch,
        }
      : undefined,
    { enabled: shouldSearchFellows },
  );
  const fellows = (fellowsData as any)?.users || [];

  useEffect(() => {
    if (selectedCohortId) return;
    if (profile?.cohortId) {
      setSelectedCohortId(profile.cohortId);
      return;
    }
    if (availableCohorts.length > 0) {
      setSelectedCohortId(availableCohorts[0].id);
    }
  }, [profile?.cohortId, availableCohorts, selectedCohortId]);

  useEffect(() => {
    if (adjustCohortId) return;
    if (selectedCohortId) {
      setAdjustCohortId(selectedCohortId);
      return;
    }
    if (availableCohorts.length > 0) {
      setAdjustCohortId(availableCohorts[0].id);
    }
  }, [adjustCohortId, selectedCohortId, availableCohorts]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedFellowSearch(fellowSearchInput);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [fellowSearchInput]);

  const { data: monthsData } = useLeaderboardMonths(selectedCohortId || undefined);
  const monthOptions = monthsData?.months || [];

  useEffect(() => {
    if (selectedMonth || monthOptions.length === 0) return;
    const latest = monthOptions[monthOptions.length - 1];
    setSelectedMonth({ month: latest.month, year: latest.year });
  }, [selectedMonth, monthOptions]);

  const { data: leaderboard, isLoading, error, refetch, isFetching } = useLeaderboard(
    selectedCohortId || undefined,
    selectedMonth || undefined,
  );
  const { data: userRank } = useLeaderboardRank(
    selectedCohortId || undefined,
    selectedMonth || undefined,
  );

  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 10000);

    return () => clearInterval(interval);
  }, [refetch]);

  if (error) {
    return (
      <DashboardLayout>
        <ErrorMessage message="Failed to load leaderboard" onRetry={() => refetch()} />
      </DashboardLayout>
    );
  }

  const allEntries = leaderboard?.data || [];
  const topThree = allEntries.slice(0, 3);
  const rankedList = allEntries;
  const maxPoints = rankedList.length ? Math.max(1, ...rankedList.map((e) => e.points)) : 1;

  const lastUpdatedLabel = leaderboard?.data?.length
    ? `Live update • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : 'Live update';

  const handleAdjustPoints = async () => {
    if (!adjustUserId.trim()) {
      toast.error('Select a fellow');
      return;
    }

    const parsedPoints = Number(adjustPoints);
    if (!Number.isFinite(parsedPoints) || parsedPoints === 0) {
      toast.error('Points must be a non-zero number');
      return;
    }

    if (!adjustDescription.trim()) {
      toast.error('Reason is required');
      return;
    }

    try {
      setIsAdjusting(true);
      await apiClient.post('/leaderboard/adjust-points', {
        userId: adjustUserId.trim(),
        points: parsedPoints,
        description: adjustDescription.trim(),
      });
      toast.success('Points adjusted');
      setAdjustUserId('');
      setSelectedFellow(null);
      setFellowSearchInput('');
      setDebouncedFellowSearch('');
      setAdjustPoints('');
      setAdjustDescription('');
      refetch();
    } catch (error: any) {
      toast.error('Failed to adjust points', error?.message || 'Try again');
    } finally {
      setIsAdjusting(false);
    }
  };

  return (
    <DashboardLayout>
      <div
        className="relative space-y-8 pb-10"
        style={{
          fontFamily: '"Space Grotesk", "IBM Plex Sans", ui-sans-serif, system-ui',
        }}
      >
        {/* Decorative background */}
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden opacity-[0.35]">
          <div className="absolute -left-32 top-20 h-96 w-96 rounded-full bg-violet-400/30 blur-3xl" />
          <div className="absolute right-0 top-40 h-80 w-80 rounded-full bg-amber-300/25 blur-3xl" />
          <div className="absolute bottom-20 left-1/3 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
        </div>

        {/* Hero */}
        <section className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-[1px] shadow-xl shadow-indigo-500/20">
          <div className="relative overflow-hidden rounded-[1.95rem] bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 px-6 py-8 sm:px-10 sm:py-10">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.06%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-40" />
            <div className="absolute -right-8 -top-8 h-32 w-32 text-amber-300/20">
              <Trophy className="h-full w-full" strokeWidth={1} />
            </div>
            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-200/90 backdrop-blur-sm">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  Live Cohort Rankings
                </div>
                <h1 className="mt-4 bg-gradient-to-r from-white via-amber-100 to-orange-200 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
                  Leaderboard
                </h1>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-indigo-100/90">
                  Race your cohort in real time. Snag the crown, flex your streak, and become Fellow of the Month.
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-200">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                    </span>
                    {lastUpdatedLabel}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-indigo-200/80">
                    {selectedCohortId ? 'Cohort locked in' : 'Pick a cohort'}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => refetch()}
                  variant="secondary"
                  size="sm"
                  className="border border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
                  type="button"
                  disabled={isFetching}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                  {isFetching ? 'Refreshing…' : 'Refresh'}
                </Button>
              </div>
            </div>
          </div>
        </section>

        {canViewLeaderboard ? (
          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="overflow-hidden border-slate-200/80 bg-white/80 shadow-lg shadow-slate-200/50 backdrop-blur-sm">
              <div className="space-y-4 p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                      <Flame className="h-5 w-5 text-orange-500" />
                      Pick your arena
                    </h2>
                    <p className="text-xs text-slate-500">Months inside the cohort run only.</p>
                  </div>
                  {availableCohorts.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span className="font-medium">Cohort</span>
                      <select
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        value={selectedCohortId || ''}
                        onChange={(event) => setSelectedCohortId(event.target.value)}
                      >
                        {availableCohorts.map((cohort: any) => (
                          <option key={cohort.id} value={cohort.id}>
                            {cohort.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {monthOptions.length === 0 ? (
                    <span className="text-sm text-slate-500">No active cohort months available</span>
                  ) : (
                    monthOptions.map((month) => {
                      const active =
                        month.month === selectedMonth?.month && month.year === selectedMonth?.year;
                      return (
                        <Button
                          key={`${month.year}-${month.month}`}
                          variant={active ? 'default' : 'outline'}
                          onClick={() => setSelectedMonth({ month: month.month, year: month.year })}
                          className={cn(
                            'rounded-full border-2 transition-all',
                            active
                              ? 'border-indigo-500 bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25'
                              : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50',
                          )}
                        >
                          {month.label}
                        </Button>
                      );
                    })
                  )}
                </div>
              </div>
            </Card>

            {userRank && isFellow && (
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 p-[1px] shadow-xl shadow-orange-500/30">
                <div className="relative overflow-hidden rounded-[calc(0.75rem-1px)] bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-6 text-white">
                  <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-400/20 blur-2xl" />
                  <div className="absolute bottom-0 left-0 h-20 w-20 rounded-full bg-violet-500/20 blur-2xl" />
                  <div className="relative space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-amber-200/90">
                          <Zap className="h-3.5 w-3.5 text-amber-300" />
                          Your position
                        </p>
                        <p className="mt-2 text-5xl font-black tabular-nums tracking-tight text-white">
                          #{userRank.rank ?? '--'}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-center backdrop-blur-sm">
                        <p className="text-[10px] uppercase tracking-wider text-white/60">Points</p>
                        <p className="text-xl font-bold tabular-nums">{userRank.points}</p>
                      </div>
                    </div>
                    <div className="border-t border-white/10 pt-3">
                      <p className="text-lg font-semibold">{userRank.userName || 'You'}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-amber-100/80">
                        <Flame className="h-4 w-4 text-orange-300" />
                        {userRank.streak} day streak — keep it rolling
                      </p>
                    </div>
                    {(isAdmin || isFacilitator) && (
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
                          <div className="text-[10px] uppercase tracking-[0.15em] text-white/50">Base</div>
                          <div className="text-lg font-semibold tabular-nums">{userRank.basePoints ?? 0}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
                          <div className="text-[10px] uppercase tracking-[0.15em] text-white/50">Bonus</div>
                          <div className="text-lg font-semibold tabular-nums">{userRank.bonusPoints ?? 0}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
                          <div className="text-[10px] uppercase tracking-[0.15em] text-white/50">Chat + comments</div>
                          <div className="text-lg font-semibold tabular-nums">{userRank.chatCount ?? 0}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </section>
        ) : null}

        {canAdjustPoints && (
          <Card className="border-slate-200/80 bg-gradient-to-b from-white to-slate-50/80 shadow-md">
            <div className="space-y-4 p-6">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500" />
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Award or deduct points</h2>
                  <p className="text-xs text-slate-500">Every change is logged for transparency.</p>
                </div>
              </div>
              <div className="grid gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">Cohort</label>
                  <select
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm"
                    value={adjustCohortId || ''}
                    onChange={(event) => {
                      setAdjustCohortId(event.target.value || null);
                      setSelectedFellow(null);
                      setAdjustUserId('');
                      setFellowSearchInput('');
                      setDebouncedFellowSearch('');
                    }}
                  >
                    <option value="">Select cohort</option>
                    {availableCohorts.map((cohort: any) => (
                      <option key={cohort.id} value={cohort.id}>
                        {cohort.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Fellow</label>
                  <Input
                    value={fellowSearchInput}
                    onChange={(event) => {
                      setFellowSearchInput(event.target.value);
                      if (selectedFellow) {
                        setSelectedFellow(null);
                        setAdjustUserId('');
                      }
                    }}
                    placeholder="Search by name or email"
                    disabled={!adjustCohortId}
                    className="rounded-xl"
                  />
                  {!selectedFellow && (
                    <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-inner">
                      {!adjustCohortId ? (
                        <div className="px-3 py-2 text-xs text-slate-500">Select a cohort to search fellows</div>
                      ) : !shouldSearchFellows ? (
                        <div className="px-3 py-2 text-xs text-slate-500">Type at least 2 characters</div>
                      ) : fellowsLoading ? (
                        <div className="px-3 py-2 text-xs text-slate-500">Loading fellows...</div>
                      ) : fellows.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-slate-500">No fellows found</div>
                      ) : (
                        fellows.map((user: any) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => {
                              setAdjustUserId(user.id);
                              setSelectedFellow(user);
                              setFellowSearchInput(`${user.firstName} ${user.lastName}`.trim());
                              setDebouncedFellowSearch(`${user.firstName} ${user.lastName}`.trim());
                            }}
                            className={cn(
                              'flex w-full items-start gap-2 px-3 py-2.5 text-left text-xs transition hover:bg-indigo-50/80',
                              selectedFellow?.id === user.id && 'bg-indigo-50',
                            )}
                          >
                            <span className="font-medium text-slate-900">
                              {user.firstName} {user.lastName}
                            </span>
                            <span className="text-slate-500">{user.email}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                  {selectedFellow && (
                    <div className="mt-2 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-xs text-emerald-800">
                      <span>
                        Selected: {selectedFellow.firstName} {selectedFellow.lastName}
                      </span>
                      <button
                        type="button"
                        className="font-medium text-emerald-700 underline-offset-2 hover:underline"
                        onClick={() => {
                          setSelectedFellow(null);
                          setAdjustUserId('');
                          setFellowSearchInput('');
                          setDebouncedFellowSearch('');
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Points (+/-)</label>
                  <Input
                    value={adjustPoints}
                    onChange={(event) => setAdjustPoints(event.target.value)}
                    placeholder="e.g. 15 or -5"
                    inputMode="numeric"
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Reason</label>
                  <Input
                    value={adjustDescription}
                    onChange={(event) => setAdjustDescription(event.target.value)}
                    placeholder="Reason for adjustment"
                    className="rounded-xl"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleAdjustPoints}
                  disabled={isAdjusting}
                  className="justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500"
                >
                  {isAdjusting ? 'Adjusting...' : 'Adjust points'}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {canViewLeaderboard ? (
          isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="animate-pulse overflow-hidden border-slate-200">
                  <div className="h-24 bg-gradient-to-r from-slate-100 to-slate-50 p-6">
                    <div className="h-4 w-3/4 rounded bg-slate-200" />
                  </div>
                </Card>
              ))}
            </div>
          ) : allEntries.length > 0 ? (
            <>
              {topThree.length >= 3 && (
                <section className="relative">
                  <div className="mb-4 flex items-center justify-center gap-2 text-sm font-semibold text-slate-600">
                    <Trophy className="h-5 w-5 text-amber-500" />
                    Top three — the podium
                  </div>
                  <div className="mx-auto grid max-w-4xl grid-cols-3 items-end gap-3 sm:gap-4">
                    {/* 2nd */}
                    <div className="flex flex-col items-center">
                      <div className="mb-2 w-full rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-100 to-white p-4 pb-8 text-center shadow-lg transition hover:-translate-y-0.5 sm:p-5">
                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">2nd</div>
                        <div className="mx-auto mt-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 text-lg font-bold text-white shadow-inner sm:h-16 sm:w-16 sm:text-xl">
                          {topThree[1]?.userName?.slice(0, 2).toUpperCase() || '?'}
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-900">
                          {topThree[1]?.userName || 'Unknown'}
                        </p>
                        <p className="mt-1 text-xs font-medium text-slate-500">{topThree[1]?.points} pts</p>
                        <Medal className="mx-auto mt-2 h-7 w-7 text-slate-400" />
                      </div>
                      <div className="h-3 w-full rounded-t-lg bg-gradient-to-t from-slate-300 to-slate-200" />
                    </div>
                    {/* 1st */}
                    <div className="z-10 flex flex-col items-center">
                      <div className="mb-2 w-full rounded-2xl border-2 border-amber-300/80 bg-gradient-to-b from-amber-100 via-amber-50 to-white p-4 pb-10 text-center shadow-xl shadow-amber-200/50 ring-4 ring-amber-200/30 sm:p-6 sm:pb-12">
                        <Crown className="mx-auto mb-1 h-8 w-8 text-amber-500 drop-shadow-sm" />
                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-800">Champion</div>
                        <div className="mx-auto mt-2 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-2xl font-black text-white shadow-lg sm:h-24 sm:w-24 sm:text-3xl">
                          {topThree[0]?.userName?.slice(0, 2).toUpperCase() || '?'}
                        </div>
                        <p className="mt-3 line-clamp-2 text-base font-bold text-slate-900">
                          {topThree[0]?.userName || 'Unknown'}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-amber-700">{topThree[0]?.points} pts</p>
                      </div>
                      <div className="h-5 w-full rounded-t-lg bg-gradient-to-t from-amber-400 to-amber-200" />
                    </div>
                    {/* 3rd */}
                    <div className="flex flex-col items-center">
                      <div className="mb-2 w-full rounded-2xl border border-orange-200/80 bg-gradient-to-b from-orange-50 to-white p-4 pb-6 text-center shadow-md transition hover:-translate-y-0.5 sm:p-5">
                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400">3rd</div>
                        <div className="mx-auto mt-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-700 text-base font-bold text-white shadow-inner sm:h-14 sm:w-14">
                          {topThree[2]?.userName?.slice(0, 2).toUpperCase() || '?'}
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-900">
                          {topThree[2]?.userName || 'Unknown'}
                        </p>
                        <p className="mt-1 text-xs font-medium text-slate-500">{topThree[2]?.points} pts</p>
                        <Award className="mx-auto mt-2 h-6 w-6 text-orange-500" />
                      </div>
                      <div className="h-2 w-full rounded-t-lg bg-gradient-to-t from-orange-300 to-orange-100" />
                    </div>
                  </div>
                </section>
              )}

              <section className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <span className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-200" />
                  Full standings
                  <span className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-200" />
                </h3>
                {rankedList.map((entry) => {
                  const isCurrentUser = entry.userId === profile?.id;
                  const pct = Math.round((entry.points / maxPoints) * 100);
                  return (
                    <Card
                      key={entry.userId}
                      className={cn(
                        'group overflow-hidden border transition-all duration-200 hover:shadow-md',
                        isCurrentUser
                          ? 'border-indigo-300 bg-gradient-to-r from-indigo-50/90 to-white ring-2 ring-indigo-200/60'
                          : 'border-slate-200/80 bg-white/90 hover:border-indigo-200/60',
                      )}
                    >
                      <div className="relative p-4 sm:p-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 items-center gap-4">
                            <div
                              className={cn(
                                'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-black tabular-nums shadow-sm',
                                entry.rank === 1 &&
                                  'bg-gradient-to-br from-amber-400 to-orange-600 text-white',
                                entry.rank === 2 &&
                                  'bg-gradient-to-br from-slate-400 to-slate-600 text-white',
                                entry.rank === 3 &&
                                  'bg-gradient-to-br from-orange-400 to-amber-700 text-white',
                                entry.rank > 3 && 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
                              )}
                            >
                              {entry.rank <= 3 ? (
                                <span className="text-lg">{entry.rank}</span>
                              ) : (
                                <span>#{entry.rank}</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="flex items-center gap-2 text-base font-semibold text-slate-900">
                                <span className="truncate">{entry.userName || 'Unknown'}</span>
                                {entry.rank === 1 && <Crown className="h-4 w-4 shrink-0 text-amber-500" />}
                                {isCurrentUser && (
                                  <span className="shrink-0 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                    You
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-slate-500">{entry.streak} day streak</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-end gap-6 sm:justify-end">
                            <div className="text-right">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Total
                              </p>
                              <p className="text-xl font-bold tabular-nums text-slate-900">{entry.points}</p>
                            </div>
                            {(isAdmin || isFacilitator) && (
                              <div className="text-right">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                  Bonus
                                </p>
                                <p className="text-sm font-bold text-emerald-600">+{entry.bonusPoints ?? 0}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </section>
            </>
          ) : (
            <EmptyState
              icon={Trophy}
              title="No leaderboard data"
              description="Check back later to see rankings"
            />
          )
        ) : null}
      </div>
    </DashboardLayout>
  );
}
