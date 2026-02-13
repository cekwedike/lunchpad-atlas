"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileQuestion, Clock, Award, CheckCircle, Lock, Timer,
  Zap, BookOpen, Trophy, ChevronRight, Loader2,
} from "lucide-react";
import { useMyQuizzes, type FellowQuiz, type QuizStatus } from "@/hooks/api/useQuizzes";
import { useMyLiveQuizzes, useJoinLiveQuiz, useLiveQuizLeaderboard } from "@/hooks/api/useLiveQuiz";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCountdown(ms: number) {
  if (ms <= 0) return "00:00:00";
  const totalSecs = Math.floor(ms / 1000);
  const days = Math.floor(totalSecs / 86400);
  const hrs = Math.floor((totalSecs % 86400) / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  if (days > 0) return `${days}d ${hrs}h ${mins}m`;
  return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

const STATUS_CONFIG: Record<QuizStatus, {
  label: string;
  color: string;
  bg: string;
  icon: React.ComponentType<{ className?: string }>;
  canTake: boolean;
}> = {
  OPEN:      { label: "Open",      color: "text-emerald-700", bg: "bg-emerald-100",  icon: CheckCircle, canTake: true },
  UPCOMING:  { label: "Upcoming",  color: "text-blue-700",    bg: "bg-blue-100",     icon: Timer,       canTake: false },
  CLOSED:    { label: "Closed",    color: "text-gray-500",    bg: "bg-gray-100",     icon: Lock,        canTake: false },
  COMPLETED: { label: "Completed", color: "text-violet-700",  bg: "bg-violet-100",   icon: Trophy,      canTake: false },
};

const QUIZ_TYPE_CONFIG = {
  SESSION: { label: "Session",  icon: BookOpen,     bg: "bg-blue-50",    border: "border-blue-200",    accent: "from-blue-500 to-cyan-500",     iconColor: "text-blue-600" },
  GENERAL: { label: "General",  icon: FileQuestion, bg: "bg-emerald-50", border: "border-emerald-200", accent: "from-emerald-500 to-teal-500",  iconColor: "text-emerald-600" },
  MEGA:    { label: "Mega",     icon: Zap,          bg: "bg-amber-50",   border: "border-amber-200",   accent: "from-amber-500 to-orange-500",  iconColor: "text-amber-600" },
};

// ─── Countdown hook ───────────────────────────────────────────────────────────
function useCountdown(targetDate: string | null) {
  const getMs = useCallback(() =>
    targetDate ? new Date(targetDate).getTime() - Date.now() : -1,
  [targetDate]);

  const [ms, setMs] = useState(getMs);

  useEffect(() => {
    if (!targetDate) return;
    const interval = setInterval(() => setMs(getMs()), 1000);
    return () => clearInterval(interval);
  }, [targetDate, getMs]);

  return ms;
}

// ─── Quiz Card ────────────────────────────────────────────────────────────────
function QuizCard({ quiz }: { quiz: FellowQuiz }) {
  const statusCfg = STATUS_CONFIG[quiz.status];
  const typeCfg = QUIZ_TYPE_CONFIG[quiz.quizType];
  const StatusIcon = statusCfg.icon;
  const TypeIcon = typeCfg.icon;

  // Countdown: show time until opens (UPCOMING) or time until closes (OPEN with closeAt)
  const countdownTarget =
    quiz.status === "UPCOMING" ? quiz.openAt :
    quiz.status === "OPEN" && quiz.closeAt ? quiz.closeAt :
    null;
  const countdownMs = useCountdown(countdownTarget);
  const isUrgent = quiz.status === "OPEN" && quiz.closeAt && countdownMs > 0 && countdownMs < 3600000; // < 1hr

  return (
    <div className={cn(
      "group relative overflow-hidden rounded-xl border-2 bg-white transition-all duration-200",
      typeCfg.border,
      statusCfg.canTake
        ? "hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
        : "opacity-80",
    )}>
      {/* Top gradient strip */}
      <div className={`h-1 w-full bg-gradient-to-r ${typeCfg.accent}`} />

      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`p-3 rounded-xl ${typeCfg.bg} shrink-0`}>
            <TypeIcon className={cn("h-5 w-5", typeCfg.iconColor)} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 text-base leading-tight truncate">{quiz.title}</h3>
                {quiz.sessions && quiz.sessions.length > 0 && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {quiz.sessions.map((qs: any) => `S${qs.session.sessionNumber}: ${qs.session.title}`).join(' · ')}
                  </p>
                )}
                {quiz.description && (
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">{quiz.description}</p>
                )}
              </div>

              {/* Status badge */}
              <Badge className={cn("text-xs shrink-0", statusCfg.bg, statusCfg.color)}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusCfg.label}
              </Badge>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <FileQuestion className="h-3.5 w-3.5" />
                {quiz._count.questions} questions
              </span>
              {quiz.timeLimit > 0 && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="h-3.5 w-3.5" />
                  {quiz.timeLimit} min
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Award className="h-3.5 w-3.5" />
                {Math.round(quiz.pointValue * (quiz.multiplier || 1))} pts
              </span>
              <span className="text-xs text-gray-400">Pass: {quiz.passingScore}%</span>
              <Badge className={`text-xs px-2 ${QUIZ_TYPE_CONFIG[quiz.quizType].bg} border ${QUIZ_TYPE_CONFIG[quiz.quizType].border} text-gray-700`}>
                {QUIZ_TYPE_CONFIG[quiz.quizType].label}
              </Badge>
            </div>

            {/* Countdown timer */}
            {countdownTarget && countdownMs > 0 && (
              <div className={cn(
                "mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                quiz.status === "UPCOMING"
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : isUrgent
                    ? "bg-red-50 text-red-700 border border-red-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200",
              )}>
                <Timer className={cn("h-4 w-4 shrink-0", isUrgent && "animate-pulse")} />
                <span>
                  {quiz.status === "UPCOMING" ? "Opens in " : "Closes in "}
                  <span className="font-mono font-bold">{formatCountdown(countdownMs)}</span>
                </span>
              </div>
            )}
          </div>

          {/* Arrow for takeable */}
          {statusCfg.canTake && (
            <div className="shrink-0 self-center">
              <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-700 transition-colors" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Live Quiz Results ────────────────────────────────────────────────────────
function LiveQuizResults({ quizId, currentUserId }: { quizId: string; currentUserId: string }) {
  const { data: leaderboard = [], isLoading } = useLiveQuizLeaderboard(quizId, { refetchInterval: false });

  if (isLoading) return <div className="mt-3 h-16 animate-pulse rounded-lg bg-amber-50" />;
  if (!leaderboard.length) return null;

  const sorted = [...leaderboard].sort((a: any, b: any) => b.totalScore - a.totalScore);
  const myIdx = sorted.findIndex((e: any) => e.userId === currentUserId);
  const myEntry = myIdx >= 0 ? sorted[myIdx] : null;
  const myRank = myIdx >= 0 ? myIdx + 1 : null;

  const MEDALS = ["🥇", "🥈", "🥉"];
  const rankLabel =
    myRank === 1 ? "1st place!" :
    myRank === 2 ? "2nd place" :
    myRank === 3 ? "3rd place" :
    myRank ? `#${myRank} of ${sorted.length}` : null;

  return (
    <div className="mt-4 space-y-3 border-t border-amber-100 pt-4">
      {/* Personal result banner */}
      {myEntry && (
        <div className={cn(
          "rounded-xl px-4 py-3 flex items-center justify-between",
          myRank === 1 ? "bg-amber-50 border-2 border-amber-300" :
          myRank === 2 ? "bg-slate-50 border-2 border-slate-300" :
          myRank === 3 ? "bg-orange-50 border-2 border-orange-200" :
          "bg-blue-50 border-2 border-blue-200",
        )}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{MEDALS[myRank! - 1] ?? "🎯"}</span>
            <div>
              <p className="text-sm font-bold text-gray-900">Your Result</p>
              <p className="text-xs text-gray-500">
                {myEntry.correctCount} correct · {rankLabel}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-amber-600">{myEntry.totalScore}</p>
            <p className="text-xs text-gray-400">points</p>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Trophy className="h-3 w-3" /> Final Leaderboard
        </p>
        <div className="space-y-1">
          {sorted.slice(0, 5).map((entry: any, idx: number) => {
            const isMe = entry.userId === currentUserId;
            return (
              <div
                key={entry.id}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm",
                  isMe
                    ? "bg-blue-50 border border-blue-200 ring-1 ring-blue-300"
                    : idx === 0
                    ? "bg-amber-50 border border-amber-200"
                    : idx === 1
                    ? "bg-slate-50 border border-slate-200"
                    : idx === 2
                    ? "bg-orange-50 border border-orange-100"
                    : "bg-gray-50 border border-gray-100",
                )}
              >
                <span className="w-6 text-center text-base shrink-0">
                  {MEDALS[idx] ?? <span className="text-xs text-gray-400 font-mono">{idx + 1}</span>}
                </span>
                <span className={cn("flex-1 truncate", isMe ? "font-bold text-blue-800" : "font-medium text-gray-800")}>
                  {entry.displayName}
                  {isMe && <span className="ml-1.5 text-xs text-blue-400 font-normal">(you)</span>}
                </span>
                <span className="font-mono font-bold text-gray-700 tabular-nums">{entry.totalScore}</span>
                <span className="text-xs text-gray-400 w-12 text-right">{entry.correctCount}✓</span>
              </div>
            );
          })}
          {/* Show current user's row if they're outside top 5 */}
          {myRank !== null && myRank > 5 && myEntry && (
            <>
              <div className="text-center text-xs text-gray-300 py-0.5">···</div>
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-blue-50 border border-blue-200 ring-1 ring-blue-300">
                <span className="w-6 text-center text-xs text-gray-500 font-mono shrink-0">#{myRank}</span>
                <span className="flex-1 truncate font-bold text-blue-800">
                  {myEntry.displayName}
                  <span className="ml-1.5 text-xs text-blue-400 font-normal">(you)</span>
                </span>
                <span className="font-mono font-bold text-gray-700 tabular-nums">{myEntry.totalScore}</span>
                <span className="text-xs text-gray-400 w-12 text-right">{myEntry.correctCount}✓</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Live Quiz Card ────────────────────────────────────────────────────────────
function LiveQuizCard({ quiz }: { quiz: any }) {
  const STATUS_CFG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
    PENDING:   { label: "Waiting to start", bg: "bg-yellow-50",  color: "text-yellow-700", dot: "bg-yellow-400" },
    ACTIVE:    { label: "Live now!",        bg: "bg-green-50",   color: "text-green-700",  dot: "bg-green-500" },
    COMPLETED: { label: "Completed",        bg: "bg-gray-50",    color: "text-gray-500",   dot: "bg-gray-400" },
  };
  const cfg = STATUS_CFG[quiz.status] ?? STATUS_CFG.PENDING;
  const hasJoined = quiz.participants && quiz.participants.length > 0;
  const sessionNames = quiz.sessions?.map((s: any) => `S${s.session.sessionNumber}: ${s.session.title}`).join(' · ');

  const user = useAuthStore((s) => s.user);
  const joinMutation = useJoinLiveQuiz();

  const canJoin = !hasJoined && (quiz.status === "PENDING" || quiz.status === "ACTIVE");

  const handleJoin = () => {
    if (!user) return;
    joinMutation.mutate({
      quizId: quiz.id,
      data: {
        userId: user.id,
        displayName: user.name || user.email,
      },
    });
  };

  return (
    <div className={cn(
      "group relative overflow-hidden rounded-xl border-2 border-amber-200 bg-white transition-all duration-200",
      quiz.status !== "COMPLETED" ? "hover:shadow-lg" : "opacity-80",
    )}>
      <div className="h-1 w-full bg-gradient-to-r from-amber-500 to-orange-500" />
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-amber-50 shrink-0">
            <Zap className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 text-base leading-tight truncate">{quiz.title}</h3>
                {sessionNames && <p className="text-xs text-gray-500 mt-0.5">{sessionNames}</p>}
                {quiz.description && <p className="text-xs text-gray-600 mt-1 line-clamp-2">{quiz.description}</p>}
              </div>
              <span className={cn("flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full shrink-0", cfg.bg, cfg.color)}>
                <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot, quiz.status === "ACTIVE" && "animate-pulse")} />
                {cfg.label}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <FileQuestion className="h-3.5 w-3.5" />{quiz.totalQuestions} questions
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="h-3.5 w-3.5" />{quiz.timePerQuestion}s/question
              </span>
              <Badge className="text-xs px-2 bg-amber-50 border border-amber-200 text-amber-700">Live</Badge>
              {hasJoined && <Badge className="text-xs px-2 bg-green-50 border border-green-200 text-green-700">Joined</Badge>}
            </div>

            {/* Join button */}
            {canJoin && (
              <div className="mt-3">
                <Button
                  size="sm"
                  onClick={handleJoin}
                  disabled={joinMutation.isPending}
                  className={cn(
                    "gap-1.5 font-semibold",
                    quiz.status === "ACTIVE"
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-amber-500 hover:bg-amber-600 text-white",
                  )}
                >
                  {joinMutation.isPending ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Joining…</>
                  ) : quiz.status === "ACTIVE" ? (
                    <><Zap className="h-3.5 w-3.5" /> Join Now</>
                  ) : (
                    <><CheckCircle className="h-3.5 w-3.5" /> Register for Quiz</>
                  )}
                </Button>
              </div>
            )}

            {/* Final leaderboard for completed quizzes */}
            {quiz.status === "COMPLETED" && user && (
              <LiveQuizResults quizId={quiz.id} currentUserId={user.id} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Filter tabs ──────────────────────────────────────────────────────────────
const FILTER_TABS: Array<{ key: QuizStatus | "ALL"; label: string }> = [
  { key: "ALL",       label: "All" },
  { key: "OPEN",      label: "Open" },
  { key: "UPCOMING",  label: "Upcoming" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CLOSED",    label: "Closed" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function QuizzesPage() {
  const { data: quizzes, isLoading, error } = useMyQuizzes();
  const { data: liveQuizzes = [] } = useMyLiveQuizzes();
  const [filter, setFilter] = useState<QuizStatus | "ALL">("ALL");

  const allQuizzes = quizzes ?? [];

  const counts: Record<QuizStatus | "ALL", number> = {
    ALL: allQuizzes.length,
    OPEN: allQuizzes.filter((q) => q.status === "OPEN").length,
    UPCOMING: allQuizzes.filter((q) => q.status === "UPCOMING").length,
    COMPLETED: allQuizzes.filter((q) => q.status === "COMPLETED").length,
    CLOSED: allQuizzes.filter((q) => q.status === "CLOSED").length,
  };

  const filtered = filter === "ALL" ? allQuizzes : allQuizzes.filter((q) => q.status === filter);

  // Sort: OPEN first, then UPCOMING (by openAt), then MEGA/GENERAL, then CLOSED, COMPLETED last
  const sorted = [...filtered].sort((a, b) => {
    const order: Record<QuizStatus, number> = { OPEN: 0, UPCOMING: 1, CLOSED: 2, COMPLETED: 3 };
    const diff = order[a.status] - order[b.status];
    if (diff !== 0) return diff;
    // Within same status, MEGA first then by date
    if (a.quizType === "MEGA" && b.quizType !== "MEGA") return -1;
    if (b.quizType === "MEGA" && a.quizType !== "MEGA") return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Quizzes</h1>
          <p className="text-gray-600 mt-1 text-sm">
            Complete quizzes to earn points and climb the leaderboard
          </p>
        </div>

        {/* Live Quizzes Section */}
        {liveQuizzes.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Live Quizzes</h2>
              {liveQuizzes.some((q: any) => q.status === "ACTIVE") && (
                <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full animate-pulse">Live now!</span>
              )}
            </div>
            {liveQuizzes.map((quiz: any) => <LiveQuizCard key={quiz.id} quiz={quiz} />)}
          </div>
        )}

        {/* Stats bar */}
        {!isLoading && allQuizzes.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(["OPEN", "UPCOMING", "COMPLETED", "CLOSED"] as QuizStatus[]).map((s) => {
              const cfg = STATUS_CONFIG[s];
              const Icon = cfg.icon;
              return (
                <Card key={s} className="border-gray-200">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${cfg.bg}`}>
                      <Icon className={`h-4 w-4 ${cfg.color}`} />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-gray-900">{counts[s]}</p>
                      <p className="text-xs text-gray-500">{cfg.label}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
          {FILTER_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                "shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                filter === key
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-gray-500 hover:text-gray-700",
              )}
            >
              {label}
              {counts[key] > 0 && (
                <span className={cn(
                  "ml-1.5 px-1.5 py-0.5 rounded-full text-xs",
                  filter === key ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500",
                )}>
                  {counts[key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <Card className="border-gray-200">
            <CardContent className="flex flex-col items-center justify-center py-16 text-gray-400">
              <FileQuestion className="h-12 w-12 mb-3 text-gray-200" />
              <p className="font-medium text-gray-500">Failed to load quizzes</p>
              <p className="text-sm mt-1">Make sure you're assigned to a cohort</p>
            </CardContent>
          </Card>
        ) : sorted.length === 0 ? (
          <Card className="border-gray-200">
            <CardContent className="flex flex-col items-center justify-center py-16 text-gray-400">
              <FileQuestion className="h-12 w-12 mb-3 text-gray-200" />
              <p className="font-medium text-gray-500">
                {filter === "ALL" ? "No quizzes available yet" : `No ${filter.toLowerCase()} quizzes`}
              </p>
              {filter === "ALL" && (
                <p className="text-sm mt-1">Your facilitator will add quizzes to your cohort</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sorted.map((quiz) =>
              quiz.status === "OPEN" ? (
                <Link key={quiz.id} href={`/quiz/${quiz.id}`} className="block">
                  <QuizCard quiz={quiz} />
                </Link>
              ) : (
                <QuizCard key={quiz.id} quiz={quiz} />
              )
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
