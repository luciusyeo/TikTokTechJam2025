import { Video, Comment } from "../types";
import { supabase } from "./supabase";

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

    console.log('Raw files from bucket:', files);
    console.log('Number of files found:', files?.length || 0);

    // Filter out non-video files and empty folder placeholders
    videoFilesCache = files?.filter(file => 
      file.name.match(/\.(mp4|mov|avi|mkv|webm|m4v)$/i) && 
      file.name !== '.emptyFolderPlaceholder'
    ) || [];

    totalVideoCount = videoFilesCache.length;
    console.log('Filtered video files:', videoFilesCache);
    console.log('Total video count:', totalVideoCount);
  }

  if (videoFilesCache.length === 0) {
    console.log('No videos found in bucket');
    return [];
  }

  // Return requested slice of videos
  const endIndex = Math.min(startIndex + count, videoFilesCache.length);
  const requestedFiles = videoFilesCache.slice(startIndex, endIndex);

  console.log(`Loading videos ${startIndex} to ${endIndex - 1} (${requestedFiles.length} videos)`);

  // Generate video objects with URLs and mock metadata
  const videosWithUrls: Video[] = requestedFiles.map((file, index) => {
    const { data } = supabase.storage.from('videos').getPublicUrl(file.name);
    const actualIndex = startIndex + index;
    
    return {
      id: `v_${actualIndex + 1}`,
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
      meLiked: Math.random() > 0.7
    };
  });

  return videosWithUrls;
}

// Helper function to get total video count without loading videos
export function getTotalVideoCount(): number {
  return totalVideoCount;
}

export async function fetchComments(videoId: string): Promise<Comment[]> {
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
    id: `c_${Math.random().toString(36).substr(2, 9)}`,
    user: { id: "me", name: "You", avatar: undefined },
    text,
    ts: Date.now()
  };

  console.log(`Comment on video ${videoId}:`, text);
  return newComment;
}