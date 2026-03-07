'use client';

import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { TourGuide } from '@/components/tour/TourGuide';
import { SetupChecklist } from '@/components/SetupChecklist';
import { useAuthStore } from '@/stores/authStore';
import { ShieldOff } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
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

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user } = useAuthStore();
  const isSuspended = user?.isSuspended === true;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className={`flex-1 min-w-0 min-h-[calc(100vh-4rem)] ${isSuspended ? 'pointer-events-none select-none' : ''}`}>
          <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 space-y-4">
            {!isSuspended && <SetupChecklist />}
            {children}
          </div>
        </main>
      </div>
      <TourGuide />
      {isSuspended && <SuspensionOverlay reason={user?.suspensionReason} />}
    </div>
  );
}
