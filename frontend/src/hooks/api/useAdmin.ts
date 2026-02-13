import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { Resource, ResourceType } from '@/types/api';

// Types
export interface UpdateCohortRequest {
  name?: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdateSessionRequest {
  title?: string;
  description?: string;
  scheduledDate?: string;
  unlockDate?: string;
}

export interface CreateResourceRequest {
  sessionId: string;
  type: ResourceType;
  title: string;
  description?: string;
  url: string;
  duration?: number;
  estimatedMinutes?: number;
  isCore?: boolean;
  pointValue?: number;
  order: number;
}

export interface UpdateResourceRequest {
  sessionId?: string;
  type?: ResourceType;
  title?: string;
  description?: string;
  url?: string;
  duration?: number;
  estimatedMinutes?: number;
  isCore?: boolean;
  pointValue?: number;
  order?: number;
  state?: string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: any;
  createdAt: Date;
}

export interface AuditLogsResponse {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PlatformMetrics {
  totalUsers: number;
  activeUsers: number;
  engagementRate: number;
  weeklyGrowth: number;
  resourceCount: number;
  cohortCount: number;
  roleCounts: {
    fellowCount: number;
    facilitatorCount: number;
    adminCount: number;
  };
  newUsersThisWeek: number;
  newUsersLastWeek: number;
}

// Get audit logs
export function useAuditLogs(page: number = 1, limit: number = 50) {
  return useQuery({
    queryKey: ['audit-logs', page, limit],
    queryFn: () => 
      apiClient.get<AuditLogsResponse>(`/admin/audit-logs?page=${page}&limit=${limit}`),
  });
}

export function useAdminMetrics() {
  return useQuery({
    queryKey: ['admin-metrics'],
    queryFn: () => apiClient.get<PlatformMetrics>('/admin/metrics'),
  });
}

// Update cohort
export function useUpdateCohort() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ cohortId, data }: { cohortId: string; data: UpdateCohortRequest }) =>
      apiClient.patch(`/admin/cohorts/${cohortId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cohorts'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      toast.success('Cohort updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update cohort', {
        description: error.message,
      });
    },
  });
}

// Update session
export function useUpdateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: string; data: UpdateSessionRequest }) =>
      apiClient.patch(`/admin/sessions/${sessionId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      toast.success('Session updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update session', {
        description: error.message,
      });
    },
  });
}

// Get cohorts (for admin view)
export function useCohorts(enabled = true) {
  return useQuery({
    queryKey: ['cohorts'],
    queryFn: async () => {
      const data = await apiClient.get('/cohorts');
      return Array.isArray(data) ? data : [];
    },
    enabled,
  });
}

// Create cohort
export function useCreateCohort() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; startDate: string; endDate: string }) =>
      apiClient.post('/admin/cohorts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cohorts'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      toast.success('Cohort created successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to create cohort', {
        description: error.message,
      });
    },
  });
}

// Duplicate cohort
export function useDuplicateCohort() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ cohortId, name }: { cohortId: string; name?: string }) =>
      apiClient.post(`/admin/cohorts/${cohortId}/duplicate`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cohorts'] });
      toast.success('Cohort duplicated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to duplicate cohort', {
        description: error.message,
      });
    },
  });
}

