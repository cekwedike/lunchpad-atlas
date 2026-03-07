import { QueryClient, DefaultOptions } from '@tanstack/react-query';

const queryConfig: DefaultOptions = {
  queries: {
    staleTime: 5 * 60 * 1000,    // 5 minutes — serve cached data without refetching
    gcTime: 24 * 60 * 60 * 1000, // 24 hours — keep in memory (and persist to IndexedDB)
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 1,
  },
  mutations: {
    retry: 0,
  },
};

export const queryClient = new QueryClient({ defaultOptions: queryConfig });

/** How long the persisted cache is considered valid (24 hours). */
export const PERSIST_MAX_AGE = 24 * 60 * 60 * 1000;
