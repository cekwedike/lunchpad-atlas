'use client';

import { usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { isProtectedRoutePath } from '@/lib/dashboard-routes';

export function AuthSessionGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoading } = useAuth();
  const gate = isProtectedRoutePath(pathname) && isLoading;

  if (gate) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-atlas-navy" />
        <p className="text-sm text-slate-600">Checking your session…</p>
      </div>
    );
  }

  return <>{children}</>;
}
