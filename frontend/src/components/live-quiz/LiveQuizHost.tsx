'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  SkipForward, 
  Users, 
  Clock, 
  Trophy,
  AlertCircle,
  CheckCircle2,
  BarChart3
} from 'lucide-react';
import { LiveQuiz, LiveQuizStatus, ResultsShownEvent } from '@/types/live-quiz';
import { useLiveQuizSocket } from '@/hooks/useLiveQuizSocket';
import { LiveQuizLeaderboard } from './LiveQuizLeaderboard';
import { cn } from '@/lib/utils';

interface LiveQuizHostProps {
  quiz: LiveQuiz;
  userId: string;
}

export function LiveQuizHost({ quiz, userId }: LiveQuizHostProps) {
  const [participantCount, setParticipantCount] = useState(quiz.participants?.length || 0);
  const [currentResults, setCurrentResults] = useState<ResultsShownEvent | null>(null);

  const { startQuiz, nextQuestion, showResults } = useLiveQuizSocket({
    quizId: quiz.id,
    userId,
    onParticipantJoined: (event) => {
      setParticipantCount(event.participantCount);
    },
    onQuizStarted: () => {
      // Quiz started
    },
    onQuestionShown: () => {
      setCurrentResults(null); // Clear results when new question shown
    },
    onResultsShown: (event) => {
      setCurrentResults(event);
    },
  });

  const handleStartQuiz = () => {
    if (participantCount === 0) {
      alert('Cannot start quiz without participants');
      return;
    }
    startQuiz();
  };

  const handleNextQuestion = () => {
    nextQuestion();
  };

  const handleShowResults = () => {
    if (quiz.questions && quiz.questions.length > 0) {
      const currentQ = quiz.questions[quiz.currentQuestion];
      if (currentQ) {
        showResults(currentQ.id);
      }
    }
  };

  const isPending = quiz.status === LiveQuizStatus.PENDING;
  const isActive = quiz.status === LiveQuizStatus.ACTIVE;
  const isCompleted = quiz.status === LiveQuizStatus.COMPLETED;
  const currentQuestionIndex = quiz.currentQuestion;
  const currentQuestion = quiz.questions?.[currentQuestionIndex];
  const progressPercentage = quiz.totalQuestions > 0 
    ? ((currentQuestionIndex + 1) / quiz.totalQuestions) * 100 
    : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4">
      {/* Host Controls */}
      <Card className="border-2 border-primary">
        <CardHeader className="bg-primary text-primary-foreground">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Host Controls</CardTitle>
              <CardDescription className="text-primary-foreground/80">
                Manage quiz flow and monitor participants
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              <Users className="w-4 h-4 mr-2" />
              {participantCount} Players
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {/* Quiz Status */}
          <div className="flex items-center gap-4">
            <Badge 
              variant={isPending ? 'secondary' : isActive ? 'default' : 'outline'}
              className={cn(
                "text-lg px-4 py-2",
                isActive && "bg-green-600 hover:bg-green-700"
              )}
            >
              {isPending && '⏳ Waiting to Start'}
              {isActive && '▶️ Live'}
              {isCompleted && '✅ Completed'}
            </Badge>

            {isActive && (
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    Question {currentQuestionIndex + 1} of {quiz.totalQuestions}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {progressPercentage.toFixed(0)}%
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {isPending && (
              <Button
                onClick={handleStartQuiz}
                disabled={participantCount === 0}
                size="lg"
                className="flex-1"
              >
                <Play className="w-5 h-5 mr-2" />
                Start Quiz
              </Button>
            )}

            {isActive && (
              <>
                <Button
                  onClick={handleShowResults}
                  variant="secondary"
                  size="lg"
                  className="flex-1"
                  disabled={!currentQuestion}
                >
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Show Results
                </Button>

                <Button
                  onClick={handleNextQuestion}
                  size="lg"
                  className="flex-1"
                >
                  <SkipForward className="w-5 h-5 mr-2" />
                  {currentQuestionIndex + 1 < quiz.totalQuestions ? 'Next Question' : 'End Quiz'}
                </Button>
              </>
            )}
          </div>

          {/* Warnings */}
          {isPending && participantCount === 0 && (
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                Waiting for participants to join. Share the quiz link with your students.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Current Question Display */}
      {isActive && currentQuestion && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Current Question
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-secondary rounded-lg">
              <p className="text-xl font-semibold">{currentQuestion.questionText}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {currentQuestion.options.map((option, index) => (
                <div
                  key={index}
                  className={cn(
                    "p-3 rounded-lg border-2 flex items-center gap-2",
                    index === currentQuestion.correctAnswer 
                      ? "bg-green-100 border-green-500" 
                      : "bg-gray-50 border-gray-200"
                  )}
                >
                  {index === currentQuestion.correctAnswer && (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  )}
                  <span className={cn(
                    "font-medium",
                    index === currentQuestion.correctAnswer && "text-green-700"
                  )}>
                    {option.text}
                  </span>
                </div>
              ))}
            </div>

            {/* Question Stats */}
            {currentResults && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg space-y-2">
                <h4 className="font-semibold text-blue-900">Answer Statistics</h4>
                <div className="space-y-2">
                  {currentQuestion.options.map((option, index) => {
                    const count = currentResults.statistics[`option${index}` as keyof typeof currentResults.statistics] || 0;
                    const percentage = participantCount > 0 ? (count / participantCount) * 100 : 0;
                    
                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{option.text}</span>
                          <span className="font-medium">{count} ({percentage.toFixed(0)}%)</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Live Leaderboard */}
      {(isActive || isCompleted) && quiz.participants && (
        <LiveQuizLeaderboard 
          participants={quiz.participants}
          showTopOnly={10}
        />
      )}

      {/* Completion Message */}
      {isCompleted && (
        <Card className="border-2 border-green-500 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Trophy className="w-16 h-16 text-green-600" />
              <h3 className="text-2xl font-bold text-green-700">Quiz Completed!</h3>
              <p className="text-center text-green-600">
                Great job everyone! Check out the final leaderboard above.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
