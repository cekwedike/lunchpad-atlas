'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { useLiveQuiz } from '@/hooks/api/useLiveQuiz';
import { useLiveQuizSocket } from '@/hooks/useLiveQuizSocket';
import { useSubmitAnswer } from '@/hooks/api/useLiveQuiz';
import { LiveQuizLobby } from './LiveQuizLobby';
import { LiveQuizPlayer } from './LiveQuizPlayer';
import { LiveQuizHost } from './LiveQuizHost';
import { LiveQuizResults } from './LiveQuizResults';
import { LiveQuizLeaderboard } from './LiveQuizLeaderboard';
import {
  LiveQuizStatus,
  LiveQuizQuestion,
  QuizStartedEvent,
  QuestionShownEvent,
  QuizCompletedEvent,
  LeaderboardUpdateEvent,
  AnswerResultEvent,
} from '@/types/live-quiz';

interface LiveQuizContainerProps {
  quizId: string;
  userId: string;
  userRole: 'FACILITATOR' | 'ADMIN' | 'FELLOW';
  onExit?: () => void;
}

type QuizState = 'lobby' | 'playing' | 'completed';

export function LiveQuizContainer({
  quizId,
  userId,
  userRole,
  onExit,
}: LiveQuizContainerProps) {
  const [quizState, setQuizState] = useState<QuizState>('lobby');
  const [currentQuestion, setCurrentQuestion] = useState<LiveQuizQuestion | null>(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const { data: quiz, isLoading, refetch } = useLiveQuiz(quizId);
  const submitAnswerMutation = useSubmitAnswer();

  const isHost = userRole === 'FACILITATOR' || userRole === 'ADMIN';

  // WebSocket event handlers
  const handleQuizStarted = useCallback((event: QuizStartedEvent) => {
    console.log('Quiz started:', event);
    setQuizState('playing');
    setCurrentQuestion(event.question);
    setQuestionNumber(event.currentQuestion + 1);
    setHasAnswered(false);
    setShowLeaderboard(false);
  }, []);

  const handleQuestionShown = useCallback((event: QuestionShownEvent) => {
    console.log('New question shown:', event);
    setCurrentQuestion(event.question);
    setQuestionNumber(event.questionIndex + 1);
    setHasAnswered(false);
    setShowLeaderboard(false);
  }, []);

  const handleQuizCompleted = useCallback((event: QuizCompletedEvent) => {
    console.log('Quiz completed:', event);
    setQuizState('completed');
    setLeaderboard(event.leaderboard);
    refetch();
  }, [refetch]);

  const handleLeaderboardUpdate = useCallback((event: LeaderboardUpdateEvent) => {
    console.log('Leaderboard updated:', event);
    setLeaderboard(event.leaderboard);
    setShowLeaderboard(true);
  }, []);

  const handleAnswerResult = useCallback((event: AnswerResultEvent) => {
    console.log('Answer result:', event);
    // Answer result is handled in LiveQuizPlayer component
  }, []);

  // Setup WebSocket
  const {} = useLiveQuizSocket({
    quizId,
    userId,
    onQuizStarted: handleQuizStarted,
    onQuestionShown: handleQuestionShown,
    onQuizCompleted: handleQuizCompleted,
    onLeaderboardUpdate: handleLeaderboardUpdate,
    onAnswerResult: handleAnswerResult,
  });

  // Handle answer submission
  const handleAnswer = useCallback(
    async (answerIndex: number, timeToAnswer: number) => {
      if (!participantId || !currentQuestion || hasAnswered) return;

      setHasAnswered(true);

      try {
        await submitAnswerMutation.mutateAsync({
          participantId,
          questionId: currentQuestion.id,
          selectedAnswer: answerIndex,
          timeToAnswer,
        });
      } catch (error) {
        console.error('Failed to submit answer:', error);
      }
    },
    [participantId, currentQuestion, hasAnswered, submitAnswerMutation]
  );

  // Update quiz state based on status
  useEffect(() => {
    if (!quiz) return;

    if (quiz.status === LiveQuizStatus.PENDING) {
      setQuizState('lobby');
    } else if (quiz.status === LiveQuizStatus.ACTIVE) {
      setQuizState('playing');
    } else if (quiz.status === LiveQuizStatus.COMPLETED) {
      setQuizState('completed');
    }

    // Set participant ID if user has joined
    const participant = quiz.participants?.find(p => p.userId === userId);
    if (participant) {
      setParticipantId(participant.id);
    }
  }, [quiz, userId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Quiz not found</h2>
          <p className="text-muted-foreground">The quiz you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  // Host view
  if (isHost) {
    return <LiveQuizHost quiz={quiz} userId={userId} />;
  }

  // Participant views
  if (quizState === 'lobby') {
    return (
      <LiveQuizLobby
        quizId={quizId}
        userId={userId}
        onQuizStarted={handleQuizStarted}
      />
    );
  }

  if (quizState === 'playing' && currentQuestion) {
    return (
      <div className="space-y-6">
        <LiveQuizPlayer
          question={currentQuestion}
          questionNumber={questionNumber}
          totalQuestions={quiz.totalQuestions}
          onAnswer={handleAnswer}
          isAnswered={hasAnswered}
        />
        
        {/* Show leaderboard after answer */}
        {showLeaderboard && leaderboard.length > 0 && (
          <div className="max-w-4xl mx-auto px-4">
            <LiveQuizLeaderboard
              participants={leaderboard}
              currentUserId={userId}
              showTopOnly={5}
            />
          </div>
        )}
      </div>
    );
  }

  if (quizState === 'completed') {
    return (
      <LiveQuizResults
        quiz={quiz}
        currentUserId={userId}
        onGoHome={onExit}
      />
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-12 h-12 animate-spin text-primary" />
    </div>
  );
}