// Delete cohort
export function useDeleteCohort() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cohortId: string) =>
      apiClient.delete(`/admin/cohorts/${cohortId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cohorts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      toast.success('Cohort and all users deleted successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to delete cohort', {
        description: error.message,
      });
    },
  });
}

// Get all users (for admin)
export function useAdminUsers(
  filters?: { role?: string; cohortId?: string; search?: string },
  options?: { enabled?: boolean },
) {
  const params = new URLSearchParams();
  if (filters?.role) params.append('role', filters.role);
  if (filters?.cohortId) params.append('cohortId', filters.cohortId);
  if (filters?.search) params.append('search', filters.search);

  const queryString = params.toString();

  return useQuery({
    queryKey: ['admin-users', filters],
    queryFn: async () => {
      const response = await apiClient.get<any>(`/admin/users${queryString ? `?${queryString}` : ''}`);
      console.log('Admin users API response:', response);
      return response;
    },
    enabled: options?.enabled ?? true,
  });
}

// Get sessions for a cohort
export function useSessions(cohortId?: string) {
  return useQuery({
    queryKey: ['sessions', cohortId],
    queryFn: async () => {
      const data = await apiClient.get(`/sessions?cohortId=${cohortId}`);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!cohortId,
  });
}

// Create a new session
export function useCreateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      cohortId: string;
      sessionNumber: number;
      title: string;
      description?: string;
      monthTheme?: string;
      scheduledDate: string;
      unlockDate?: string;
    }) => apiClient.post('/admin/sessions', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sessions', variables.cohortId] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      toast.success('Session created successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to create session', { description: error.message });
    },
  });
}

// Get attendance for a session
export function useSessionAttendance(sessionId?: string) {
  return useQuery({
    queryKey: ['session-attendance', sessionId],
    queryFn: () => apiClient.get<any>(`/admin/sessions/${sessionId}/attendance`),
    enabled: !!sessionId,
  });
}

// Mark bulk attendance for a session
export function useMarkBulkAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      attendances,
    }: {
      sessionId: string;
      attendances: {
        fellowId: string;
        isPresent: boolean;
        isLate?: boolean;
        isExcused?: boolean;
        notes?: string;
      }[];
    }) => apiClient.post(`/admin/sessions/${sessionId}/attendance`, { attendances }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['session-attendance', variables.sessionId] });
      toast.success('Attendance saved');
    },
    onError: (error: any) => {
      toast.error('Failed to save attendance', { description: error.message });
    },
  });
}

// Submit transcript for AI review
export function useAiReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, transcript }: { sessionId: string; transcript: string }) =>
      apiClient.post<any>(`/admin/sessions/${sessionId}/ai-review`, { transcript }),
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ['sessionAnalytics', sessionId] });
    },
    onError: (error: any) => {
      toast.error('ATLAS review failed', { description: error.message });
    },
  });
}

// Chat with AI about a session
export function useAiChat() {
  return useMutation({
    mutationFn: ({
      sessionId,
      message,
      transcript,
      history,
    }: {
      sessionId: string;
      message: string;
      transcript?: string;
      history?: Array<{ role: 'user' | 'model'; content: string }>;
    }) =>
      apiClient.post<{ reply: string }>(`/admin/sessions/${sessionId}/ai-chat`, {
        message,
        transcript,
        history,
      }),
    onError: (error: any) => {
      toast.error('Failed to send message', { description: error.message });
    },
  });
}

// Delete session analytics
export function useDeleteSessionAnalytics() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      apiClient.delete(`/admin/sessions/${sessionId}/analytics`),
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['sessionAnalytics', sessionId] });
      toast.success('Analysis deleted');
    },
    onError: (error: any) => {
      toast.error('Failed to delete analysis', { description: error.message });
    },
  });
}

// ============ User Management Hooks ============

// Create user (admin registration)
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; email: string; password: string; role: 'FELLOW' | 'FACILITATOR' | 'ADMIN'; cohortId?: string }) =>
      apiClient.post('/auth/register', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      toast.success('User created successfully');
    },
    onError: (error: any) => {
      console.error('User creation error:', error);
      
      let errorMessage = 'Email may already be in use';
      
      // Extract detailed error message
      if (error.message) {
        errorMessage = error.message;
      }
      
      // Handle validation errors
      if (error.errors) {
        const validationErrors = Object.entries(error.errors)
          .map(([field, messages]: [string, any]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
          .join('; ');
        errorMessage = validationErrors;
      }
      
      toast.error('Failed to create user', {
        description: errorMessage,
      });
    },
  });
}

// Update user role
export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'FELLOW' | 'FACILITATOR' | 'ADMIN' }) =>
      apiClient.put(`/admin/users/${userId}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      toast.success('User role updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update user role', {
        description: error.message,
      });
    },
  });
}

// Update user cohort
export function useUpdateUserCohort() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, cohortId }: { userId: string; cohortId: string | null }) =>
      apiClient.put(`/admin/users/${userId}/cohort`, { cohortId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['cohorts'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      toast.success('User cohort updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update user cohort', {
        description: error.message,
      });
    },
  });
}

// Delete user
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      apiClient.delete(`/admin/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      toast.success('User deleted successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to delete user', {
        description: error.message || 'Cannot delete user',
      });
    },
  });
}

// ============ Resource Management Hooks ============

// Get all resources with filters
export function useAdminResources(filters?: {
  sessionId?: string;
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
  cohortId?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.sessionId) params.append('sessionId', filters.sessionId);
  if (filters?.type) params.append('type', filters.type);
  if (filters?.search) params.append('search', filters.search);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.cohortId) params.append('cohortId', filters.cohortId);

  const queryString = params.toString();

  return useQuery({
    queryKey: ['admin-resources', filters],
    queryFn: () => apiClient.get(`/admin/resources${queryString ? `?${queryString}` : ''}`),
  });
}

// Get resources by session ID
export function useResourcesBySession(sessionId?: string) {
  return useQuery({
    queryKey: ['session-resources', sessionId],
    queryFn: () => apiClient.get(`/admin/sessions/${sessionId}/resources`),
    enabled: !!sessionId,
  });
}

// Create resource
export function useCreateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateResourceRequest) =>
      apiClient.post('/admin/resources', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-resources'] });
      queryClient.invalidateQueries({ queryKey: ['session-resources'] });
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      toast.success('Resource created successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to create resource', {
        description: error.message,
      });
    },
  });
}

// Update resource
export function useUpdateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ resourceId, data }: { resourceId: string; data: UpdateResourceRequest }) =>
      apiClient.patch(`/admin/resources/${resourceId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-resources'] });
      queryClient.invalidateQueries({ queryKey: ['session-resources'] });
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      toast.success('Resource updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update resource', {
        description: error.message,
      });
    },
  });
}

