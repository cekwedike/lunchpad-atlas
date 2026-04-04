"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileQuestion, Clock, Award, CheckCircle, XCircle, Lock, Timer,
  Zap, BookOpen, Trophy, ChevronRight, Loader2, Crown, Medal, Flame, Star,
  ChevronDown,
} from "lucide-react";
import { useMyQuizzes, type FellowQuiz, type QuizStatus } from "@/hooks/api/useQuizzes";
import { useMyLiveQuizzes, useJoinLiveQuiz, useLiveQuizLeaderboard, useLiveQuiz, useSubmitAnswer, useParticipantAnswers } from "@/hooks/api/useLiveQuiz";
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
  OPEN:      { label: "Open",         color: "text-emerald-700", bg: "bg-emerald-100", icon: CheckCircle, canTake: true },
  ATTEMPTED: { label: "Retry",        color: "text-amber-700",   bg: "bg-amber-100",   icon: Flame,       canTake: true },
  UPCOMING:  { label: "Upcoming",     color: "text-blue-700",    bg: "bg-blue-100",    icon: Timer,       canTake: false },
  LOCKED:    { label: "Max Attempts", color: "text-red-600",     bg: "bg-red-50",      icon: Lock,        canTake: false },
  CLOSED:    { label: "Closed",       color: "text-gray-500",    bg: "bg-gray-100",    icon: Lock,        canTake: false },
  COMPLETED: { label: "Completed",    color: "text-violet-700",  bg: "bg-violet-100",  icon: Trophy,      canTake: false },
};

const QUIZ_TYPE_CONFIG = {
  SESSION: { label: "Session",  icon: BookOpen,     bg: "bg-blue-50",    border: "border-blue-200",    accent: "from-blue-500 to-cyan-500",     iconColor: "text-blue-600" },
  GENERAL: { label: "General",  icon: FileQuestion, bg: "bg-emerald-50", border: "border-emerald-200", accent: "from-emerald-500 to-teal-500",  iconColor: "text-emerald-600" },
  MEGA:    { label: "Mega",     icon: Zap,          bg: "bg-amber-50",   border: "border-amber-200",   accent: "from-amber-500 to-orange-500",  iconColor: "text-amber-600" },
};

function getLeaderboardPoints(rank: number): number {
  if (rank === 1) return 3000;
  if (rank === 2) return 2000;
  if (rank === 3) return 1000;
  if (rank <= 7) return 500;
  return 200;
}

