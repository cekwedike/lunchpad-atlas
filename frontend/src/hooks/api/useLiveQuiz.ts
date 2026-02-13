import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  LiveQuiz,
  CreateLiveQuizDto,
  JoinLiveQuizDto,
  SubmitAnswerDto,
  LiveQuizParticipant,
} from '@/types/live-quiz';

const LIVE_QUIZ_KEYS = {
  all: ['live-quiz'] as const,
  detail: (id: string) => [...LIVE_QUIZ_KEYS.all, id] as const,
  session: (sessionId: string) => [...LIVE_QUIZ_KEYS.all, 'session', sessionId] as const,
  leaderboard: (id: string) => [...LIVE_QUIZ_KEYS.all, id, 'leaderboard'] as const,
  participantAnswers: (participantId: string) => [...LIVE_QUIZ_KEYS.all, 'participant', participantId, 'answers'] as const,
};

// Get quiz by ID
export function useLiveQuiz(quizId: string) {
  return useQuery({
    queryKey: LIVE_QUIZ_KEYS.detail(quizId),
    queryFn: () => apiClient.get<LiveQuiz>(`/live-quiz/${quizId}`),
    enabled: !!quizId,
  });
}

// Get all quizzes for a session
export function useSessionLiveQuizzes(sessionId: string) {
  return useQuery({
    queryKey: LIVE_QUIZ_KEYS.session(sessionId),
    queryFn: () => apiClient.get<LiveQuiz[]>(`/live-quiz/session/${sessionId}`),
    enabled: !!sessionId,
  });
}

// Get live quizzes for the current user's cohort (fellow-facing)
export function useMyLiveQuizzes() {
  return useQuery({
    queryKey: [...LIVE_QUIZ_KEYS.all, 'my'] as const,
    queryFn: () => apiClient.get<LiveQuiz[]>('/live-quiz/my'),
  });
}

// Get all live quizzes for a cohort
export function useCohortLiveQuizzes(cohortId: string) {
  return useQuery({
    queryKey: [...LIVE_QUIZ_KEYS.all, 'cohort', cohortId] as const,
    queryFn: () => apiClient.get<LiveQuiz[]>(`/live-quiz/cohort/${cohortId}`),
    enabled: !!cohortId,
  });
}

// Get leaderboard
export function useLiveQuizLeaderboard(quizId: string, options?: { refetchInterval?: number | false }) {
  return useQuery({
    queryKey: LIVE_QUIZ_KEYS.leaderboard(quizId),
    queryFn: () => apiClient.get<LiveQuizParticipant[]>(`/live-quiz/${quizId}/leaderboard`),
    enabled: !!quizId,
    refetchInterval: options?.refetchInterval ?? 2000, // Refresh every 2 seconds during active quiz; pass false for static results
  });
}

// Create quiz (facilitator/admin only)
export function useCreateLiveQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLiveQuizDto) => 
      apiClient.post<LiveQuiz>('/live-quiz', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIVE_QUIZ_KEYS.all });
    },
  });
}

// Join quiz
export function useJoinLiveQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ quizId, data }: { quizId: string; data: JoinLiveQuizDto }) =>
      apiClient.post<LiveQuizParticipant>(`/live-quiz/${quizId}/join`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: LIVE_QUIZ_KEYS.detail(variables.quizId) });
      queryClient.invalidateQueries({ queryKey: LIVE_QUIZ_KEYS.leaderboard(variables.quizId) });
      // Refresh the fellow's quiz list so the "Joined" badge appears
      queryClient.invalidateQueries({ queryKey: [...LIVE_QUIZ_KEYS.all, 'my'] });
    },
  });
}

// Start quiz (facilitator/admin only)
export function useStartLiveQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quizId: string) => 
      apiClient.post<LiveQuiz>(`/live-quiz/${quizId}/start`, {}),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: LIVE_QUIZ_KEYS.detail(data.id) });
    },
  });
}

// Submit answer
export function useSubmitAnswer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SubmitAnswerDto) =>
      apiClient.post('/live-quiz/answer', data),
    onSuccess: (_, variables) => {
      // Invalidate participant's answers and leaderboard
      queryClient.invalidateQueries({ 
        queryKey: LIVE_QUIZ_KEYS.participantAnswers(variables.participantId) 
      });
    },
  });
}

// Delete quiz (facilitator/admin only)
export function useDeleteLiveQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quizId: string) => 
      apiClient.delete(`/live-quiz/${quizId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIVE_QUIZ_KEYS.all });
    },
  });
}
