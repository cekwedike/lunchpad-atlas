import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ResourceProgress {
  resourceId: string;
  progress: number;
  lastPosition?: number;
  completedAt?: Date;
}

interface ResourceState {
  bookmarks: string[];
  recentlyViewed: string[];
  progress: Record<string, ResourceProgress>;
  addBookmark: (resourceId: string) => void;
  removeBookmark: (resourceId: string) => void;
  toggleBookmark: (resourceId: string) => void;
  isBookmarked: (resourceId: string) => boolean;
  addToRecentlyViewed: (resourceId: string) => void;
  updateProgress: (resourceId: string, progress: Partial<ResourceProgress>) => void;
  getProgress: (resourceId: string) => ResourceProgress | undefined;
  clearProgress: (resourceId: string) => void;
}

export const useResourceStore = create<ResourceState>()(
  persist(
    (set, get) => ({
      bookmarks: [],
      recentlyViewed: [],
      progress: {},
      
      addBookmark: (resourceId) =>
        set((state) => ({
          bookmarks: state.bookmarks.includes(resourceId)
            ? state.bookmarks
            : [...state.bookmarks, resourceId],
        })),
      
      removeBookmark: (resourceId) =>
        set((state) => ({
          bookmarks: state.bookmarks.filter((id) => id !== resourceId),
        })),
      
      toggleBookmark: (resourceId) => {
        const { bookmarks } = get();
        if (bookmarks.includes(resourceId)) {
          get().removeBookmark(resourceId);
        } else {
          get().addBookmark(resourceId);
        }
      },
      
      isBookmarked: (resourceId) => get().bookmarks.includes(resourceId),
      
      addToRecentlyViewed: (resourceId) =>
        set((state) => {
          const filtered = state.recentlyViewed.filter((id) => id !== resourceId);
          return {
            recentlyViewed: [resourceId, ...filtered].slice(0, 10), // Keep last 10
          };
        }),
      
      updateProgress: (resourceId, progressUpdate) =>
        set((state) => ({
          progress: {
            ...state.progress,
            [resourceId]: {
              ...state.progress[resourceId],
              resourceId,
              ...progressUpdate,
              progress: progressUpdate.progress ?? state.progress[resourceId]?.progress ?? 0,
            },
          },
        })),
      
      getProgress: (resourceId) => get().progress[resourceId],
      
      clearProgress: (resourceId) =>
        set((state) => {
          const { [resourceId]: _, ...rest } = state.progress;
          return { progress: rest };
        }),
    }),
    {
      name: 'resource-storage',
      storage: createJSONStorage(() => 
        typeof window !== 'undefined' ? localStorage : {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        }
      ),
    }
  )
);
