import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  ParticipantJoinedEvent,
  QuizStartedEvent,
  QuestionShownEvent,
  QuizCompletedEvent,
  LeaderboardUpdateEvent,
  AnswerResultEvent,
  ResultsShownEvent,
} from '@/types/live-quiz';

const RAW_SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const SOCKET_URL = RAW_SOCKET_URL.replace(/\/api\/v1\/?$/, '');

interface UseLiveQuizSocketOptions {
  quizId: string;
  userId: string;
  onParticipantJoined?: (event: ParticipantJoinedEvent) => void;
  onQuizStarted?: (event: QuizStartedEvent) => void;
  onQuestionShown?: (event: QuestionShownEvent) => void;
  onQuizCompleted?: (event: QuizCompletedEvent) => void;
  onLeaderboardUpdate?: (event: LeaderboardUpdateEvent) => void;
  onAnswerResult?: (event: AnswerResultEvent) => void;
  onResultsShown?: (event: ResultsShownEvent) => void;
}

/**
 * Hook for managing WebSocket connection to Live Quiz
 */
export function useLiveQuizSocket(options: UseLiveQuizSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const {
    quizId,
    userId,
    onParticipantJoined,
    onQuizStarted,
    onQuestionShown,
    onQuizCompleted,
    onLeaderboardUpdate,
    onAnswerResult,
    onResultsShown,
  } = options;

  // Join quiz
  const joinQuiz = useCallback((displayName: string) => {
    if (socketRef.current) {
      socketRef.current.emit('joinQuiz', { quizId, userId, displayName });
    }
  }, [quizId, userId]);

  // Start quiz (facilitator only)
  const startQuiz = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('startQuiz', { quizId });
    }
  }, [quizId]);

  // Go to next question (facilitator only)
  const nextQuestion = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('nextQuestion', { quizId });
    }
  }, [quizId]);

  // Submit answer
  const submitAnswer = useCallback((
    participantId: string,
    questionId: string,
    selectedAnswer: number,
    timeToAnswer: number
  ) => {
    if (socketRef.current) {
      socketRef.current.emit('submitAnswer', {
        participantId,
        questionId,
        selectedAnswer,
        timeToAnswer,
      });
    }
  }, []);

  // Get leaderboard
  const getLeaderboard = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('getLeaderboard', { quizId });
    }
  }, [quizId]);

  // Show results (facilitator only)
  const showResults = useCallback((questionId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('showResults', { quizId, questionId });
    }
  }, [quizId]);

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io(`${SOCKET_URL}/live-quiz`, {
      auth: {
        userId,
      },
      transports: ['websocket'],
    });

    const socket = socketRef.current;

    // Connection events
    socket.on('connect', () => {
      console.log('Live Quiz socket connected');
    });

    socket.on('disconnect', () => {
      console.log('Live Quiz socket disconnected');
    });

    socket.on('error', (error: Error) => {
      console.error('Live Quiz socket error:', error);
    });

    // Quiz events
    if (onParticipantJoined) {
      socket.on('participantJoined', onParticipantJoined);
    }

    if (onQuizStarted) {
      socket.on('quizStarted', onQuizStarted);
    }

    if (onQuestionShown) {
      socket.on('questionShown', onQuestionShown);
    }

    if (onQuizCompleted) {
      socket.on('quizCompleted', onQuizCompleted);
    }

    if (onLeaderboardUpdate) {
      socket.on('leaderboardUpdate', onLeaderboardUpdate);
    }

    if (onAnswerResult) {
      socket.on('answerResult', onAnswerResult);
    }

    if (onResultsShown) {
      socket.on('resultsShown', onResultsShown);
    }

    // Cleanup
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('error');
      socket.off('participantJoined');
      socket.off('quizStarted');
      socket.off('questionShown');
      socket.off('quizCompleted');
      socket.off('leaderboardUpdate');
      socket.off('answerResult');
      socket.off('resultsShown');
      socket.close();
    };
  }, [
    userId,
    onParticipantJoined,
    onQuizStarted,
    onQuestionShown,
    onQuizCompleted,
    onLeaderboardUpdate,
    onAnswerResult,
    onResultsShown,
  ]);

  return {
    socket: socketRef.current,
    joinQuiz,
    startQuiz,
    nextQuestion,
    submitAnswer,
    getLeaderboard,
    showResults,
  };
}
