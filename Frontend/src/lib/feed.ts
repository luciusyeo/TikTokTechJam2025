import { Video, Comment } from "../types";

// Mock delay to simulate network latency
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function fetchFeed(page = 0): Promise<Video[]> {
  await delay(120); // Simulate network delay
  
  // Mock video data - will use placeholder until we add real video files
  const mockVideos: Video[] = [
    {
      id: "v1",
      src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      caption: "Beautiful city walk at sunset 🌅",
      author: { id: "u1", name: "marcus", avatar: undefined },
      stats: { likes: 120, comments: 18 },
      meLiked: false
    },
    {
      id: "v2", 
      src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
      caption: "Amazing street art discovery! 🎨",
      author: { id: "u2", name: "sarah", avatar: undefined },
      stats: { likes: 85, comments: 12 },
      meLiked: true
    },
    {
      id: "v3",
      src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", 
      caption: "Coffee shop vibes ☕️",
      author: { id: "u3", name: "alex", avatar: undefined },
      stats: { likes: 203, comments: 45 },
      meLiked: false
    },
    {
      id: "v4",
      src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
      caption: "Dance practice session 💃",
      author: { id: "u4", name: "jessica", avatar: undefined },
      stats: { likes: 156, comments: 29 },
      meLiked: false
    },
    {
      id: "v5",
      src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
      caption: "Cooking experiment gone right! 👨‍🍳",
      author: { id: "u5", name: "mike", avatar: undefined },
      stats: { likes: 92, comments: 8 },
      meLiked: true
    }
  ];

  // Return slice based on page (5 videos per page)
  const startIndex = page * 5;
  return mockVideos.slice(startIndex, startIndex + 5);
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