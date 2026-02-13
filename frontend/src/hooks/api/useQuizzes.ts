import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type { Quiz, QuizQuestion, QuizResponse, SubmitQuizRequest } from '@/types/api';

export type QuizStatus = 'UPCOMING' | 'OPEN' | 'CLOSED' | 'COMPLETED';

export interface FellowQuiz {
  id: string;
  title: string;
  description: string | null;
  quizType: 'SESSION' | 'GENERAL' | 'MEGA';
  timeLimit: number;
  passingScore: number;
  pointValue: number;
  multiplier: number;
  openAt: string | null;
  closeAt: string | null;
  createdAt: string;
  status: QuizStatus;
  session?: { id: string; title: string; sessionNumber: number } | null;
  _count: { questions: number };
}

export function useMyQuizzes() {
  return useQuery({
    queryKey: ['my-quizzes'],
    queryFn: () => apiClient.get<FellowQuiz[]>('/quizzes/my-quizzes'),
  });
}

export function useQuiz(id: string) {
  return useQuery({
    queryKey: ['quiz', id],
    queryFn: () => apiClient.get<Quiz>(`/quizzes/${id}`),
    enabled: !!id,
  });
}

export function useQuizQuestions(quizId: string) {
  return useQuery({
    queryKey: ['quiz-questions', quizId],
    queryFn: () => apiClient.get<QuizQuestion[]>(`/quizzes/${quizId}/questions`),
    enabled: !!quizId,
  });
}

export function useQuizAttempts(quizId: string, userId?: string) {
  return useQuery({
    queryKey: ['quiz-attempts', quizId, userId],
    queryFn: async () => {
      const endpoint = userId 
        ? `/quizzes/${quizId}/attempts?userId=${userId}`
        : `/quizzes/${quizId}/attempts/me`;
      return apiClient.get<QuizResponse[]>(endpoint);
    },
    enabled: !!quizId,
  });
}

export function useSubmitQuiz(quizId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SubmitQuizRequest) =>
      apiClient.post<QuizResponse>(`/quizzes/${quizId}/submit`, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quiz-attempts', quizId] });
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
      
      if (data.passed) {
        toast.success(
          'Quiz passed!',
          `You scored ${data.score}% and earned ${data.pointsEarned} points`
        );
      } else {
        toast.warning(
          'Quiz not passed',
          `You scored ${data.score}%. You can try again.`
        );
      }
    },
    onError: (error: any) => {
      toast.error('Failed to submit quiz', error.message);
    },
  });
}
