import { create } from "zustand";
import { Video } from "./types";

type FeedState = {
  videos: Video[];
  index: number;
  setVideos(videos: Video[]): void;
  setIndex(index: number): void;
  toggleLike(id: string): void;
  bumpCommentCount(id: string): void;
};

export const useFeed = create<FeedState>((set) => ({
  videos: [],
  index: 0,
  
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
}));