'use client';

import { useState, useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { PushNotificationPrompt } from './PushNotificationPrompt';
import { useAuthStore } from '@/stores/authStore';

function PushPromptGate() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return null;
  return <PushNotificationPrompt />;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        {mounted && <ReactQueryDevtools initialIsOpen={false} />}
        {mounted && <PushPromptGate />}
      </AuthProvider>
    </QueryClientProvider>
  );
}