// Delete resource
export function useDeleteResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (resourceId: string) =>
      apiClient.delete(`/admin/resources/${resourceId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-resources'] });
      queryClient.invalidateQueries({ queryKey: ['session-resources'] });
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      toast.success('Resource deleted successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to delete resource', {
        description: error.message || 'Cannot delete resource if users have started it',
      });
    },
  });
}

export function useCohortMembers(cohortId?: string) {
  return useQuery({
    queryKey: ['cohort-members', cohortId],
    queryFn: async () => {
      const data = await apiClient.get<any[]>(`/admin/cohorts/${cohortId}/members`);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!cohortId,
  });
}

// ─── Quiz Management ──────────────────────────────────────────────────────────

export function useCohortQuizzes(cohortId?: string) {
  return useQuery<{ sessionQuizzes: any[]; cohortQuizzes: any[] }>({
    queryKey: ['cohort-quizzes', cohortId],
    queryFn: () => apiClient.get(`/admin/quizzes/cohort/${cohortId}`),
    enabled: !!cohortId,
  });
}

export function useUpdateQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ quizId, cohortId, ...dto }: {
      quizId: string;
      cohortId: string;
      title?: string;
      description?: string;
      timeLimit?: number;
      passingScore?: number;
      pointValue?: number;
      openAt?: string | null;
      closeAt?: string | null;
      questions?: Array<{ question: string; options: string[]; correctAnswer: string; order?: number }>;
    }) => apiClient.patch(`/admin/quizzes/${quizId}`, dto),
    onSuccess: (_, { cohortId }) => {
      queryClient.invalidateQueries({ queryKey: ['cohort-quizzes', cohortId] });
      toast.success('Quiz updated');
    },
    onError: () => toast.error('Failed to update quiz'),
  });
}

export function useNotifyLiveQuiz() {
  return useMutation({
    mutationFn: (liveQuizId: string) =>
      apiClient.post(`/admin/live-quiz/${liveQuizId}/notify`, {}),
    onSuccess: () => toast.success('Notification sent to fellows who haven\'t joined'),
    onError: () => toast.error('Failed to send notifications'),
  });
}

export function useCreateQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: {
      title: string;
      description?: string;
      cohortId: string;
      sessionIds?: string[];
      quizType: 'SESSION' | 'GENERAL' | 'MEGA';
      timeLimit: number;
      passingScore: number;
      pointValue: number;
      openAt?: string;
      closeAt?: string;
      questions: Array<{ question: string; options: string[]; correctAnswer: string; order?: number }>;
    }) => apiClient.post('/admin/quizzes', dto),
    onSuccess: (_, dto) => {
      queryClient.invalidateQueries({ queryKey: ['cohort-quizzes', dto.cohortId] });
      toast.success('Quiz created successfully');
    },
    onError: () => toast.error('Failed to create quiz'),
  });
}

export function useDeleteQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ quizId }: { quizId: string; cohortId: string }) =>
      apiClient.delete(`/admin/quizzes/${quizId}`),
    onSuccess: (_, { cohortId }) => {
      queryClient.invalidateQueries({ queryKey: ['cohort-quizzes', cohortId] });
      toast.success('Quiz deleted');
    },
    onError: () => toast.error('Failed to delete quiz'),
  });
}

// ─── Cohort Facilitator Management ────────────────────────────────────────────

export function useAddCohortFacilitator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cohortId, userId }: { cohortId: string; userId: string }) =>
      apiClient.post(`/admin/cohorts/${cohortId}/facilitators`, { userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cohorts'] });
      queryClient.invalidateQueries({ queryKey: ['cohort-members'] });
      toast.success('Facilitator added to cohort');
    },
    onError: (error: any) => toast.error('Failed to add facilitator', { description: error.message }),
  });
}

export function useRemoveCohortFacilitator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cohortId, userId }: { cohortId: string; userId: string }) =>
      apiClient.delete(`/admin/cohorts/${cohortId}/facilitators/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cohorts'] });
      queryClient.invalidateQueries({ queryKey: ['cohort-members'] });
      toast.success('Facilitator removed from cohort');
    },
    onError: () => toast.error('Failed to remove facilitator'),
  });
}

// ─── User Facilitator Privilege ───────────────────────────────────────────────

export function useUpdateUserFacilitator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, isFacilitator }: { userId: string; isFacilitator: boolean }) =>
      apiClient.patch(`/admin/users/${userId}/facilitator`, { isFacilitator }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User facilitator privilege updated');
    },
    onError: () => toast.error('Failed to update facilitator privilege'),
  });
}

export function useGenerateAIQuestions() {
  return useMutation({
    mutationFn: (dto: {
      quizTitle?: string;
      sessionIds?: string[];
      cohortId?: string;
      questionCount: number;
      difficulty: 'easy' | 'medium' | 'hard';
    }) => apiClient.post<{ questions: Array<{ question: string; options: string[]; correctAnswer: string; order: number }> }>('/admin/quizzes/generate-ai', dto),
    onError: () => toast.error('AI question generation failed'),
  });
}