function RankBadge({ rank, size = "sm" }: { rank: number; size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "h-6 w-6" : "h-4 w-4";
  if (rank === 1) return <Crown className={cn(cls, "text-amber-500")} />;
  if (rank === 2) return <Medal className={cn(cls, "text-slate-400")} />;
  if (rank === 3) return <Medal className={cn(cls, "text-orange-400")} />;
  return <span className={cn("font-bold text-gray-500 font-mono", size === "lg" ? "text-sm" : "text-xs")}>#{rank}</span>;
}

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

// ─── Compact Quiz Card ─────────────────────────────────────────────────────────
function QuizCard({ quiz }: { quiz: FellowQuiz }) {
  const statusCfg = STATUS_CONFIG[quiz.status];
  const typeCfg = QUIZ_TYPE_CONFIG[quiz.quizType];
  const StatusIcon = statusCfg.icon;
  const TypeIcon = typeCfg.icon;

  const countdownTarget =
    quiz.status === "UPCOMING" ? quiz.openAt :
    quiz.status === "OPEN" && quiz.closeAt ? quiz.closeAt :
    null;
  const countdownMs = useCountdown(countdownTarget);
  const isUrgent = quiz.status === "OPEN" && quiz.closeAt && countdownMs > 0 && countdownMs < 3600000;

  const pts = Math.round(quiz.pointValue * (quiz.multiplier || 1));
  const sessions = quiz.sessions?.length
    ? quiz.sessions.map((qs: any) => `S${qs.session.sessionNumber}`).join(', ')
    : null;

  return (
    <div className={cn(
      "group relative overflow-hidden rounded-xl bg-white border border-gray-200 transition-all duration-200",
      statusCfg.canTake ? "hover:shadow-md hover:border-blue-200 cursor-pointer" : "",
      (quiz.status === "COMPLETED" || quiz.status === "LOCKED") ? "opacity-70" : "",
    )}>
      {/* Left accent strip */}
      <div className={`absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b ${typeCfg.accent}`} />

      <div className="pl-5 pr-3 py-3 flex items-center gap-3">
        {/* Type icon */}
        <div className={`p-2 rounded-lg ${typeCfg.bg} shrink-0`}>
          <TypeIcon className={cn("h-4 w-4", typeCfg.iconColor)} />
        </div>

        {/* Title + stats */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 min-w-0">
            <p className="font-semibold text-sm text-gray-900 truncate">{quiz.title}</p>
            {sessions && (
              <span className="text-xs text-gray-400 shrink-0">{sessions}</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-gray-500">{quiz._count.questions}Q</span>
            {quiz.timeLimit > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-gray-500">
                <Clock className="h-3 w-3" />{quiz.timeLimit} min
              </span>
            )}
            <span className="flex items-center gap-0.5 text-xs text-gray-500">
              <Award className="h-3 w-3" />{pts} pts
            </span>
            <span className="text-xs text-gray-400">Pass {quiz.passingScore}%</span>
            {/* Attempt count — shown when the user has tried but not passed */}
            {quiz.attemptCount > 0 && quiz.status !== "COMPLETED" && (
              <span className={cn(
                "text-xs font-medium",
                quiz.status === "LOCKED" ? "text-red-500" : "text-gray-400",
              )}>
                {quiz.maxAttempts > 0
                  ? `${quiz.attemptCount}/${quiz.maxAttempts} attempts`
                  : `${quiz.attemptCount} attempt${quiz.attemptCount !== 1 ? "s" : ""}`
                }
              </span>
            )}
            {/* Inline countdown pill */}
            {countdownTarget && countdownMs > 0 && (
              <span className={cn(
                "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
                quiz.status === "UPCOMING" ? "bg-blue-50 text-blue-700" :
                isUrgent ? "bg-red-50 text-red-700 animate-pulse" : "bg-amber-50 text-amber-700",
              )}>
                <Timer className="h-3 w-3 shrink-0" />
                {quiz.status === "UPCOMING" ? "Opens " : "Closes "}
                <span className="font-mono font-bold">{formatCountdown(countdownMs)}</span>
              </span>
            )}
          </div>
        </div>

        {/* Right: badges + arrow */}
        <div className="shrink-0 flex items-center gap-2">
          <div className="flex flex-col items-end gap-1">
            <Badge className={cn("text-xs border-0", statusCfg.bg, statusCfg.color)}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusCfg.label}
            </Badge>
            <Badge className={cn("text-xs", typeCfg.bg, "border", typeCfg.border, "text-gray-600")}>
              {typeCfg.label}
            </Badge>
          </div>
          {statusCfg.canTake && (
            <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-600 transition-colors" />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Live Quiz Taker ──────────────────────────────────────────────────────────
// Fellow-paced: each fellow controls their own question advancement.
// Answers are persisted server-side so refreshing resumes from where they left off.
function LiveQuizTaker({ quizId, participantId }: { quizId: string; participantId: string }) {
  // Load once; the parent polls for status changes (ACTIVE→COMPLETED)
  const { data: quiz } = useLiveQuiz(quizId);
  const submitAnswer = useSubmitAnswer();

  // Load existing answers to resume after a page refresh
  const { data: existingAnswers, isLoading: loadingAnswers } = useParticipantAnswers(participantId);

  const [localIdx, setLocalIdx] = useState(0);
  const [resumeChecked, setResumeChecked] = useState(false);
  // phase: 'answering' → fellow picking; 'result' → feedback shown + Next button
  const [phase, setPhase] = useState<'answering' | 'result'>('answering');
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());

  const questions: any[] = (quiz as any)?.questions ?? [];
  const currentQuestion = questions[localIdx] ?? null;
  const isFinished = questions.length > 0 && localIdx >= questions.length;

  // On first load, jump to the first unanswered question so refreshing resumes progress
  useEffect(() => {
    if (resumeChecked || loadingAnswers || questions.length === 0) return;
    if (existingAnswers && existingAnswers.length > 0) {
      const answeredIds = new Set(existingAnswers.map((a) => a.questionId));
      const firstUnanswered = questions.findIndex((q) => !answeredIds.has(q.id));
      if (firstUnanswered > 0) {
        setLocalIdx(firstUnanswered);
      } else if (firstUnanswered === -1) {
        // All questions already answered — skip to finished state
        setLocalIdx(questions.length);
      }
    }
    setResumeChecked(true);
  }, [existingAnswers, loadingAnswers, questions, resumeChecked]);

  // Reset state each time we move to a new question
  useEffect(() => {
    if (!currentQuestion) return;
    setPhase('answering');
    setSelectedAnswer(null);
    setAnswerResult(null);
    setTimeLeft(currentQuestion.timeLimit ?? 30);
    setQuestionStartTime(Date.now());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localIdx, currentQuestion?.id]);

  // Countdown while answering
  useEffect(() => {
    if (phase !== 'answering' || !currentQuestion || timeLeft <= 0) return;
    const t = setTimeout(() => setTimeLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, phase, currentQuestion?.id]);

  // Auto-transition to result when timer hits 0
  useEffect(() => {
    if (phase === 'answering' && timeLeft === 0 && currentQuestion) {
      setPhase('result');
    }
  }, [timeLeft, phase, currentQuestion]);

  const handleAnswer = async (idx: number) => {
    if (phase !== 'answering' || !currentQuestion || timeLeft === 0) return;
    setSelectedAnswer(idx);
    setPhase('result');
    try {
      const res = await submitAnswer.mutateAsync({
        participantId,
        questionId: currentQuestion.id,
        selectedAnswer: idx,
        timeToAnswer: Date.now() - questionStartTime,
      });
      setAnswerResult(res);
    } catch { /* already answered or network error */ }
  };

  const handleNext = () => setLocalIdx((i) => i + 1);

  // Loading state — wait for quiz data and resume check
  if (!quiz || loadingAnswers || !resumeChecked || (!currentQuestion && !isFinished)) {
    return (
      <div className="mt-4 border-t border-amber-100 pt-4 flex items-center justify-center py-6 gap-2 text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading quiz…</span>
      </div>
    );
  }

  // All questions answered — waiting for the quiz to end
  if (isFinished) {
    return (
      <div className="mt-4 border-t border-amber-100 pt-4 flex flex-col items-center py-6 gap-3 text-center">
        <div className="relative">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-purple-100">
            <Trophy className="h-7 w-7 text-purple-600" />
          </div>
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center">
            <Star className="h-3 w-3 text-white" />
          </div>
        </div>
        <div>
          <p className="font-bold text-gray-900 text-lg">All done!</p>
          <p className="text-sm text-gray-500">Waiting for final results to be tallied…</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Loader2 className="h-3 w-3 animate-spin" /> Results loading
        </div>
      </div>
    );
  }

  const options: any[] = Array.isArray(currentQuestion.options) ? currentQuestion.options : [];
  const OPTION_BG = [
    "bg-red-500 hover:bg-red-600",
    "bg-blue-500 hover:bg-blue-600",
    "bg-yellow-500 hover:bg-yellow-600",
    "bg-green-500 hover:bg-green-600",
  ];
  const SHAPES = ["◆", "●", "▲", "■"];
  const correctIdx: number = currentQuestion.correctAnswer;
  const timeLimit: number = currentQuestion.timeLimit ?? 30;
  const isTimedOut = phase === 'result' && selectedAnswer === null;
  const isLastQuestion = localIdx >= questions.length - 1;
  const correctOptionText = (() => {
    const o = options[correctIdx];
    return typeof o === "string" ? o : o?.text ?? "";
  })();

  return (
    <div className="mt-4 space-y-3 border-t border-amber-100 pt-4">
      {/* Progress + timer */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500 font-medium">
          Question {localIdx + 1} / {quiz.totalQuestions || questions.length}
        </span>
        <span className={cn(
          "flex items-center gap-1 font-bold px-2.5 py-1 rounded-full",
          phase === 'result'  ? "bg-gray-100 text-gray-400" :
          timeLeft <= 5  ? "bg-red-100 text-red-700 animate-pulse" :
          timeLeft <= 10 ? "bg-orange-100 text-orange-700" :
          "bg-amber-50 text-amber-700",
        )}>
          <Clock className="h-3 w-3" />
          {phase === 'result' ? "–" : `${timeLeft}s`}
        </span>
      </div>

      {/* Timer progress bar */}
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-1000",
            phase === 'result' ? "opacity-0" :
            timeLeft <= 5 ? "bg-red-500" : timeLeft <= 10 ? "bg-orange-400" : "bg-amber-400",
          )}
          style={{ width: `${(timeLeft / timeLimit) * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="bg-gray-900 text-white rounded-xl px-5 py-4 text-center">
        <p className="font-semibold text-base leading-snug">{currentQuestion.questionText}</p>
      </div>

      {/* Answer grid */}
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt: any, idx: number) => {
          const text = typeof opt === "string" ? opt : opt?.text ?? "";
          const isSelected = selectedAnswer === idx;
          const isCorrectOpt = phase === 'result' && idx === correctIdx;
          const isWrongOpt   = phase === 'result' && isSelected && idx !== correctIdx;

          return (
            <button
              key={idx}
              disabled={phase === 'result'}
              onClick={() => handleAnswer(idx)}
              className={cn(
                "rounded-xl px-3 py-4 text-white text-sm font-bold min-h-[60px] flex items-center gap-2 justify-center transition-all",
                isCorrectOpt ? "bg-green-500 ring-4 ring-green-300 scale-105" :
                isWrongOpt   ? "bg-gray-400 line-through opacity-60" :
                phase === 'result'  ? "bg-gray-300 text-gray-500 opacity-40" :
                isSelected   ? `${OPTION_BG[idx]} ring-4 ring-white/50` :
                OPTION_BG[idx],
                phase === 'answering' && "active:scale-95 cursor-pointer",
              )}
            >
              <span className="text-xs opacity-60">{SHAPES[idx]}</span>
              <span>{text}</span>
            </button>
          );
        })}
      </div>

      {/* Result feedback + Next button */}
      {phase === 'result' && (
        <div className="space-y-2">
          {/* Feedback banner */}
          {isTimedOut ? (
            <div className="rounded-lg px-4 py-3 flex items-center gap-3 border-2 bg-orange-50 border-orange-200">
              <Clock className="h-6 w-6 text-orange-500 shrink-0" />
              <div>
                <p className="text-sm font-bold text-orange-700">Time's up!</p>
                <p className="text-xs text-gray-500">
                  Correct: <span className="font-semibold text-green-600">{correctOptionText}</span>
                </p>
              </div>
            </div>
          ) : (
            <div className={cn(
              "rounded-lg px-4 py-3 flex items-center justify-between border-2",
              answerResult?.isCorrect ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300",
            )}>
              <div className="flex items-center gap-2">
                <div className="shrink-0">
                  {answerResult == null
                    ? <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
                    : answerResult.isCorrect
                      ? <CheckCircle className="h-6 w-6 text-green-500" />
                      : <XCircle className="h-6 w-6 text-red-400" />
                  }
                </div>
                <div>
                  <p className={cn(
                    "text-sm font-bold",
                    answerResult == null ? "text-gray-500" :
                    answerResult.isCorrect ? "text-green-700" : "text-red-600",
                  )}>
                    {answerResult == null ? "Submitting…" :
                     answerResult.isCorrect ? "Correct!" : "Wrong answer"}
                  </p>
                  {answerResult?.newStreak > 1 && (
                    <p className="text-xs text-amber-600 flex items-center gap-0.5">
                      <Flame className="h-3 w-3" />
                      {answerResult.newStreak}x streak!
                    </p>
                  )}
                  {!answerResult?.isCorrect && answerResult != null && (
                    <p className="text-xs text-gray-500">
                      Correct: <span className="font-semibold text-green-600">{correctOptionText}</span>
                    </p>
                  )}
                </div>
              </div>
              {answerResult?.isCorrect && (
                <div className="text-right">
                  <p className="text-xl font-bold text-green-700">
                    +{answerResult.pointsEarned + (answerResult.streakBonus || 0)}
                  </p>
                  {answerResult.streakBonus > 0 && (
                    <p className="text-xs text-amber-600">incl. +{answerResult.streakBonus} streak</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Next / Finish button */}
          <button
            onClick={handleNext}
            className={cn(
              "w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md",
              isLastQuestion
                ? "bg-purple-600 hover:bg-purple-700"
                : "bg-amber-500 hover:bg-amber-600",
            )}
          >
            {isLastQuestion ? (
              <><Trophy className="h-4 w-4" /> See Results</>
            ) : (
              <>Next Question <ChevronRight className="h-4 w-4" /></>
            )}
          </button>
        </div>
      )}
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
  const myLeaderboardPoints = myRank ? getLeaderboardPoints(myRank) : null;

  const rankStyle = (rank: number | null) => {
    if (rank === 1) return { bg: "bg-gradient-to-br from-amber-50 to-yellow-100", border: "border-amber-300", text: "text-amber-700", icon: "bg-amber-100" };
    if (rank === 2) return { bg: "bg-gradient-to-br from-slate-50 to-gray-100", border: "border-slate-300", text: "text-slate-700", icon: "bg-slate-100" };
    if (rank === 3) return { bg: "bg-gradient-to-br from-orange-50 to-amber-50", border: "border-orange-200", text: "text-orange-700", icon: "bg-orange-100" };
    return { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", icon: "bg-blue-100" };
  };

  const myStyle = rankStyle(myRank);

  return (
    <div className="mt-4 space-y-4 border-t border-amber-100 pt-4">
      {/* Personal result banner */}
      {myEntry && myRank && (
        <div className={cn("rounded-xl p-4 border-2", myStyle.bg, myStyle.border)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("w-11 h-11 rounded-full flex items-center justify-center shrink-0", myStyle.icon)}>
                <RankBadge rank={myRank} size="lg" />
              </div>
              <div>
                <p className={cn("text-sm font-bold", myStyle.text)}>Your Final Result</p>
                <p className="text-xs text-gray-500">
                  {myEntry.correctCount} correct &middot; {sorted.length} participants
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">{myEntry.totalScore.toLocaleString()}</p>
              <p className="text-xs text-gray-400">quiz score</p>
            </div>
          </div>

          {myLeaderboardPoints && (
            <div className="mt-3 pt-3 border-t border-black/5 flex items-center justify-between rounded-lg">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-purple-100">
                  <Star className="h-3.5 w-3.5 text-purple-600" />
                </div>
                <span className="text-xs font-semibold text-gray-700">Leaderboard Points Earned</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold text-purple-700">+{myLeaderboardPoints.toLocaleString()}</span>
                <span className="text-xs text-gray-400">pts</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Leaderboard table */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Trophy className="h-3 w-3" /> Final Leaderboard
        </p>
        <div className="space-y-1.5">
          {sorted.slice(0, 5).map((entry: any, idx: number) => {
            const rank = idx + 1;
            const isMe = entry.userId === currentUserId;
            const lbPoints = getLeaderboardPoints(rank);
            return (
              <div
                key={entry.id}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm",
                  isMe
                    ? "bg-blue-50 border border-blue-200 ring-1 ring-blue-300"
                    : rank === 1
                    ? "bg-amber-50 border border-amber-200"
                    : rank === 2
                    ? "bg-slate-50 border border-slate-200"
                    : rank === 3
                    ? "bg-orange-50 border border-orange-100"
                    : "bg-gray-50 border border-gray-100",
                )}
              >
                <div className="w-6 flex items-center justify-center shrink-0">
                  <RankBadge rank={rank} />
                </div>
                <span className={cn("flex-1 truncate", isMe ? "font-bold text-blue-800" : "font-medium text-gray-800")}>
                  {entry.displayName}
                  {isMe && <span className="ml-1.5 text-xs text-blue-400 font-normal">(you)</span>}
                </span>
                <div className="text-right shrink-0">
                  <p className="font-mono font-bold text-gray-800 tabular-nums text-sm">{entry.totalScore.toLocaleString()}</p>
                  <p className="text-xs font-medium text-purple-500">+{lbPoints.toLocaleString()} lb pts</p>
                </div>
              </div>
            );
          })}

          {/* Show current user's row if they're outside top 5 */}
          {myRank !== null && myRank > 5 && myEntry && (
            <>
              <div className="text-center text-xs text-gray-300 py-0.5">···</div>
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm bg-blue-50 border border-blue-200 ring-1 ring-blue-300">
                <div className="w-6 flex items-center justify-center shrink-0">
                  <RankBadge rank={myRank} />
                </div>
                <span className="flex-1 truncate font-bold text-blue-800">
                  {myEntry.displayName}
                  <span className="ml-1.5 text-xs text-blue-400 font-normal">(you)</span>
                </span>
                <div className="text-right shrink-0">
                  <p className="font-mono font-bold text-gray-800 tabular-nums text-sm">{myEntry.totalScore.toLocaleString()}</p>
                  <p className="text-xs font-medium text-purple-500">+{getLeaderboardPoints(myRank).toLocaleString()} lb pts</p>
                </div>
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
  const [showResults, setShowResults] = useState(false);

  const user = useAuthStore((s) => s.user);
  const joinMutation = useJoinLiveQuiz();

  const hasJoined = quiz.participants && quiz.participants.length > 0;
  const canJoin = !hasJoined && (quiz.status === "PENDING" || quiz.status === "ACTIVE");
  const sessionNames = quiz.sessions?.map((s: any) => `S${s.session.sessionNumber}: ${s.session.title}`).join(' · ');

  const handleJoin = () => {
    if (!user) return;
    joinMutation.mutate({
      quizId: quiz.id,
      data: {
        displayName: user.name || user.email,
      },
    });
  };

  // ── Completed: compact collapsible row ────────────────────────────────────
  if (quiz.status === "COMPLETED") {
    return (
      <div className="relative overflow-hidden rounded-xl bg-white border border-gray-200 opacity-75">
        <div className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-amber-500 to-orange-500" />
        <div className="pl-5 pr-3 py-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-50 shrink-0">
            <Zap className="h-4 w-4 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-700 truncate">{quiz.title}</p>
            {sessionNames && (
              <p className="text-xs text-gray-400 mt-0.5 truncate">{sessionNames}</p>
            )}
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-gray-500">{quiz.totalQuestions}Q</span>
              <span className="text-xs text-gray-500">{quiz.timePerQuestion}s/Q</span>
              <Badge className="text-xs bg-amber-50 border border-amber-200 text-amber-700">Live</Badge>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <span className="text-xs font-medium px-2 py-1 bg-violet-100 text-violet-700 rounded-full">
              Completed
            </span>
            {hasJoined && user && (
              <button
                onClick={() => setShowResults((v) => !v)}
                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
              >
                {showResults ? "Hide" : "Results"}
                <ChevronDown className={cn("h-3 w-3 transition-transform", showResults && "rotate-180")} />
              </button>
            )}
          </div>
        </div>
        {showResults && user && (
          <div className="px-5 pb-4">
            <LiveQuizResults quizId={quiz.id} currentUserId={user.id} />
          </div>
        )}
      </div>
    );
  }

  // ── Active / Pending: full interactive card ───────────────────────────────
  const STATUS_CFG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
    PENDING:   { label: "Waiting to start", bg: "bg-yellow-50",  color: "text-yellow-700", dot: "bg-yellow-400" },
    ACTIVE:    { label: "Live now!",        bg: "bg-green-50",   color: "text-green-700",  dot: "bg-green-500" },
    COMPLETED: { label: "Completed",        bg: "bg-gray-50",    color: "text-gray-500",   dot: "bg-gray-400" },
  };
  const cfg = STATUS_CFG[quiz.status] ?? STATUS_CFG.PENDING;

  return (
    <div className="group relative overflow-hidden rounded-xl border-2 border-amber-200 bg-white transition-all duration-200 hover:shadow-lg">
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

            {quiz.status === "ACTIVE" && hasJoined && quiz.participants?.[0]?.id && (
              <LiveQuizTaker quizId={quiz.id} participantId={quiz.participants[0].id} />
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
  // Poll every 5s so PENDING→ACTIVE status changes are detected without manual refresh
  const { data: liveQuizzes = [] } = useMyLiveQuizzes({ refetchInterval: 5000 });
  const [filter, setFilter] = useState<QuizStatus | "ALL">("ALL");

  const allQuizzes = quizzes ?? [];

  // Split live quizzes into active (top) vs completed (bottom)
  const activeLiveQuizzes = (liveQuizzes as any[]).filter((q) => q.status !== "COMPLETED");
  const completedLiveQuizzes = (liveQuizzes as any[]).filter((q) => q.status === "COMPLETED");

  const counts: Record<QuizStatus | "ALL", number> = {
    ALL: allQuizzes.length,
    // "Open" tab shows both fresh-open and retry-available quizzes
    OPEN: allQuizzes.filter((q) => q.status === "OPEN" || q.status === "ATTEMPTED").length,
    ATTEMPTED: allQuizzes.filter((q) => q.status === "ATTEMPTED").length,
    UPCOMING: allQuizzes.filter((q) => q.status === "UPCOMING").length,
    LOCKED: allQuizzes.filter((q) => q.status === "LOCKED").length,
    COMPLETED: allQuizzes.filter((q) => q.status === "COMPLETED").length,
    CLOSED: allQuizzes.filter((q) => q.status === "CLOSED").length,
  };

  // Completed standard quizzes always go to the bottom section
  const completedStandard = allQuizzes.filter((q) => q.status === "COMPLETED");
  const totalCompleted = completedLiveQuizzes.length + completedStandard.length;

  // Main list: only non-completed quizzes; empty when filter === "COMPLETED"
  // "OPEN" filter includes ATTEMPTED (both mean the quiz can still be taken)
  const activeFiltered =
    filter === "COMPLETED" ? [] :
    filter === "ALL" ? allQuizzes.filter((q) => q.status !== "COMPLETED") :
    filter === "OPEN" ? allQuizzes.filter((q) => q.status === "OPEN" || q.status === "ATTEMPTED") :
    allQuizzes.filter((q) => q.status === filter);

  // Sort: OPEN first, ATTEMPTED second, UPCOMING, LOCKED, CLOSED last
  const sorted = [...activeFiltered].sort((a, b) => {
    const order: Record<QuizStatus, number> = { OPEN: 0, ATTEMPTED: 1, UPCOMING: 2, LOCKED: 3, CLOSED: 4, COMPLETED: 5 };
    const diff = order[a.status] - order[b.status];
    if (diff !== 0) return diff;
    if (a.quizType === "MEGA" && b.quizType !== "MEGA") return -1;
    if (b.quizType === "MEGA" && a.quizType !== "MEGA") return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const showActiveLive = activeLiveQuizzes.length > 0 && (filter === "ALL" || filter === "OPEN");
  const showCompletedSection = totalCompleted > 0 && (filter === "ALL" || filter === "COMPLETED");
  const isEmpty = !isLoading && !error && sorted.length === 0 && !showActiveLive && !showCompletedSection;

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Compact header with inline status pills */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Quizzes</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Complete quizzes to earn points and climb the leaderboard
            </p>
          </div>
          {!isLoading && allQuizzes.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {(["OPEN", "ATTEMPTED", "UPCOMING", "LOCKED", "CLOSED", "COMPLETED"] as QuizStatus[]).map((s) => {
                const n = s === "COMPLETED" ? totalCompleted : counts[s];
                if (n === 0) return null;
                const cfg = STATUS_CONFIG[s];
                const Icon = cfg.icon;
                return (
                  <span
                    key={s}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                      cfg.bg, cfg.color,
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {n} {cfg.label}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Active live quizzes (shown on All + Open tabs) */}
        {showActiveLive && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Live Quizzes</h2>
              {activeLiveQuizzes.some((q: any) => q.status === "ACTIVE") && (
                <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full animate-pulse">
                  Live now!
                </span>
              )}
            </div>
            {activeLiveQuizzes.map((quiz: any) => (
              <LiveQuizCard key={quiz.id} quiz={quiz} />
            ))}
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
          {FILTER_TABS.map(({ key, label }) => {
            const count = key === "COMPLETED"
              ? totalCompleted
              : key === "ALL"
                ? allQuizzes.filter((q) => q.status !== "COMPLETED").length + activeLiveQuizzes.length
                : counts[key as QuizStatus];
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  "shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  filter === key
                    ? key === "COMPLETED"
                      ? "border-violet-600 text-violet-700"
                      : "border-blue-600 text-blue-700"
                    : "border-transparent text-gray-500 hover:text-gray-700",
                )}
              >
                {label}
                {count > 0 && (
                  <span className={cn(
                    "ml-1.5 px-1.5 py-0.5 rounded-full text-xs",
                    filter === key
                      ? key === "COMPLETED" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-500",
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Main quiz list (active / non-completed) */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px] w-full rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 rounded-xl border border-gray-200 bg-white">
            <FileQuestion className="h-10 w-10 mb-3 text-gray-200" />
            <p className="font-medium text-gray-500">Failed to load quizzes</p>
            <p className="text-sm mt-1">Make sure you're assigned to a cohort</p>
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 rounded-xl border border-gray-200 bg-white">
            <FileQuestion className="h-10 w-10 mb-3 text-gray-200" />
            <p className="font-medium text-gray-500">
              {filter === "ALL" ? "No quizzes available yet" : `No ${filter.toLowerCase()} quizzes`}
            </p>
            {filter === "ALL" && (
              <p className="text-sm mt-1">Your facilitator will add quizzes to your cohort</p>
            )}
          </div>
        ) : sorted.length > 0 ? (
          <div className="space-y-2">
            {sorted.map((quiz) =>
              (quiz.status === "OPEN" || quiz.status === "ATTEMPTED") ? (
                <Link key={quiz.id} href={`/quiz/${quiz.id}`} className="block">
                  <QuizCard quiz={quiz} />
                </Link>
              ) : (
                <QuizCard key={quiz.id} quiz={quiz} />
              )
            )}
          </div>
        ) : null}

        {/* Completed section — always at the bottom */}
        {showCompletedSection && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 pt-2">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
                <Trophy className="h-3 w-3" />
                Completed ({totalCompleted})
              </span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <div className="space-y-2">
              {completedLiveQuizzes.map((quiz: any) => (
                <LiveQuizCard key={quiz.id} quiz={quiz} />
              ))}
              {completedStandard.map((quiz) => (
                <QuizCard key={quiz.id} quiz={quiz} />
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
