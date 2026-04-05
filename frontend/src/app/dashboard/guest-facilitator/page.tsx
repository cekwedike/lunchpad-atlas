'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  BookOpen,
  MessageSquare,
  AlertTriangle,
  Clock,
  Calendar,
  UserCheck,
} from 'lucide-react';
import Link from 'next/link';
import { calendarDaysFromToday } from '@/lib/date-utils';

/** Time-based days until instant (access expiry); avoids treating “expires later today” as already expired. */
function daysUntilInstant(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function GuestFacilitatorDashboard() {
  const { user } = useAuthStore();

  const expiresAt = user?.guestAccessExpiresAt ? new Date(user.guestAccessExpiresAt) : null;
  const daysLeft = expiresAt ? daysUntilInstant(expiresAt) : null;
  const isExpiringSoon = daysLeft !== null && daysLeft <= 2 && daysLeft > 0;
  const isExpired = daysLeft !== null && daysLeft <= 0;

  const { data: sessionsData } = useQuery({
    queryKey: ['guest-sessions'],
    queryFn: () =>
      apiClient.get<{ data: Array<{ id: string; sessionNumber: number; title: string; scheduledDate: string; cohortId: string }> }>(
        '/resources?limit=1',
      ).then(() =>
        apiClient.get<Array<{ sessionId: string; session: { id: string; sessionNumber: number; title: string; scheduledDate: string } }>>(
          '/users/me/guest-sessions',
        ),
      ),
    retry: false,
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Expiry warning banner */}
        {isExpired && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">
              Your guest facilitator access has expired. Contact your programme administrator to restore access.
            </p>
          </div>
        )}
        {isExpiringSoon && !isExpired && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              Your access expires in <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong>
              {expiresAt ? ` (${formatDate(expiresAt)})` : ''}. Contact your administrator to extend it.
            </p>
          </div>
        )}

        {/* Welcome card */}
        <div className="rounded-2xl bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-700 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-blue-200 text-sm font-medium">Guest Facilitator</p>
              <h1 className="text-xl font-bold">
                Welcome, {user?.name?.split(' ')[0] ?? 'Guest'}
              </h1>
            </div>
          </div>
          {expiresAt && daysLeft !== null && daysLeft > 0 && (
            <div className="mt-4 flex items-center gap-2 text-sm text-blue-200">
              <Clock className="h-4 w-4 shrink-0" />
              <span>
                Access active until <strong className="text-white">{formatDate(expiresAt)}</strong>
                {' '}({daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining)
              </span>
            </div>
          )}
          {sessionsData && Array.isArray(sessionsData) && sessionsData.length === 0 && (
            <p className="mt-3 text-sm text-blue-200">No sessions assigned yet. Your access window will be set once sessions are assigned by an administrator.</p>
          )}
        </div>

        {/* Assigned sessions */}
        {sessionsData && Array.isArray(sessionsData) && sessionsData.length > 0 && (
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-indigo-600" />
              Your Assigned Sessions
            </h2>
            <div className="space-y-3">
              {sessionsData.map((row: any) => {
                const s = row.session;
                if (!s) return null;
                const sDate = new Date(s.scheduledDate);
                const d = calendarDaysFromToday(sDate);
                return (
                  <div
                    key={row.sessionId}
                    className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Session {s.sessionNumber}: {s.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDate(sDate)}</p>
                    </div>
                    {d > 0 ? (
                      <span className="text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1">
                        In {d} day{d !== 1 ? 's' : ''}
                      </span>
                    ) : d === 0 ? (
                      <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-100 rounded-full px-3 py-1">
                        Today
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-3 py-1">
                        Completed
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/resources"
            className="group rounded-2xl bg-white border border-gray-200 shadow-sm p-6 hover:border-blue-200 hover:shadow-md transition-all"
          >
            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
              <BookOpen className="h-5 w-5 text-blue-700" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">Session Resources</h3>
            <p className="text-xs text-gray-500 mt-1">Browse resources for your assigned session(s)</p>
          </Link>

          <Link
            href="/dashboard/discussions"
            className="group rounded-2xl bg-white border border-gray-200 shadow-sm p-6 hover:border-indigo-200 hover:shadow-md transition-all"
          >
            <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-3 group-hover:bg-indigo-100 transition-colors">
              <MessageSquare className="h-5 w-5 text-indigo-700" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">Discussions</h3>
            <p className="text-xs text-gray-500 mt-1">Interact with fellows about your session topics</p>
          </Link>
        </div>

      </div>
    </DashboardLayout>
  );
}
