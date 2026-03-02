"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileQuestion, Clock, Award, CheckCircle, XCircle, Lock, Timer,
  Zap, BookOpen, Trophy, ChevronRight, Loader2, Crown, Medal, Flame, Star,
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

// Tiered leaderboard points awarded by finish rank in a live/mega quiz
function getLeaderboardPoints(rank: number): number {
  if (rank === 1) return 3000;
  if (rank === 2) return 2000;
  if (rank === 3) return 1000;
  if (rank <= 7) return 500;
  return 200;
}

// Rank icon: Crown for 1st, Medal for 2nd/3rd, number otherwise
function RankBadge({ rank, size = "sm" }: { rank: number; size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "h-6 w-6" : "h-4 w-4";
  if (rank === 1) return <Crown className={cn(cls, "text-amber-500")} />;
  if (rank === 2) return <Medal className={cn(cls, "text-slate-400")} />;
  if (rank === 3) return <Medal className={cn(cls, "text-orange-400")} />;
  return <span className={cn("font-bold text-gray-500 font-mono", size === "lg" ? "text-sm" : "text-xs")}>#{rank}</span>;
}

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

          {/* Leaderboard points earned */}
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

            {/* Question answering interface (ACTIVE + joined) */}
            {quiz.status === "ACTIVE" && hasJoined && quiz.participants?.[0]?.id && (
              <LiveQuizTaker quizId={quiz.id} participantId={quiz.participants[0].id} />
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
  // Poll every 5s so PENDING→ACTIVE status changes are detected without manual refresh
  const { data: liveQuizzes = [] } = useMyLiveQuizzes({ refetchInterval: 5000 });
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
