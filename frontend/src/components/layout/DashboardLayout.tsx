'use client';

import { useState } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { TourGuide } from '@/components/tour/TourGuide';
import { SetupChecklist } from '@/components/SetupChecklist';
import { useAuthStore } from '@/stores/authStore';
import { usePlatformTimePing } from '@/hooks/usePlatformTimePing';
import { ShieldOff, KeyRound, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';

interface DashboardLayoutProps {
  children: React.ReactNode;
  /** Skip max-width/padding so a child page (e.g. chat) can use the full main column edge-to-edge. */
  fullBleedContent?: boolean;
  /** Optionally hide setup checklist for immersive pages like chat. */
  showSetupChecklist?: boolean;
}

function SuspensionOverlay({ reason }: { reason?: string | null }) {
  return (
    <div className="fixed inset-0 z-[9990] flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm p-6">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-red-200 overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 to-rose-600 px-6 py-8 flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center mb-3">
            <ShieldOff className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">Account Suspended</h2>
          <p className="text-red-100 text-sm mt-1">Your access to ATLAS has been restricted.</p>
        </div>
        <div className="p-6 space-y-4">
          {reason && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">Reason</p>
              <p className="text-sm text-red-800">{reason}</p>
            </div>
          )}
          <p className="text-sm text-slate-600 text-center">
            To appeal or get more information, please contact your facilitator or the ATLAS support team directly.
          </p>
          <p className="text-xs text-slate-400 text-center">
            You can still view this page but cannot perform any actions until your account is reinstated.
          </p>
        </div>
      </div>
    </div>
  );
}

function ForcePasswordChangeOverlay() {
  const { user, setUser } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const mutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      apiClient.post('/users/me/change-password', data),
    onSuccess: () => {
      if (user) {
        setUser({ ...user, mustChangePassword: false });
      }
      toast.success('Password updated', 'You can now access ATLAS');
    },
    onError: (error: any) => {
      toast.error('Failed to update password', error.message || 'Incorrect current password');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match', 'Please make sure both fields match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password too short', 'Password must be at least 8 characters');
      return;
    }
    mutation.mutate({ currentPassword, newPassword });
  };

  return (
    <div className="fixed inset-0 z-[9990] flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm p-6">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-blue-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-950 to-indigo-700 px-6 py-8 flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center mb-3">
            <KeyRound className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">Set a new password</h2>
          <p className="text-blue-100 text-sm mt-1">Your password was reset by an administrator.</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-slate-600">
            Enter the temporary password from your email, then choose a new password to continue.
          </p>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Temporary password</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your temporary password"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">New password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Min. 8 characters"
                required
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Repeat new password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-950 py-2.5 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-60 transition-colors"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {mutation.isPending ? 'Updating…' : 'Set new password'}
          </button>
        </form>
      </div>
    </div>
  );
}

export function DashboardLayout({
  children,
  fullBleedContent = false,
  showSetupChecklist = true,
}: DashboardLayoutProps) {
  const { user } = useAuthStore();
  const isSuspended = user?.isSuspended === true;
  const mustChangePassword = user?.mustChangePassword === true;

  usePlatformTimePing(!isSuspended);

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <Navbar />
      <div className="flex min-h-0 min-w-0">
        <Sidebar />
        <main
          className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden min-h-[calc(100vh-4rem)] ${fullBleedContent ? 'overflow-y-hidden' : ''} ${isSuspended ? 'pointer-events-none select-none' : ''}`}
        >
          {fullBleedContent ? (
            <>
              {!isSuspended && showSetupChecklist && (
                <div className="shrink-0 border-b border-slate-200/60 bg-gray-50 px-4 pt-4 sm:px-6 lg:px-8">
                  <SetupChecklist />
                </div>
              )}
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
            </>
          ) : (
            <div className="mx-auto flex min-h-0 w-full min-w-0 max-w-7xl flex-1 flex-col gap-4 overflow-x-hidden p-4 sm:p-6 lg:p-8">
              {!isSuspended && showSetupChecklist && <SetupChecklist />}
              {children}
            </div>
          )}
        </main>
      </div>
      <TourGuide />
      {isSuspended && <SuspensionOverlay reason={user?.suspensionReason} />}
      {!isSuspended && mustChangePassword && <ForcePasswordChangeOverlay />}
    </div>
  );
}
