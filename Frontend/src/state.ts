import { create } from 'zustand';
import { Video } from './types';
import { sendLike } from './lib/feed';

type FeedState = {
  videos: Video[];
  index: number;
  loading: boolean;
  error: string | null;
  
  // Actions
  setVideos: (videos: Video[]) => void;
  appendVideos: (videos: Video[]) => void;
  setIndex: (index: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  toggleLike: (videoId: string) => void;
  bumpCommentCount: (videoId: string) => void;
};

export const useFeed = create<FeedState>((set, get) => ({
  videos: [],
  index: 0,
  loading: false,
  error: null,
  
  setVideos: (videos) => set({ videos }),
  
  appendVideos: (newVideos) => set((state) => ({
    videos: [...state.videos, ...newVideos]
  })),
  
  setIndex: (index) => set({ index }),
  
  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error }),
  
  toggleLike: (videoId) => {
    const state = get();
    const video = state.videos.find(v => v.id === videoId);
    if (!video) return;
    
    const wasLiked = video.meLiked;
    const newLikedState = !wasLiked;
    
    // Optimistic update
    set({
      videos: state.videos.map(v =>
        v.id === videoId ? {
          ...v,
          meLiked: newLikedState,
          stats: {
            ...v.stats,
            likes: v.stats.likes + (newLikedState ? 1 : -1)
          }
        } : v
      )
    });
    
    // Background API call
    sendLike(videoId, newLikedState).catch(() => {
      // Revert on failure
      const currentState = get();
      set({
        videos: currentState.videos.map(v =>
          v.id === videoId ? {
            ...v,
            meLiked: wasLiked,
            stats: {
              ...v.stats,
              likes: v.stats.likes + (wasLiked ? 1 : -1)
            }
          } : v
        )
      });
      console.warn('Failed to sync like action with server');
    });
  },
  
  bumpCommentCount: (videoId) => set((state) => ({
    videos: state.videos.map(v =>
      v.id === videoId ? {
        ...v,
        stats: {
          ...v.stats,
          comments: v.stats.comments + 1
        }
      } : v
    )
  }))
}));