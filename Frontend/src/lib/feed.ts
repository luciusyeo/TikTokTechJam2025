import { Video, Comment } from "../types";
import { supabase } from "./supabase";
import { getVideoLikeStatus } from "./ml";

// Mock delay to simulate network latency
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Cache for video file list to avoid repeated bucket calls
let videoFilesCache: any[] | null = null;
let totalVideoCount = 0;

export async function fetchFeed(startIndex = 0, count = 2): Promise<Video[]> {
  await delay(120); // Simulate network delay
  
  // Fetch video files from Supabase Storage (only once, then use cache)
  if (!videoFilesCache) {
    const { data: files, error } = await supabase.storage.from('videos').list();
    
    if (error) {
      console.error('Error fetching videos:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return [];
    }


    // Filter out non-video files and empty folder placeholders
    videoFilesCache = files?.filter(file => 
      file.name.match(/\.(mp4|mov|avi|mkv|webm|m4v)$/i) && 
      file.name !== '.emptyFolderPlaceholder'
    ) || [];

    totalVideoCount = videoFilesCache.length;
  }

  if (videoFilesCache.length === 0) {
    console.log('No videos found in bucket');
    return [];
  }

  // Return requested slice of videos
  const endIndex = Math.min(startIndex + count, videoFilesCache.length);
  const requestedFiles = videoFilesCache.slice(startIndex, endIndex);


  // Generate video objects with URLs and mock metadata
  const videosWithUrls: Video[] = await Promise.all(
    requestedFiles.map(async (file, index) => {
      const { data } = supabase.storage.from('videos').getPublicUrl(file.name);
      const actualIndex = startIndex + index;
      const videoId = `v_${actualIndex + 1}`;
      
      // Get actual like status from stored interactions instead of random
      const meLiked = await getVideoLikeStatus(videoId);
      
      return {
        id: videoId,
        src: data.publicUrl,
        caption: `Video ${actualIndex + 1} - ${file.name}`,
        author: { 
          id: `u_${actualIndex + 1}`, 
          name: `user${actualIndex + 1}`, 
          avatar: undefined 
        },
        stats: { 
          likes: Math.floor(Math.random() * 200) + 50, 
          comments: Math.floor(Math.random() * 30) + 5 
        },
        meLiked
      };
    })
  );


  return videosWithUrls;
}

// Helper function to get total video count without loading videos
export function getTotalVideoCount(): number {
  return totalVideoCount;
}

// Fetch specific videos by their IDs (for recommendations)
export async function fetchRecommendedFeed(recommendedVideoIds: string[]): Promise<Video[]> {
  await delay(120); // Simulate network delay
  
  // Get video data from Supabase by IDs
  const { data: videoData, error } = await supabase
    .from('videos')
    .select('id, url')
    .in('id', recommendedVideoIds);
    
  if (error) {
    console.error('Error fetching recommended videos from database:', error);
    throw new Error('Failed to fetch recommended videos');
  }

  if (!videoData || videoData.length === 0) {
    console.log('No recommended videos found in database');
    return [];
  }

  // Generate video objects with URLs and mock metadata
  const videosWithUrls: Video[] = await Promise.all(
    videoData.map(async (dbVideo) => {
      const videoId = dbVideo.id.toString();
      
      // Get actual like status from stored interactions
      const meLiked = await getVideoLikeStatus(videoId);
      
      return {
        id: videoId,
        src: dbVideo.url,
        caption: `Recommended Video ${dbVideo.id}`,
        author: { 
          id: `u_${dbVideo.id}`, 
          name: `user${dbVideo.id}`, 
          avatar: undefined 
        },
        stats: { 
          likes: Math.floor(Math.random() * 200) + 50, 
          comments: Math.floor(Math.random() * 30) + 5 
        },
        meLiked
      };
    })
  );

  return videosWithUrls;
}

export async function fetchComments(_videoId: string): Promise<Comment[]> {
  await delay(100);
  
  // Mock comments data
  const mockComments: Comment[] = [
    {
      id: "c1",
      user: { id: "u10", name: "emma", avatar: undefined },
      text: "This is amazing! 🔥",
      ts: Date.now() - 3600000 // 1 hour ago
    },
    {
      id: "c2", 
      user: { id: "u11", name: "david", avatar: undefined },
      text: "Love the creativity here!",
      ts: Date.now() - 7200000 // 2 hours ago
    },
    {
      id: "c3",
      user: { id: "u12", name: "lisa", avatar: undefined },
      text: "Can you share how you did this?",
      ts: Date.now() - 10800000 // 3 hours ago
    }
  ];

  return mockComments;
}

export async function sendLike(videoId: string, like: boolean): Promise<void> {
  await delay(50);
  // In real app, would make API call
  console.log(`Liked video ${videoId}:`, like);
}

export async function sendComment(videoId: string, text: string): Promise<Comment> {
  await delay(150);
  
  const newComment: Comment = {
    id: `c_${Math.random().toString(36).substring(2, 11)}`,
    user: { id: "me", name: "You", avatar: undefined },
    text,
    ts: Date.now()
  };

  console.log(`Comment on video ${videoId}:`, text);
  return newComment;
}