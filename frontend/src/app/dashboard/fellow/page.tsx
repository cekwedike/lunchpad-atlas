"use client";

import {
  BookOpen, Trophy, Flame, TrendingUp, Award, ArrowRight,
  Rocket, Target, MessageSquare, RefreshCw, Zap, Sparkles,
  PlayCircle, Compass, Flag, GraduationCap,
  PenLine, Pencil, Brain, Medal, CheckCircle, Star,
  Gamepad2, Monitor, MessageCircle, MessagesSquare,
  Megaphone, Landmark, Globe, Reply, Mic, Radio, Volume2, Heart,
  LayoutGrid, Swords, BookMarked, MonitorPlay, Sprout, BadgeCheck, Diamond, Crown,
  Gem, Wallet, Coins, CircleDollarSign, ShieldCheck, Infinity,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useProfile, useUserAchievements, useAllAchievements, useUserStats } from "@/hooks/api/useProfile";
import { useResources } from "@/hooks/api/useResources";
import { useLeaderboardRank } from "@/hooks/api/useLeaderboard";
import { useAuthStore } from "@/stores/authStore";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

/* ─── Icon map for achievement icons stored as string names in DB ─────── */
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  PlayCircle, BookOpen, Compass, Flag, GraduationCap,
  PenLine, Pencil, Brain, Medal, CheckCircle, Star, Sparkles, Award,
  Gamepad2, Monitor, Target, Trophy, Rocket,
  MessageCircle, MessageSquare, MessagesSquare, Megaphone, Landmark, Globe,
  Reply, MessageSquareDot: MessageCircle, Mic, Radio, Volume2, Heart,
  Zap, Flame, LayoutGrid, Swords, BookMarked, MonitorPlay, Sprout,
  BadgeCheck, Diamond, Crown,
  TrendingUp, Gem, Wallet, Coins, CircleDollarSign, ShieldCheck,
  FlameKindling: Flame, Infinity,
};

function AchievementIcon({ name, className }: { name?: string; className?: string }) {
  const Icon = (name && ICON_MAP[name]) ? ICON_MAP[name] : Award;
  return <Icon className={className} />;
}

