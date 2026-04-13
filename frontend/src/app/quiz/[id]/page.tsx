"use client";

import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Clock, CheckCircle, Award, XCircle } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ErrorMessage";
import { useQuiz, useQuizQuestions, useSubmitQuiz, useQuizAttempts, useQuizReview } from "@/hooks/api/useQuizzes";
import type { QuizQuestion } from "@/types/api";

export default function QuizPage() {
  const router = useRouter();
  const params = useParams();
  const quizId = params.id as string;
  
  const { data: quiz, isLoading: isLoadingQuiz, error: quizError, refetch: refetchQuiz } = useQuiz(quizId);
  const { data: questions, isLoading: isLoadingQuestions, error: questionsError } = useQuizQuestions(quizId);
  const { data: attempts } = useQuizAttempts(quizId);
  const submitQuizMutation = useSubmitQuiz(quizId);

  const [started, setStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [quizResult, setQuizResult] = useState<any>(null);
  const [showReview, setShowReview] = useState(false);

  const { data: reviewData } = useQuizReview(quizId, showReview);

  const handleSubmit = useCallback(async () => {
    if (!questions) return;

    // Calculate time taken in seconds
    const timeTaken = startTime > 0 ? Math.floor((Date.now() - startTime) / 1000) : 0;

    try {
      const result = await submitQuizMutation.mutateAsync({
        answers,
        timeTaken,
      });
      setQuizResult(result);
    } catch (error) {
      console.error('Failed to submit quiz:', error);
    }
  }, [answers, questions, submitQuizMutation, startTime]);

  const handleSubmitRef = useRef(handleSubmit);
  handleSubmitRef.current = handleSubmit;

  // Single timer: init + steady 1s tick. Avoid depending on `timeRemaining` (was resetting the
  // interval every second) and on full `quiz` (refetches were resetting the clock).
  useEffect(() => {
    if (!started || quizResult || !quiz) return;

    const limitMin = Number(quiz.timeLimit);
    const limitSec =
      Number.isFinite(limitMin) && limitMin > 0 ? Math.floor(limitMin * 60) : null;

    setTimeRemaining(limitSec);
    setStartTime(Date.now());

    if (limitSec === null) return;

    const id = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 0) return prev;
        if (prev <= 1) {
          void handleSubmitRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
    // Intentionally omit quiz?.timeLimit: same quiz id + refetch must not reset the clock.
  }, [started, quiz?.id, quizResult]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    setStarted(true);
  };

  const handleAnswerSelect = (questionId: string, answer: string) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const handleNext = () => {
    if (questions && currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const isLoading = isLoadingQuiz || isLoadingQuestions;
  const error = quizError || questionsError;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Card className="p-4 sm:p-8 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-6"></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
              <div className="h-24 bg-gray-200 rounded"></div>
              <div className="h-24 bg-gray-200 rounded"></div>
              <div className="h-24 bg-gray-200 rounded"></div>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <ErrorMessage
          title="Failed to load quiz"
          message={error instanceof Error ? error.message : 'An error occurred'}
        />
        <Button onClick={() => refetchQuiz()} className="mt-4">
          Try Again
        </Button>
      </DashboardLayout>
    );
  }

  if (!quiz) {
    return (
      <DashboardLayout>
        <ErrorMessage
          title="Quiz not found"
          message="This quiz could not be found. It may have been removed or you may not have access."
        />
        <Button onClick={() => router.push('/quiz')} className="mt-4">
          Back to Quizzes
        </Button>
      </DashboardLayout>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <DashboardLayout>
        <ErrorMessage
          title="No questions yet"
          message="This quiz exists but has no questions. Please check back later or contact your facilitator."
        />
        <Button onClick={() => router.push('/quiz')} className="mt-4">
          Back to Quizzes
        </Button>
      </DashboardLayout>
    );
  }

  if (quizResult) {
    const passed = quizResult.passed;
    const isMega = quizResult.quizType === 'MEGA';
    const hasTimeBonus = quizResult.timeBonus && quizResult.timeBonus > 0;
    const hasMultiplier = quizResult.multiplier && quizResult.multiplier !== 1.0;
    const attemptsRemaining: number | null = quizResult.attemptsRemaining;
    const canRetry = !passed && (attemptsRemaining === null || attemptsRemaining > 0);

    const rankLabel = (rank: number) => {
      if (rank === 1) return '1st';
      if (rank === 2) return '2nd';
      if (rank === 3) return '3rd';
      return `${rank}th`;
    };

    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto">
          <Card className="p-4 sm:p-8 text-center">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${
              passed ? "bg-green-100" : "bg-red-100"
            }`}>
              {passed ? (
                <CheckCircle className="w-12 h-12 text-green-600" />
              ) : (
                <XCircle className="w-12 h-12 text-red-600" />
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              {passed ? "Congratulations!" : "Keep Learning!"}
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              {passed
                ? "You've successfully completed this quiz!"
                : "You didn't pass this time, but you can try again."}
            </p>

            <div className="grid grid-cols-2 gap-3 sm:gap-6 mb-8">
              <div className="p-6 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Your Score</p>
                <p className={`text-4xl font-bold ${passed ? "text-green-600" : "text-red-600"}`}>
                  {quizResult.score}%
                </p>
              </div>
              <div className="p-6 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Passing Score</p>
                <p className="text-4xl font-bold text-gray-900">{quiz.passingScore}%</p>
              </div>
            </div>

            {passed && (
              <div className="mb-8 space-y-4 text-left">

                {/* MEGA quiz: rank-based leaderboard reward */}
                {isMega && quizResult.megaQuizRank && (
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
                    <h3 className="font-bold text-indigo-900 text-lg mb-4">Mega Quiz Results</h3>

                    {/* Rank banner */}
                    <div className="flex items-center justify-between rounded-lg bg-white border border-indigo-100 px-4 py-3 mb-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500 mb-0.5">Your Rank</p>
                        <p className="text-2xl font-extrabold text-indigo-900">
                          {rankLabel(quizResult.megaQuizRank)} Place
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Participants</p>
                        <p className="text-2xl font-extrabold text-gray-700">{quizResult.totalMegaSubmissions}</p>
                      </div>
                    </div>

                    {/* Points transparency */}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center text-gray-600">
                        <span>Quiz score</span>
                        <span className="font-semibold text-gray-900">{quizResult.score}%</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-600">
                        <span>Rank among cohort</span>
                        <span className="font-semibold text-gray-900">{rankLabel(quizResult.megaQuizRank)}</span>
                      </div>
                      <div className="border-t border-indigo-200 pt-2 mt-1 flex justify-between items-center">
                        <span className="font-bold text-indigo-900">Leaderboard points added</span>
                        <span className="font-extrabold text-indigo-700 text-lg">+{quizResult.pointsAwarded} pts</span>
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-indigo-500">
                      Rankings are based on quiz score. Points are awarded by final position, not raw quiz score.
                    </p>
                  </div>
                )}

                {/* Regular quiz: existing points breakdown */}
                {!isMega && quizResult.pointsAwarded > 0 && (
                  <>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h3 className="font-semibold text-blue-900 mb-3">Points Breakdown</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">Base Points:</span>
                          <span className="font-semibold text-gray-900">{quizResult.basePoints}</span>
                        </div>
                        {hasMultiplier && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-700">Multiplier ({quizResult.multiplier}x):</span>
                            <span className="font-semibold text-gray-900">
                              {Math.round(quizResult.basePoints * quizResult.multiplier)}
                            </span>
                          </div>
                        )}
                        {hasTimeBonus && (
                          <div className="flex justify-between items-center text-green-700">
                            <span>Time Bonus:</span>
                            <span className="font-semibold">+{quizResult.timeBonus}</span>
                          </div>
                        )}
                        <div className="border-t border-blue-300 pt-2 mt-2 flex justify-between items-center">
                          <span className="font-bold text-blue-900">Total Points:</span>
                          <span className="font-bold text-blue-900">+{quizResult.pointsAwarded}</span>
                        </div>
                      </div>
                    </div>
                    {quizResult.timeTaken > 0 && (
                      <p className="text-sm text-gray-500 text-center">
                        Completed in {Math.floor(quizResult.timeTaken / 60)}:{(quizResult.timeTaken % 60).toString().padStart(2, '0')}
                      </p>
                    )}
                  </>
                )}

                {/* Monthly cap warning (regular quizzes only) */}
                {!isMega && quizResult.cappedMessage && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-900 text-sm">{quizResult.cappedMessage}</p>
                  </div>
                )}

                {/* Already passed */}
                {!isMega && quizResult.pointsAwarded === 0 && !quizResult.cappedMessage && (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-gray-700 text-sm text-center">
                      No points awarded — you have already passed this quiz before.
                    </p>
                  </div>
                )}

                {/* Achievements */}
                {quizResult.newAchievements && quizResult.newAchievements.length > 0 && (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <h3 className="font-semibold text-purple-900 mb-2">New Achievements Unlocked!</h3>
                    <div className="space-y-1">
                      {quizResult.newAchievements.map((achievement: any) => (
                        <p key={achievement.id} className="text-sm text-purple-700">
                          {achievement.title} (+{achievement.pointsValue} points)
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Attempt info for failed quizzes */}
            {!passed && (
              <div className={`mb-4 p-3 rounded-lg text-sm text-center ${
                attemptsRemaining === 0
                  ? 'bg-red-50 border border-red-200 text-red-800'
                  : 'bg-amber-50 border border-amber-200 text-amber-800'
              }`}>
                {attemptsRemaining === 0
                  ? 'You have used all your attempts for this quiz.'
                  : attemptsRemaining !== null
                    ? `${attemptsRemaining} attempt${attemptsRemaining !== 1 ? 's' : ''} remaining — points will be halved on next attempt.`
                    : 'You can retry this quiz.'
                }
              </div>
            )}

            <div className="flex flex-wrap gap-3 justify-center mb-6">
              <Button
                onClick={() => router.push("/quiz")}
                className="bg-atlas-navy hover:bg-atlas-navy/90"
              >
                Back to Quizzes
              </Button>
              {canRetry && (
                <Button
                  onClick={() => {
                    setQuizResult(null);
                    setStarted(false);
                    setCurrentQuestion(0);
                    setAnswers({});
                    setStartTime(0);
                    setShowReview(false);
                    setTimeRemaining(null);
                  }}
                  variant="outline"
                >
                  Try Again
                </Button>
              )}
              <Button
                onClick={() => setShowReview((v) => !v)}
                variant="outline"
                className="border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                {showReview ? 'Hide Review' : 'Review My Answers'}
              </Button>
            </div>

            {/* Answer review panel */}
            {showReview && (
              <div className="text-left space-y-3 border-t border-gray-200 pt-6">
                <h3 className="font-semibold text-gray-900 mb-4">Answer Review</h3>
                {reviewData ? reviewData.questions.map((q, idx) => (
                  <div key={q.id} className={`p-4 rounded-lg border ${q.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <p className="font-medium text-gray-900 mb-2">
                      <span className="text-gray-500 mr-2">{idx + 1}.</span>
                      {q.question}
                    </p>
                    <div className="space-y-1 text-sm">
                      {(Array.isArray(q.options) ? q.options : []).map((opt, i) => {
                        const isUserAnswer = opt === q.userAnswer;
                        const isCorrectAnswer = reviewData.showCorrectAnswers && opt === q.correctAnswer;
                        return (
                          <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded ${
                            isCorrectAnswer ? 'bg-green-100 text-green-900 font-medium'
                            : isUserAnswer && !q.isCorrect ? 'bg-red-100 text-red-900'
                            : 'text-gray-700'
                          }`}>
                            {isUserAnswer ? (q.isCorrect ? <CheckCircle className="w-4 h-4 text-green-600 shrink-0" /> : <XCircle className="w-4 h-4 text-red-600 shrink-0" />) : <span className="w-4 h-4 shrink-0" />}
                            <span>{opt}</span>
                            {isCorrectAnswer && !isUserAnswer && <span className="ml-auto text-xs text-green-700">(correct answer)</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-gray-500 text-center">Loading review...</p>
                )}
              </div>
            )}
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!started) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto">
          <Card className="p-4 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">{quiz.title}</h1>
            <p className="text-lg text-gray-600 mb-6">{quiz.description}</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-6 mb-8">
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <Clock className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Time Limit</p>
                <p className="text-lg font-bold text-gray-900">
                  {quiz.timeLimit ? `${quiz.timeLimit} min` : "No limit"}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <CheckCircle className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Passing Score</p>
                <p className="text-lg font-bold text-gray-900">{quiz.passingScore}%</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <Award className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Questions</p>
                <p className="text-lg font-bold text-gray-900">{questions.length}</p>
              </div>
            </div>

            {/* Attempt tracker */}
            {(() => {
              const maxAttempts = quiz.maxAttempts;
              const usedAttempts = attempts?.length ?? 0;
              const attemptsLeft = maxAttempts > 0 ? maxAttempts - usedAttempts : null;
              const exhausted = attemptsLeft !== null && attemptsLeft <= 0;
              return (
                <div className={`mb-4 p-3 rounded-lg border text-sm ${exhausted ? 'bg-red-50 border-red-200 text-red-800' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                  {maxAttempts === 0
                    ? `Attempt ${usedAttempts + 1} — unlimited retries allowed`
                    : exhausted
                      ? `You have used all ${maxAttempts} attempt${maxAttempts !== 1 ? 's' : ''} for this quiz.`
                      : `Attempt ${usedAttempts + 1} of ${maxAttempts}${usedAttempts > 0 ? ` — points reduced by ${Math.round((1 - 1 / Math.pow(2, usedAttempts)) * 100)}% for retries` : ''}`
                  }
                </div>
              );
            })()}

            <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <span className="font-semibold">Instructions:</span>{" "}
                {quiz.timeLimit
                  ? `You have ${quiz.timeLimit} minutes to complete ${questions.length} questions.`
                  : `Complete ${questions.length} questions at your own pace — no time limit.`
                }{" "}
                You need {quiz.passingScore}% or higher to pass. Good luck!
              </p>
            </div>

            {(() => {
              const maxAttempts = quiz.maxAttempts;
              const usedAttempts = attempts?.length ?? 0;
              const exhausted = maxAttempts > 0 && usedAttempts >= maxAttempts;
              return exhausted ? (
                <Button disabled className="w-full text-lg py-6">No Attempts Remaining</Button>
              ) : (
                <Button
                  onClick={handleStart}
                  className="w-full bg-atlas-navy hover:bg-atlas-navy/90 text-lg py-6"
                >
                  Start Quiz
                </Button>
              );
            })()}
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const currentQ = questions[currentQuestion];
  const selectedAnswer = answers[currentQ.id];
  const isLowTime = timeRemaining !== null && timeRemaining > 0 && timeRemaining < 120;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Timer and Progress */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Award className="w-6 h-6 text-atlas-navy shrink-0" />
            <span className="font-bold text-xl text-gray-900 truncate">{quiz.title}</span>
          </div>
          {timeRemaining !== null ? (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              isLowTime ? 'bg-red-100' : 'bg-gray-100'
            }`}>
              <Clock className={`w-5 h-5 ${isLowTime ? 'text-red-600' : 'text-gray-600'}`} />
              <span className={`font-semibold ${isLowTime ? 'text-red-600' : 'text-gray-900'}`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100">
              <Clock className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-500">No limit</span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-600">
              Question {currentQuestion + 1} of {questions.length}
            </span>
            <span className="text-sm font-medium text-gray-600">
              {Math.round(((currentQuestion + 1) / questions.length) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-atlas-navy h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Question */}
        <Card className="p-4 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">{currentQ.question || currentQ.questionText}</h2>
          
          <div className="space-y-3">
            {(Array.isArray(currentQ.options) ? currentQ.options : []).map((option: string, index: number) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(currentQ.id, option)}
                className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                  selectedAnswer === option
                    ? "border-atlas-navy bg-blue-50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedAnswer === option
                      ? "border-atlas-navy bg-atlas-navy"
                      : "border-gray-300"
                  }`}>
                    {selectedAnswer === option && (
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                    )}
                  </div>
                  <span className="text-gray-900">{option}</span>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            variant="outline"
          >
            Previous
          </Button>
          
          {currentQuestion < questions.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={!selectedAnswer}
              className="bg-atlas-navy hover:bg-atlas-navy/90"
            >
              Next Question
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={Object.keys(answers).length !== questions.length || submitQuizMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {submitQuizMutation.isPending ? 'Submitting...' : 'Submit Quiz'}
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
