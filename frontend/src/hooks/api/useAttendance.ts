import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface AttendanceRecord {
  id: string;
  userId: string;
  sessionId: string;
  checkInTime: string;
  checkOutTime: string | null;
  isLate: boolean;
  isExcused: boolean;
  duration?: number | null;
  session?: {
    id: string;
    title: string;
    sessionNumber: number;
    scheduledDate: string;
  };
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface AttendanceReport {
  sessionId: string;
  sessionTitle: string;
  scheduledDate: string;
  totalFellows: number;
  attendedCount: number;
  attendanceRate: number;
  lateCount: number;
  excusedCount: number;
  attendees: Array<{
    userId: string;
    userName: string;
    email: string;
    checkInTime: string;
    checkOutTime: string | null;
    isLate: boolean;
    isExcused: boolean;
    duration: number | null;
  }>;
  absentees: Array<{
    userId: string;
    userName: string;
    email: string;
  }>;
}

export interface AttendanceStats {
  totalSessions: number;
  totalFellows: number;
  totalAttendance: number;
  averageAttendanceRate: number;
  lateRate: number;
}

export function useSessionQrCode(sessionId?: string) {
  return useQuery<{ qrCode: string }>({
    queryKey: ['attendance-qr', sessionId],
    queryFn: () => apiClient.get(`/attendance/session/${sessionId}/qr-code`),
    enabled: !!sessionId,
  });
}

export function useSessionAttendanceReport(sessionId?: string) {
  return useQuery<AttendanceReport>({
    queryKey: ['attendance-report', sessionId],
    queryFn: () => apiClient.get(`/attendance/session/${sessionId}/report`),
    enabled: !!sessionId,
  });
}

export function useCohortAttendanceStats(cohortId?: string) {
  return useQuery<AttendanceStats>({
    queryKey: ['attendance-stats', cohortId],
    queryFn: () => apiClient.get(`/attendance/cohort/${cohortId}/stats`),
    enabled: !!cohortId,
  });
}

export function useMyAttendance(sessionId?: string) {
  return useQuery<AttendanceRecord | null>({
    queryKey: ['attendance-me', sessionId],
    queryFn: () => apiClient.get(`/attendance/session/${sessionId}/me`),
    enabled: !!sessionId,
  });
}

export function useAttendanceHistory(cohortId?: string) {
  return useQuery<AttendanceRecord[]>({
    queryKey: ['attendance-history', cohortId],
    queryFn: () =>
      apiClient.get(`/attendance/me${cohortId ? `?cohortId=${cohortId}` : ''}`),
  });
}

export function useCheckIn(sessionId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data?: {
      latitude?: number;
      longitude?: number;
      ipAddress?: string;
      userAgent?: string;
    }) => apiClient.post(`/attendance/check-in/${sessionId}`, data || {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-me', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['attendance-history'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-report', sessionId] });
    },
  });
}

export function useCheckOut(sessionId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.post(`/attendance/check-out/${sessionId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-me', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['attendance-history'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-report', sessionId] });
    },
  });
}

export function useMarkExcused(sessionId?: string, userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notes?: string) =>
      apiClient.patch(`/attendance/session/${sessionId}/user/${userId}/excuse`, {
        notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-report', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['attendance-stats'] });
    },
  });
}