/* ─── Donut chart (SVG) ──────────────────────────────────────────────── */
function DonutChart({ pct, size = 128 }: { pct: number; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const sw = 10;
  const r = cx - sw / 2 - 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={sw} />
      {/* Fill */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="#6366f1"
        strokeWidth={sw}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dashoffset 0.9s ease" }}
      />
      <text x={cx} y={cy - 5} textAnchor="middle" fill="#111827" fontSize="20" fontWeight="700" fontFamily="inherit">
        {pct}%
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#6b7280" fontSize="9" fontFamily="inherit">
        COMPLETE
      </text>
    </svg>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────── */
export default function FellowDashboard() {
  const { user, _hasHydrated } = useAuthStore();
  const queryClient = useQueryClient();
  const [lastSynced, setLastSynced] = useState<Date>(new Date());

  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: userAchievements = [], isLoading: achievementsLoading } = useUserAchievements();
  const { data: allAchievements = [], isLoading: allAchievementsLoading } = useAllAchievements();
  const { data: stats, isLoading: statsLoading } = useUserStats();
  const { data: resources = [], isLoading: resourcesLoading } = useResources();
  const cohortId = (profile as any)?.cohortId ?? undefined;
  const { data: rankData, isLoading: rankLoading } = useLeaderboardRank(cohortId);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["user"] });
    queryClient.invalidateQueries({ queryKey: ["user-achievements"] });
    queryClient.invalidateQueries({ queryKey: ["user-stats"] });
    queryClient.invalidateQueries({ queryKey: ["leaderboard-rank"] });
    queryClient.invalidateQueries({ queryKey: ["resources"] });
    setLastSynced(new Date());
  };

  /* ── Derived values ── */
  const firstName  = profile?.firstName || profile?.name?.split(" ")[0] || user?.name?.split(" ")[0] || "there";
  const initials   = ((profile?.firstName?.[0] ?? "") + (profile?.lastName?.[0] ?? "")).toUpperCase() || firstName.slice(0, 2).toUpperCase();
  const cohortName = (profile as any)?.cohort?.name ?? null;

  const resourcesCompleted = profile?.resourcesCompleted ?? stats?.resourcesCompleted ?? 0;
  const totalPoints        = profile?.totalPoints        ?? stats?.totalPoints        ?? 0;
  const currentStreak      = profile?.currentStreak      ?? 0;
  const longestStreak      = profile?.longestStreak      ?? currentStreak;
  const totalResources     = resources.length;
  const completionPct      = totalResources > 0 ? Math.round((resourcesCompleted / totalResources) * 100) : 0;
  const unlockedCount      = (userAchievements as any[]).length;
  const totalCount         = (allAchievements as any[]).length;
  const quizzesTaken       = stats?.quizzesTaken      ?? 0;
  const discussionsPosted  = stats?.discussionsPosted  ?? 0;
  const myRank             = rankData?.rank       ?? null;
  const totalRankUsers     = rankData?.totalUsers ?? null;

  const pageLoading = !_hasHydrated || profileLoading;

  /* Activity breakdown bars — widths relative to the highest value */
  const maxAct = Math.max(resourcesCompleted, quizzesTaken, discussionsPosted, 1);
  const bars = [
    { label: "Resources",   value: resourcesCompleted, pct: Math.round((resourcesCompleted / maxAct) * 100), color: "bg-indigo-500"  },
    { label: "Quizzes",     value: quizzesTaken,       pct: Math.round((quizzesTaken       / maxAct) * 100), color: "bg-emerald-500" },
    { label: "Discussions", value: discussionsPosted,  pct: Math.round((discussionsPosted  / maxAct) * 100), color: "bg-amber-500"   },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 pb-8">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            {pageLoading ? (
              <div className="space-y-1.5">
                <div className="h-6 w-52 rounded bg-gray-200 animate-pulse" />
                <div className="h-4 w-32 rounded bg-gray-100 animate-pulse" />
              </div>
            ) : (
              <>
                <h1 className="text-xl font-semibold text-gray-900">
                  Welcome back, {firstName}
                </h1>
                {cohortName && (
                  <p className="text-sm text-gray-600 mt-0.5">{cohortName}</p>
                )}
              </>
            )}
          </div>

          <button
            onClick={handleRefresh}
            disabled={profileLoading}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-500 shadow-sm hover:bg-gray-50 hover:text-gray-700 transition disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", profileLoading && "animate-spin")} />
            <span>
              {profileLoading
                ? "Syncing…"
                : `Synced ${formatDistanceToNow(lastSynced, { addSuffix: true })}`}
            </span>
          </button>
        </div>

        {/* ── Stat cards ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Resources */}
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
            <div className="flex items-start justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Resources</p>
              <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                <BookOpen className="h-4 w-4 text-indigo-600" />
              </div>
            </div>
            {pageLoading || resourcesLoading ? (
              <div className="h-9 w-16 rounded bg-gray-100 animate-pulse mt-3" />
            ) : (
              <p className="text-3xl font-bold text-gray-900 mt-3">{resourcesCompleted}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {totalResources > 0 ? `of ${totalResources} total` : "completed"}
            </p>
            <div className="mt-3 h-1 rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-700"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>

          {/* Points */}
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
            <div className="flex items-start justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Points</p>
              <div className="h-8 w-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                <Zap className="h-4 w-4 text-violet-600" />
              </div>
            </div>
            {pageLoading ? (
              <div className="h-9 w-20 rounded bg-gray-100 animate-pulse mt-3" />
            ) : (
              <p className="text-3xl font-bold text-gray-900 mt-3">{totalPoints.toLocaleString()}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">total earned</p>
            {!rankLoading && myRank !== null && (
              <div className="mt-3 flex items-center gap-1.5">
                <Trophy className="h-3 w-3 text-amber-500" />
                <span className="text-xs text-amber-600 font-semibold">Rank #{myRank}</span>
                {totalRankUsers && (
                  <span className="text-xs text-gray-400">/ {totalRankUsers}</span>
                )}
              </div>
            )}
          </div>

          {/* Streak */}
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
            <div className="flex items-start justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Streak</p>
              <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                <Flame className="h-4 w-4 text-orange-500" />
              </div>
            </div>
            {pageLoading ? (
              <div className="h-9 w-12 rounded bg-gray-100 animate-pulse mt-3" />
            ) : (
              <p className="text-3xl font-bold text-gray-900 mt-3">{currentStreak}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {currentStreak === 1 ? "day" : "days"} &middot; best {longestStreak}
            </p>
            {/* 7-day pip indicator */}
            <div className="mt-3 flex gap-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors",
                    i < currentStreak ? "bg-orange-400" : "bg-gray-100"
                  )}
                />
              ))}
            </div>
          </div>

          {/* Achievements */}
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
            <div className="flex items-start justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Achievements</p>
              <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                <Award className="h-4 w-4 text-amber-500" />
              </div>
            </div>
            {achievementsLoading ? (
              <div className="h-9 w-12 rounded bg-gray-100 animate-pulse mt-3" />
            ) : (
              <p className="text-3xl font-bold text-gray-900 mt-3">{unlockedCount}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {totalCount > 0 ? `of ${totalCount} available` : "unlocked"}
            </p>
            {!achievementsLoading && !allAchievementsLoading && totalCount > 0 && (
              <div className="mt-3 h-1 rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all duration-700"
                  style={{ width: `${Math.round((unlockedCount / totalCount) * 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Main grid ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ─ Left (2/3) ──────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Progress overview */}
            <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                <div>
                  <h2 className="font-semibold text-gray-900">Progress Overview</h2>
                  <p className="text-sm text-gray-600 mt-0.5">Your learning journey at a glance</p>
                </div>
                <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 px-4 text-xs">
                  <Link href="/resources">
                    Continue <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>

              <div className="px-6 py-6 flex flex-col sm:flex-row items-center gap-8">
                {/* Donut */}
                <div className="shrink-0">
                  {pageLoading || resourcesLoading ? (
                    <div className="h-32 w-32 rounded-full bg-gray-100 animate-pulse" />
                  ) : (
                    <DonutChart pct={completionPct} size={128} />
                  )}
                </div>

                {/* Activity bars */}
                <div className="flex-1 w-full space-y-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Activity Breakdown
                  </p>
                  {bars.map(({ label, value, pct, color }) => (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm text-gray-700">{label}</span>
                        <span className="text-sm font-bold text-gray-900">
                          {statsLoading && label !== "Resources" ? (
                            <span className="inline-block h-4 w-5 rounded bg-gray-100 animate-pulse" />
                          ) : (
                            value
                          )}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100">
                        <div
                          className={cn("h-full rounded-full transition-all duration-700", color)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick access */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Quick Access
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { href: "/resources",    icon: BookOpen,      label: "Resources",     iconClass: "text-indigo-500",  bg: "hover:bg-indigo-50 hover:border-indigo-200" },
                  { href: "/leaderboard",  icon: TrendingUp,    label: "Leaderboard",   iconClass: "text-amber-500",   bg: "hover:bg-amber-50 hover:border-amber-200"  },
                  { href: "/discussions",  icon: MessageSquare, label: "Discussions",   iconClass: "text-sky-500",     bg: "hover:bg-sky-50 hover:border-sky-200"       },
                  { href: "/achievements", icon: Award,         label: "Achievements",  iconClass: "text-violet-500",  bg: "hover:bg-violet-50 hover:border-violet-200" },
                ].map(({ href, icon: Icon, label, iconClass, bg }) => (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "group flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-5 text-center shadow-sm transition-all",
                      bg
                    )}
                  >
                    <Icon className={cn("h-5 w-5 transition-transform group-hover:scale-110", iconClass)} />
                    <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                      {label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* ─ Right (1/3) ─────────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Recent achievements */}
            <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Recent Achievements</h2>
                {!achievementsLoading && !allAchievementsLoading && totalCount > 0 && (
                  <span className="text-xs text-gray-500">{unlockedCount} / {totalCount}</span>
                )}
              </div>

              <div className="p-4 space-y-1">
                {achievementsLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                      <div className="h-8 w-8 shrink-0 rounded-lg bg-gray-100" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-3/4 rounded bg-gray-100" />
                        <div className="h-2.5 w-1/2 rounded bg-gray-100" />
                      </div>
                      <div className="h-4 w-8 rounded bg-gray-100" />
                    </div>
                  ))
                ) : (userAchievements as any[]).length > 0 ? (
                  <>
                    {(userAchievements as any[]).slice(0, 5).map((ua: any) => (
                      <div
                        key={ua.id}
                        className="flex items-center gap-3 rounded-xl p-2 hover:bg-gray-50 transition-colors"
                      >
                        <div className="h-8 w-8 shrink-0 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center">
                          <AchievementIcon
                            name={ua.achievement?.iconUrl}
                            className="h-3.5 w-3.5 text-amber-500"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {ua.achievement?.name || "Achievement"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {ua.unlockedAt
                              ? formatDistanceToNow(new Date(ua.unlockedAt), { addSuffix: true })
                              : ""}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-amber-600">
                          +{ua.achievement?.pointValue ?? 0}
                        </span>
                      </div>
                    ))}

                    <Link
                      href="/achievements"
                      className="flex items-center justify-center gap-1.5 mt-2 rounded-xl border border-dashed border-gray-200 py-2.5 text-xs font-medium text-gray-500 transition hover:border-gray-300 hover:text-gray-700"
                    >
                      View all achievements <ArrowRight className="h-3 w-3" />
                    </Link>
                  </>
                ) : (
                  <div className="flex flex-col items-center py-8 text-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                      <Trophy className="h-6 w-6 text-gray-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">No achievements yet</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Complete resources to earn your first achievement
                      </p>
                    </div>
                    <Button asChild size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                      <Link href="/resources">
                        <Rocket className="mr-1.5 h-3 w-3" />
                        Start Learning
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Leaderboard rank */}
            {!rankLoading && myRank !== null && (
              <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                    <Trophy className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                      Leaderboard Rank
                    </p>
                    <p className="text-2xl font-bold text-gray-900">#{myRank}</p>
                  </div>
                </div>
                {totalRankUsers && (
                  <p className="text-xs text-gray-500 mt-2">
                    Out of {totalRankUsers} fellows in your cohort
                  </p>
                )}
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="w-full mt-3 h-8 border-gray-200 text-gray-700 hover:bg-gray-50 text-xs"
                >
                  <Link href="/leaderboard">View Full Leaderboard</Link>
                </Button>
              </div>
            )}

            {/* Streak card — shown when streak active but no rank yet */}
            {!rankLoading && myRank === null && currentStreak > 0 && !pageLoading && (
              <div className="rounded-2xl bg-white border border-orange-100 shadow-sm p-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
                    <Flame className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                      Current Streak
                    </p>
                    <p className="text-2xl font-bold text-gray-900">{currentStreak} days</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Best streak: {longestStreak} days</p>
                <Button asChild size="sm" className="w-full mt-3 h-8 bg-orange-500 hover:bg-orange-600 text-white text-xs">
                  <Link href="/resources">
                    Keep it going <Zap className="ml-1.5 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            )}

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
