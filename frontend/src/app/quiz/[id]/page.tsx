"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, CheckCircle, Award, XCircle } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ErrorMessage";
import { useQuiz, useQuizQuestions, useSubmitQuiz } from "@/hooks/api/useQuizzes";
import type { QuizQuestion } from "@/types/api";

export default function QuizPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const quizId = params.id;
  
  const { data: quiz, isLoading: isLoadingQuiz, error: quizError, refetch: refetchQuiz } = useQuiz(quizId);
  const { data: questions, isLoading: isLoadingQuestions, error: questionsError } = useQuizQuestions(quizId);
  const submitQuizMutation = useSubmitQuiz(quizId);
  
  const [started, setStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [quizResult, setQuizResult] = useState<any>(null);

  // Initialize timer when quiz starts
  useEffect(() => {
    if (started && quiz?.timeLimit) {
      setTimeRemaining(quiz.timeLimit * 60); // Convert minutes to seconds
    }
  }, [started, quiz?.timeLimit]);

  // Timer countdown
  useEffect(() => {
    if (!started || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [started, timeRemaining]);

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

  const handleSubmit = useCallback(async () => {
    if (!questions) return;

    try {
      const result = await submitQuizMutation.mutateAsync({
        answers,
      });
      setQuizResult(result);
    } catch (error) {
      console.error('Failed to submit quiz:', error);
    }
  }, [answers, questions, submitQuizMutation]);

  const isLoading = isLoadingQuiz || isLoadingQuestions;
  const error = quizError || questionsError;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Card className="p-8 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-6"></div>
            <div className="grid grid-cols-3 gap-6">
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

  if (!quiz || !questions || questions.length === 0) {
    return (
      <DashboardLayout>
        <ErrorMessage
          title="Quiz not found"
          message="This quiz could not be found or has no questions."
        />
        <Button onClick={() => router.push('/resources')} className="mt-4">
          Back to Resources
        </Button>
      </DashboardLayout>
    );
  }

  if (quizResult) {
    const passed = quizResult.passed;
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto">
          <Card className="p-8 text-center">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${
              passed ? "bg-green-100" : "bg-red-100"
            }`}>
              {passed ? (
                <CheckCircle className="w-12 h-12 text-green-600" />
              ) : (
                <XCircle className="w-12 h-12 text-red-600" />
              )}
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {passed ? "Congratulations!" : "Keep Learning!"}
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              {passed 
                ? "You've successfully completed this quiz!"
                : "You didn't pass this time, but you can try again."}
            </p>

            <div className="grid grid-cols-2 gap-6 mb-8">
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
              <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-900 font-semibold">
                  +{quizResult.pointsEarned} points earned!
                </p>
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => router.push("/resources")}
                className="bg-atlas-navy hover:bg-atlas-navy/90"
              >
                Back to Resources
              </Button>
              {!passed && (
                <Button
                  onClick={() => {
                    setQuizResult(null);
                    setStarted(false);
                    setCurrentQuestion(0);
                    setAnswers({});
                  }}
                  variant="outline"
                >
                  Try Again
                </Button>
              )}
            </div>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!started) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto">
          <Card className="p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{quiz.title}</h1>
            <p className="text-lg text-gray-600 mb-6">{quiz.description}</p>

            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <Clock className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Time Limit</p>
                <p className="text-lg font-bold text-gray-900">{quiz.timeLimit} min</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <CheckCircle className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Passing Score</p>
                <p className="text-lg font-bold text-gray-900">{quiz.passingScore}%</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <Award className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Max Attempts</p>
                <p className="text-lg font-bold text-gray-900">{quiz.maxAttempts}</p>
              </div>
            </div>

            <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <span className="font-semibold">Instructions:</span> You have {quiz.timeLimit} minutes to complete {questions.length} questions. 
                You need {quiz.passingScore}% or higher to pass. Good luck!
              </p>
            </div>

            <Button
              onClick={handleStart}
              className="w-full bg-atlas-navy hover:bg-atlas-navy/90 text-lg py-6"
            >
              Start Quiz
            </Button>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const currentQ = questions[currentQuestion];
  const selectedAnswer = answers[currentQ.id];
  const isLowTime = timeRemaining > 0 && timeRemaining < 120; // Less than 2 minutes

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Timer and Progress */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Award className="w-6 h-6 text-atlas-navy" />
            <span className="font-bold text-xl text-gray-900">{quiz.title}</span>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            isLowTime ? 'bg-red-100' : 'bg-gray-100'
          }`}>
            <Clock className={`w-5 h-5 ${isLowTime ? 'text-red-600' : 'text-gray-600'}`} />
            <span className={`font-semibold ${isLowTime ? 'text-red-600' : 'text-gray-900'}`}>
              {formatTime(timeRemaining)}
            </span>
          </div>
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
        <Card className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{currentQ.questionText}</h2>
          
          <div className="space-y-3">
            {currentQ.options.map((option: string, index: number) => (
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
