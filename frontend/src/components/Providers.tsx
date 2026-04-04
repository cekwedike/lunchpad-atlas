'use client';

import { useState, useEffect } from 'react';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { queryClient, PERSIST_MAX_AGE } from '@/lib/react-query';
import { idbStorage } from '@/lib/idb-store';
import { AuthProvider } from '@/contexts/AuthContext';
import { AuthSessionGate } from '@/components/AuthSessionGate';
import { PushNotificationPrompt } from './PushNotificationPrompt';
import { OfflineBanner } from './OfflineBanner';
import { UpdateBanner } from './UpdateBanner';
import { useAuthStore } from '@/stores/authStore';

const persister = createAsyncStoragePersister({
  storage: idbStorage,
  key: 'atlas-query-cache',
  throttleTime: 3000, // debounce writes to IndexedDB by 3s
});

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
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: PERSIST_MAX_AGE }}
    >
      <AuthProvider>
        <AuthSessionGate>{children}</AuthSessionGate>
        {mounted && <OfflineBanner />}
        {mounted && <UpdateBanner />}
        {mounted && process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
        {mounted && <PushPromptGate />}
      </AuthProvider>
    </PersistQueryClientProvider>
  );
}
