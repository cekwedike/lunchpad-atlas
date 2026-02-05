import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

// Types
export interface UpdateCohortRequest {
  name?: string;
  startDate?: string;
  endDate?: string;
  facilitatorId?: string;
}

export interface UpdateSessionRequest {
  title?: string;
  description?: string;
  scheduledDate?: string;
  unlockDate?: string;
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

// Get audit logs
export function useAuditLogs(page: number = 1, limit: number = 50) {
  return useQuery({
    queryKey: ['audit-logs', page, limit],
    queryFn: () => 
      apiClient.get<AuditLogsResponse>(`/admin/audit-logs?page=${page}&limit=${limit}`),
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
export function useCohorts() {
  return useQuery({
    queryKey: ['cohorts'],
    queryFn: async () => {
      const data = await apiClient.get('/cohorts');
      return Array.isArray(data) ? data : [];
    },
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
