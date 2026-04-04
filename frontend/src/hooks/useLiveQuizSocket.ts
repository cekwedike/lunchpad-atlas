import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { fetchSocketAuthToken } from '@/lib/socket-auth';
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

  const onParticipantJoinedRef = useRef(onParticipantJoined);
  const onQuizStartedRef = useRef(onQuizStarted);
  const onQuestionShownRef = useRef(onQuestionShown);
  const onQuizCompletedRef = useRef(onQuizCompleted);
  const onLeaderboardUpdateRef = useRef(onLeaderboardUpdate);
  const onAnswerResultRef = useRef(onAnswerResult);
  const onResultsShownRef = useRef(onResultsShown);
  onParticipantJoinedRef.current = onParticipantJoined;
  onQuizStartedRef.current = onQuizStarted;
  onQuestionShownRef.current = onQuestionShown;
  onQuizCompletedRef.current = onQuizCompleted;
  onLeaderboardUpdateRef.current = onLeaderboardUpdate;
  onAnswerResultRef.current = onAnswerResult;
  onResultsShownRef.current = onResultsShown;

  // Join quiz
  const joinQuiz = useCallback((displayName: string) => {
    if (socketRef.current) {
      socketRef.current.emit('joinQuiz', { quizId, displayName });
    }
  }, [quizId]);

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
    let cancelled = false;
    let socket: Socket | null = null;

    void (async () => {
      const token = await fetchSocketAuthToken();
      if (cancelled || !token) return;

      socket = io(`${SOCKET_URL}/live-quiz`, {
        auth: { token },
        transports: ['websocket'],
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('Live Quiz socket connected');
      });

      socket.on('disconnect', () => {
        console.log('Live Quiz socket disconnected');
      });

      socket.on('error', (error: Error) => {
        console.error('Live Quiz socket error:', error);
      });

      const pj = onParticipantJoinedRef.current;
      if (pj) socket.on('participantJoined', pj);
      const qs = onQuizStartedRef.current;
      if (qs) socket.on('quizStarted', qs);
      const qsh = onQuestionShownRef.current;
      if (qsh) socket.on('questionShown', qsh);
      const qc = onQuizCompletedRef.current;
      if (qc) socket.on('quizCompleted', qc);
      const lu = onLeaderboardUpdateRef.current;
      if (lu) socket.on('leaderboardUpdate', lu);
      const ar = onAnswerResultRef.current;
      if (ar) socket.on('answerResult', ar);
      const rs = onResultsShownRef.current;
      if (rs) socket.on('resultsShown', rs);
    })();

    return () => {
      cancelled = true;
      if (socket) {
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
      }
      socketRef.current = null;
    };
  }, [userId, quizId]);

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
