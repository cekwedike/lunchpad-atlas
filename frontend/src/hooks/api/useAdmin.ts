import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { Resource, ResourceType } from '@/types/api';

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

// ============ Resource Management Hooks ============

// Get all resources with filters
export function useAdminResources(filters?: {
  sessionId?: string;
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.sessionId) params.append('sessionId', filters.sessionId);
  if (filters?.type) params.append('type', filters.type);
  if (filters?.search) params.append('search', filters.search);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());

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
