import { create } from "zustand";
import { Video, Comment } from "./types";
import { buildUserVector } from "../utils/vectorUtils";

type FeedState = {
  videos: Video[];
  index: number;
  commentsCache: Record<string, Comment[]>;
  isCommentsOpen: boolean;
  currentVideoId: string | null;
  currentUserVector: number[] | null;
  isUpdatingVector: boolean;
  setVideos(videos: Video[]): void;
  setIndex(index: number): void;
  toggleLike(id: string): void;
  bumpCommentCount(id: string): void;
  setComments(videoId: string, comments: Comment[]): void;
  addComment(videoId: string, comment: Comment): void;
  openComments(videoId: string): void;
  closeComments(): void;
  setCurrentUserVector(vector: number[]): void;
  updateUserVectorAfterLike(): Promise<void>;
};

export const useFeed = create<FeedState>((set) => ({
  videos: [],
  index: 0,
  commentsCache: {},
  isCommentsOpen: false,
  currentVideoId: null,
  currentUserVector: null,
  isUpdatingVector: false,
  
  setVideos: (videos) => set({ videos }),
  
  setIndex: (index) => set({ index }),
  
  toggleLike: (id) => set((state) => ({
    videos: state.videos.map((video) =>
      video.id === id
        ? {
            ...video,
            meLiked: !video.meLiked,
            stats: {
              ...video.stats,
              likes: video.stats.likes + (video.meLiked ? -1 : 1),
            },
          }
        : video
    ),
  })),
  
  bumpCommentCount: (id) => set((state) => ({
    videos: state.videos.map((video) =>
      video.id === id
        ? {
            ...video,
            stats: {
              ...video.stats,
              comments: video.stats.comments + 1,
            },
          }
        : video
    ),
  })),
  
  setComments: (videoId, comments) => set((state) => ({
    commentsCache: {
      ...state.commentsCache,
      [videoId]: comments,
    },
  })),
  
  addComment: (videoId, comment) => set((state) => ({
    commentsCache: {
      ...state.commentsCache,
      [videoId]: [comment, ...(state.commentsCache[videoId] || [])],
    },
  })),
  
  openComments: (videoId) => set({
    isCommentsOpen: true,
    currentVideoId: videoId,
  }),
  
  closeComments: () => set({
    isCommentsOpen: false,
    currentVideoId: null,
  }),
  
  setCurrentUserVector: (vector) => set({ currentUserVector: vector }),
  
  updateUserVectorAfterLike: async () => {
    const state = useFeed.getState();
    if (state.isUpdatingVector) {
      console.log('User vector update already in progress, skipping...');
      return;
    }
    
    try {
      set({ isUpdatingVector: true });
      console.log('Rebuilding user vector after like/dislike...');
      const newUserVector = await buildUserVector();
      set({ currentUserVector: newUserVector, isUpdatingVector: false });
      console.log('User vector updated in state');
    } catch (error) {
      console.error('Failed to update user vector after like:', error);
      set({ isUpdatingVector: false });
    }
  },
}));

