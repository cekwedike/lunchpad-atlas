'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, Flame, Zap } from 'lucide-react';
import { LiveQuizQuestion, QuizOption, AnswerResultEvent } from '@/types/live-quiz';
import { cn } from '@/lib/utils';

interface LiveQuizPlayerProps {
  question: LiveQuizQuestion;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (answerIndex: number, timeToAnswer: number) => void;
  isAnswered: boolean;
}

const KAHOOT_COLORS = {
  red: 'bg-red-500 hover:bg-red-600 border-red-600',
  blue: 'bg-blue-500 hover:bg-blue-600 border-blue-600',
  yellow: 'bg-yellow-500 hover:bg-yellow-600 border-yellow-600',
  green: 'bg-green-500 hover:bg-green-600 border-green-600',
};

const ANSWER_SHAPES: Record<number, string> = {
  0: '▲', // Triangle - Red
  1: '◆', // Diamond - Blue
  2: '●', // Circle - Yellow
  3: '■', // Square - Green
};

export function LiveQuizPlayer({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
  isAnswered,
}: LiveQuizPlayerProps) {
  const [timeRemaining, setTimeRemaining] = useState(question.timeLimit);
  const [startTime] = useState(Date.now());
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [answerResult, setAnswerResult] = useState<AnswerResultEvent | null>(null);

  // Countdown timer
  useEffect(() => {
    if (isAnswered || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isAnswered, timeRemaining]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeRemaining === 0 && !isAnswered && selectedAnswer === null) {
      // Time's up - no answer submitted
      setShowResult(true);
    }
  }, [timeRemaining, isAnswered, selectedAnswer]);

  const handleAnswerClick = useCallback((answerIndex: number) => {
    if (isAnswered || selectedAnswer !== null) return;

    const timeToAnswer = Date.now() - startTime;
    setSelectedAnswer(answerIndex);
    onAnswer(answerIndex, timeToAnswer);
  }, [isAnswered, selectedAnswer, startTime, onAnswer]);

  const progressPercentage = (timeRemaining / question.timeLimit) * 100;
  const isTimeRunningOut = timeRemaining <= 5;

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4">
      {/* Question Header */}
      <Card className="bg-gradient-to-br from-purple-600 to-blue-700 text-white">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="bg-white/20 hover:bg-white/30">
              Question {questionNumber} of {totalQuestions}
            </Badge>
            <div className={cn(
              "text-2xl font-bold transition-colors",
              isTimeRunningOut && "text-red-300 animate-pulse"
            )}>
              {timeRemaining}s
            </div>
          </div>

          <h2 className="text-2xl md:text-3xl font-bold text-center">
            {question.questionText}
          </h2>

          <Progress 
            value={progressPercentage} 
            className={cn(
              "h-2 transition-all",
              isTimeRunningOut && "bg-red-900"
            )}
          />
        </CardContent>
      </Card>

      {/* Answer Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {question.options.map((option: QuizOption, index: number) => {
          const isSelected = selectedAnswer === index;
          const isDisabled = isAnswered || selectedAnswer !== null || timeRemaining === 0;

          return (
            <Button
              key={index}
              onClick={() => handleAnswerClick(index)}
              disabled={isDisabled}
              className={cn(
                "h-32 text-xl font-bold text-white border-4 transition-all transform hover:scale-105",
                KAHOOT_COLORS[option.color],
                isSelected && "ring-4 ring-white scale-105",
                isDisabled && "opacity-60 cursor-not-allowed"
              )}
            >
              <div className="flex items-center gap-4">
                <span className="text-4xl">{ANSWER_SHAPES[index]}</span>
                <span>{option.text}</span>
              </div>
            </Button>
          );
        })}
      </div>

      {/* Answer Result */}
      {showResult && answerResult && (
        <Card className={cn(
          "border-4 animate-in fade-in slide-in-from-bottom-4",
          answerResult.isCorrect 
            ? "border-green-500 bg-green-50" 
            : "border-red-500 bg-red-50"
        )}>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-center gap-3">
              {answerResult.isCorrect ? (
                <>
                  <CheckCircle2 className="w-12 h-12 text-green-600" />
                  <h3 className="text-3xl font-bold text-green-700">Correct!</h3>
                </>
              ) : (
                <>
                  <XCircle className="w-12 h-12 text-red-600" />
                  <h3 className="text-3xl font-bold text-red-700">Incorrect</h3>
                </>
              )}
            </div>

            <div className="flex items-center justify-center gap-6 text-lg">
              <div className="flex items-center gap-2 text-yellow-700">
                <Zap className="w-6 h-6" />
                <span className="font-bold">+{answerResult.pointsEarned} points</span>
              </div>

              {answerResult.streakBonus > 0 && (
                <div className="flex items-center gap-2 text-orange-600">
                  <Flame className="w-6 h-6" />
                  <span className="font-bold">
                    {answerResult.newStreak} Streak! +{answerResult.streakBonus}
                  </span>
                </div>
              )}
            </div>

            {answerResult.newStreak >= 3 && (
              <div className="text-center">
                <Badge variant="default" className="bg-orange-500 text-lg py-1 px-4">
                  🔥 On Fire! {answerResult.newStreak} in a row!
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Time's Up Message */}
      {timeRemaining === 0 && selectedAnswer === null && (
        <Card className="border-4 border-gray-400 bg-gray-50">
          <CardContent className="pt-6">
            <p className="text-center text-2xl font-bold text-gray-600">
              Time's up! No answer submitted.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
