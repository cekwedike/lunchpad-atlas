"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorMessage } from "@/components/ui/error-message";
import { EmptyState } from "@/components/ui/empty-state";
import { Trophy, Medal, Award, Crown, Search, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { useLeaderboard, useLeaderboardRank, useLeaderboardMonths } from "@/hooks/api/useLeaderboard";
import { useProfile } from "@/hooks/api/useProfile";
import { useCohorts, useAdminUsers } from "@/hooks/api/useAdmin";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";

export default function LeaderboardPage() {
  const [searchQuery, setSearchQuery] = useState("");
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
  const { data: cohortsData } = useCohorts(isAdmin);
  const cohorts = Array.isArray(cohortsData) ? cohortsData : [];
  const availableCohorts = isAdmin
    ? cohorts
    : isFacilitator
      ? (profile?.facilitatedCohorts || [])
      : [];
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

  // Auto-refresh every 10 seconds for live updates
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

  const filteredEntries = leaderboard?.data?.filter((entry) =>
    entry.userName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const topThree = filteredEntries?.slice(0, 3) || [];
  const remaining = filteredEntries?.slice(3) || [];

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Award className="w-6 h-6 text-orange-600" />;
    return <span className="text-lg font-bold text-gray-600">#{rank}</span>;
  };

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
        className="space-y-8"
        style={{
          fontFamily: '"Space Grotesk", "IBM Plex Sans", ui-sans-serif, system-ui',
        }}
      >
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_top,_#dbeafe,_#ffffff)] p-6 sm:p-8">
          <div className="absolute -left-20 -top-16 h-56 w-56 rounded-full bg-gradient-to-br from-emerald-300/40 to-sky-400/20 blur-2xl" />
          <div className="absolute -bottom-24 right-10 h-48 w-48 rounded-full bg-gradient-to-br from-amber-200/50 to-rose-200/40 blur-2xl" />
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Live Cohort Rankings</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">Leaderboard</h1>
              <p className="mt-2 text-sm text-slate-600">
                Chase the crown with your cohort in real time. Finish #1 to become the LaunchPad Fellow of the Month.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
                  {lastUpdatedLabel}
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-500">
                  {selectedCohortId ? 'Cohort locked' : 'Select cohort'}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={() => refetch()}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 border-slate-300"
                type="button"
                disabled={isFetching}
              >
                <RefreshCw className="w-4 h-4" />
                {isFetching ? 'Refreshing...' : 'Refresh'}
              </Button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search fellow..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full sm:w-56 border-slate-200"
                />
              </div>
            </div>
          </div>
        </section>

        {canViewLeaderboard ? (
          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-slate-200">
            <div className="p-6 space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Active Months</h2>
                  <p className="text-xs text-slate-500">Only months inside the cohort run are eligible.</p>
                </div>
                {availableCohorts.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <span>Cohort</span>
                    <select
                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm"
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
                  <span className="text-sm text-slate-500">
                    No active cohort months available
                  </span>
                ) : (
                  monthOptions.map((month) => (
                    <Button
                      key={`${month.year}-${month.month}`}
                      variant={month.month === selectedMonth?.month && month.year === selectedMonth?.year ? "default" : "outline"}
                      onClick={() => setSelectedMonth({ month: month.month, year: month.year })}
                      className="rounded-full"
                    >
                      {month.label}
                    </Button>
                  ))
                )}
              </div>
            </div>
          </Card>

          {userRank && isFellow && (
            <Card className="border-slate-200 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-700 text-white">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/60">Your Position</p>
                    <p className="mt-2 text-4xl font-semibold">#{userRank.rank ?? '--'}</p>
                  </div>
                  <div className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/70">
                    {userRank.points} pts
                  </div>
                </div>
                <div>
                  <p className="text-lg font-semibold">{userRank.userName || 'You'}</p>
                  <p className="text-xs text-white/70">{userRank.streak} day streak</p>
                </div>
                {(isAdmin || isFacilitator) && (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg bg-white/10 p-3">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">Base</div>
                      <div className="text-lg font-semibold">{userRank.basePoints ?? 0}</div>
                    </div>
                    <div className="rounded-lg bg-white/10 p-3">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">Bonus</div>
                      <div className="text-lg font-semibold">{userRank.bonusPoints ?? 0}</div>
                    </div>
                    <div className="rounded-lg bg-white/10 p-3">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">Chat + Comments</div>
                      <div className="text-lg font-semibold">{userRank.chatCount ?? 0}</div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </section>
        ) : null}

        {canAdjustPoints && (
          <Card className="border-slate-200 bg-white">
            <div className="p-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Award or Deduct Points</h2>
                <p className="text-xs text-slate-500">Every change is recorded for transparency.</p>
              </div>
              <div className="grid gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">Cohort</label>
                  <select
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-sm"
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
                  />
                  <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-slate-200 bg-white">
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
                          className={`flex w-full items-start gap-2 px-3 py-2 text-left text-xs transition hover:bg-slate-50 ${
                            selectedFellow?.id === user.id ? 'bg-slate-100' : ''
                          }`}
                        >
                          <span className="font-medium text-slate-900">
                            {user.firstName} {user.lastName}
                          </span>
                          <span className="text-slate-500">{user.email}</span>
                        </button>
                      ))
                    )}
                  </div>
                  {selectedFellow && (
                    <div className="mt-2 flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                      <span>
                        Selected: {selectedFellow.firstName} {selectedFellow.lastName}
                      </span>
                      <button
                        type="button"
                        className="text-emerald-700 underline-offset-2 hover:underline"
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
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Reason</label>
                  <Input
                    value={adjustDescription}
                    onChange={(event) => setAdjustDescription(event.target.value)}
                    placeholder="Reason for adjustment"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleAdjustPoints}
                  disabled={isAdjusting}
                  className="justify-center"
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
              <Card key={i} className="animate-pulse">
                <div className="p-6">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                </div>
              </Card>
            ))}
          </div>
          ) : filteredEntries && filteredEntries.length > 0 ? (
            <>
              {topThree.length >= 3 && (
                <section className="grid gap-6 md:grid-cols-3">
                  <Card className="border-slate-200 bg-gradient-to-b from-slate-100 to-white">
                    <div className="p-6 text-center space-y-3">
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Second</div>
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 text-white text-2xl font-semibold">
                        {topThree[1]?.userName?.slice(0, 2).toUpperCase() || "?"}
                      </div>
                      <p className="font-semibold text-slate-900">{topThree[1]?.userName || "Unknown"}</p>
                      <p className="text-sm text-slate-500">{topThree[1]?.points} pts</p>
                      <Medal className="mx-auto h-6 w-6 text-slate-400" />
                    </div>
                  </Card>
                  <Card className="border-amber-300 bg-gradient-to-b from-amber-200 via-amber-100 to-white">
                    <div className="p-6 text-center space-y-3">
                      <div className="text-xs uppercase tracking-[0.2em] text-amber-700">Champion</div>
                      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-900 text-white text-3xl font-semibold">
                        {topThree[0]?.userName?.slice(0, 2).toUpperCase() || "?"}
                      </div>
                      <p className="font-semibold text-slate-900">{topThree[0]?.userName || "Unknown"}</p>
                      <p className="text-sm text-slate-500">{topThree[0]?.points} pts</p>
                      <Crown className="mx-auto h-8 w-8 text-amber-500" />
                    </div>
                  </Card>
                  <Card className="border-orange-200 bg-gradient-to-b from-orange-100 to-white">
                    <div className="p-6 text-center space-y-3">
                      <div className="text-xs uppercase tracking-[0.2em] text-orange-500">Third</div>
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white text-xl font-semibold">
                        {topThree[2]?.userName?.slice(0, 2).toUpperCase() || "?"}
                      </div>
                      <p className="font-semibold text-slate-900">{topThree[2]?.userName || "Unknown"}</p>
                      <p className="text-sm text-slate-500">{topThree[2]?.points} pts</p>
                      <Award className="mx-auto h-6 w-6 text-orange-400" />
                    </div>
                  </Card>
                </section>
              )}

              <section className="space-y-3">
                {remaining.map((entry) => {
                  const isCurrentUser = entry.userId === profile?.id;
                  return (
                    <Card key={entry.userId} className={isCurrentUser ? "border-blue-200 bg-blue-50/60" : "border-slate-200"}>
                      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white text-sm font-semibold">
                            #{entry.rank}
                          </div>
                          <div>
                            <p className="text-base font-semibold text-slate-900 flex items-center gap-2">
                              {entry.userName || "Unknown"}
                              {entry.rank === 1 && <Crown className="h-4 w-4 text-amber-500" />}
                            </p>
                            <p className="text-xs text-slate-500">{entry.streak} day streak</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                          <div>
                            <p className="text-xs text-slate-500">Total Points</p>
                            <p className="text-lg font-semibold text-slate-900">{entry.points}</p>
                          </div>
                          {(isAdmin || isFacilitator) && (
                            <div>
                              <p className="text-xs text-slate-500">Bonus</p>
                              <p className="text-sm font-semibold text-emerald-600">+{entry.bonusPoints ?? 0}</p>
                            </div>
                          )}
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
