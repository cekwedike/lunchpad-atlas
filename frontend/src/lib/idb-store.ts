'use client';

/**
 * IndexedDB-backed async storage for React Query persistence.
 * Uses idb-keyval under the hood — all data lives in a single
 * "atlas-query-cache" object store in the browser's IndexedDB.
 */
import { get, set, del, createStore } from 'idb-keyval';

const store = typeof window !== 'undefined'
  ? createStore('atlas-db', 'query-cache')
  : undefined;

export const idbStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (!store) return null;
    try {
      return (await get<string>(key, store)) ?? null;
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (!store) return;
    try {
      await set(key, value, store);
    } catch {
      // Storage quota exceeded or private-browsing restriction — fail silently
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (!store) return;
    try {
      await del(key, store);
    } catch {
      // Ignore
    }
  },
};
