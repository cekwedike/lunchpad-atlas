"use client";

import { useState } from "react";
import { Award, Lock, Trophy, Users, MessageSquare, Zap, Star } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { useAllAchievements, useUserAchievements } from "@/hooks/api/useProfile";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

// ── Category metadata ──────────────────────────────────────────────────────────
const CATEGORIES: Record<string, {
  label: string; color: string; bg: string; ring: string; icon: React.ComponentType<{ className?: string }>;
}> = {
  MILESTONE:   { label: "Milestone",   color: "text-blue-700",   bg: "bg-blue-50",   ring: "ring-blue-200",   icon: Trophy },
  SOCIAL:      { label: "Social",      color: "text-violet-700", bg: "bg-violet-50", ring: "ring-violet-200", icon: MessageSquare },
  STREAK:      { label: "Streak",      color: "text-amber-700",  bg: "bg-amber-50",  ring: "ring-amber-200",  icon: Zap },
  LEADERBOARD: { label: "Leaderboard", color: "text-green-700",  bg: "bg-green-50",  ring: "ring-green-200",  icon: Star },
};

const FILTER_OPTIONS = ["All", "Unlocked", "Locked", ...Object.values(CATEGORIES).map((c) => c.label)];

// ── Single achievement card ────────────────────────────────────────────────────
function AchievementCard({
  achievement,
  unlockedAt,
}: {
  achievement: any;
  unlockedAt?: string;
}) {
  const isUnlocked = !!unlockedAt;
  const cat = CATEGORIES[achievement.type] ?? CATEGORIES.MILESTONE;
  const CatIcon = cat.icon;

  return (
    <div
      className={cn(
        "relative rounded-2xl border p-5 flex flex-col gap-3 transition-all",
        isUnlocked
          ? "border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm"
          : "border-gray-100 bg-gray-50 opacity-60",
      )}
    >
      {/* Lock overlay badge */}
      {!isUnlocked && (
        <div className="absolute top-3 right-3">
          <Lock className="h-4 w-4 text-gray-400" />
        </div>
      )}

      {/* Icon + category badge */}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "text-3xl w-12 h-12 flex items-center justify-center rounded-xl shrink-0",
            isUnlocked ? "bg-amber-100 shadow-inner" : "bg-gray-200",
          )}
        >
          {achievement.iconUrl || "🏅"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1 flex-wrap">
            <p className={cn("font-bold text-sm leading-tight", isUnlocked ? "text-gray-900" : "text-gray-500")}>
              {achievement.name}
            </p>
            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full ring-1", cat.bg, cat.color, cat.ring)}>
              {cat.label}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 leading-snug">{achievement.description}</p>
        </div>
      </div>

      {/* Points + unlock date */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
        <span className={cn("text-xs font-bold flex items-center gap-1", isUnlocked ? "text-amber-600" : "text-gray-400")}>
          <Trophy className="h-3 w-3" />
          +{achievement.pointValue} pts
        </span>
        {isUnlocked ? (
          <span className="text-[10px] text-gray-400 italic">
            Unlocked {formatDistanceToNow(new Date(unlockedAt!), { addSuffix: true })}
          </span>
        ) : (
          <span className="text-[10px] text-gray-400">Locked</span>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AchievementsPage() {
  const [filter, setFilter] = useState("All");

  const { data: allAchievements = [], isLoading: loadingAll } = useAllAchievements();
  const { data: userAchievements = [], isLoading: loadingUser } = useUserAchievements();

  const isLoading = loadingAll || loadingUser;

  // Build a lookup: achievementId → unlockedAt
  const unlockedMap = new Map<string, string>(
    (userAchievements as any[]).map((ua) => [ua.achievementId, ua.unlockedAt]),
  );

  const unlockedCount = unlockedMap.size;
  const totalCount = (allAchievements as any[]).length;
  const totalPointsEarned = (allAchievements as any[])
    .filter((a: any) => unlockedMap.has(a.id))
    .reduce((sum: number, a: any) => sum + (a.pointValue ?? 0), 0);

  // Filter achievements
  const filtered = (allAchievements as any[]).filter((a: any) => {
    if (filter === "All") return true;
    if (filter === "Unlocked") return unlockedMap.has(a.id);
    if (filter === "Locked") return !unlockedMap.has(a.id);
    return CATEGORIES[a.type]?.label === filter;
  });

  // Group by category for the "All" view
  const grouped: Record<string, any[]> = {};
  filtered.forEach((a: any) => {
    const cat = a.type || "MILESTONE";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(a);
  });

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 p-px shadow-lg">
          <div className="rounded-[15px] bg-white px-6 py-6 sm:px-8">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Award className="h-6 w-6 text-amber-500" />
                  <h1 className="text-2xl font-bold text-gray-900">Achievements</h1>
                </div>
                <p className="text-sm text-gray-500">
                  Complete activities to unlock achievements and earn bonus points.
                </p>
              </div>

              {/* Stats */}
              <div className="flex gap-4 flex-wrap">
                <div className="text-center">
                  {isLoading ? (
                    <div className="h-8 w-16 rounded bg-gray-100 animate-pulse mx-auto" />
                  ) : (
                    <p className="text-2xl font-bold text-amber-600">
                      {unlockedCount}<span className="text-base text-gray-400 font-normal">/{totalCount}</span>
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5">Unlocked</p>
                </div>
                <div className="w-px bg-gray-100 hidden sm:block" />
                <div className="text-center">
                  {isLoading ? (
                    <div className="h-8 w-16 rounded bg-gray-100 animate-pulse mx-auto" />
                  ) : (
                    <p className="text-2xl font-bold text-green-600">+{totalPointsEarned}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5">Bonus pts</p>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            {!isLoading && totalCount > 0 && (
              <div className="mt-5">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                  <span>{unlockedCount} of {totalCount} achievements unlocked</span>
                  <span className="font-semibold text-amber-600">
                    {Math.round((unlockedCount / totalCount) * 100)}%
                  </span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
                    style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── CATEGORY STATS MINI-CARDS ───────────────────────────────────── */}
        {!isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(CATEGORIES).map(([type, cfg]) => {
              const CatIcon = cfg.icon;
              const catTotal = (allAchievements as any[]).filter((a: any) => a.type === type).length;
              const catUnlocked = (allAchievements as any[]).filter(
                (a: any) => a.type === type && unlockedMap.has(a.id),
              ).length;
              return (
                <button
                  key={type}
                  onClick={() => setFilter(filter === cfg.label ? "All" : cfg.label)}
                  className={cn(
                    "rounded-xl p-3.5 ring-1 text-left transition-all",
                    cfg.bg, cfg.ring,
                    filter === cfg.label && "ring-2 scale-[1.02]",
                  )}
                >
                  <CatIcon className={cn("h-4 w-4 mb-1.5", cfg.color)} />
                  <p className={cn("text-sm font-bold", cfg.color)}>
                    {catUnlocked}<span className="text-xs font-normal opacity-60">/{catTotal}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{cfg.label}</p>
                </button>
              );
            })}
          </div>
        )}

        {/* ── FILTER PILLS ────────────────────────────────────────────────── */}
        <div className="flex gap-2 flex-wrap">
          {["All", "Unlocked", "Locked"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold transition-all border",
                filter === f
                  ? "bg-amber-500 text-white border-amber-500"
                  : "bg-white text-gray-600 border-gray-200 hover:border-amber-300",
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {/* ── ACHIEVEMENT GRID ────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-36 rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
              <Award className="h-8 w-8 text-gray-300" />
            </div>
            <p className="font-semibold text-gray-500">No achievements found</p>
            <p className="text-sm text-gray-400">Try a different filter.</p>
          </div>
        ) : filter === "All" ? (
          // Grouped by category
          <div className="space-y-8">
            {Object.entries(CATEGORIES).map(([type, cfg]) => {
              const items = grouped[type] ?? [];
              if (items.length === 0) return null;
              const CatIcon = cfg.icon;
              return (
                <div key={type}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={cn("p-1.5 rounded-lg", cfg.bg)}>
                      <CatIcon className={cn("h-4 w-4", cfg.color)} />
                    </div>
                    <h2 className="font-bold text-gray-800 text-sm">{cfg.label} Achievements</h2>
                    <span className="text-xs text-gray-400 ml-1">
                      ({items.filter((a) => unlockedMap.has(a.id)).length}/{items.length})
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((a: any) => (
                      <AchievementCard
                        key={a.id}
                        achievement={a}
                        unlockedAt={unlockedMap.get(a.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Flat grid for filtered views
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((a: any) => (
              <AchievementCard
                key={a.id}
                achievement={a}
                unlockedAt={unlockedMap.get(a.id)}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
