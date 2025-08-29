import { Video, Comment, User } from '../types';

// Mock users data
const mockUsers: User[] = [
  { id: '1', name: 'alex_dancer', avatar: 'https://i.pravatar.cc/150?img=1' },
  { id: '2', name: 'creative_sarah', avatar: 'https://i.pravatar.cc/150?img=2' },
  { id: '3', name: 'mike_fitness', avatar: 'https://i.pravatar.cc/150?img=3' },
  { id: '4', name: 'artist_luna', avatar: 'https://i.pravatar.cc/150?img=4' },
  { id: '5', name: 'chef_marco', avatar: 'https://i.pravatar.cc/150?img=5' },
  { id: '6', name: 'travel_jenny', avatar: 'https://i.pravatar.cc/150?img=6' },
];

// Mock video data - using placeholder videos for now
const mockVideos: Video[] = [
  {
    id: '1',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    caption: 'Check out this amazing dance routine! 💃✨ #dance #viral',
    author: mockUsers[0],
    stats: { likes: 1240, comments: 89 },
    meLiked: false,
  },
  {
    id: '2',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    caption: 'Creative process behind my latest artwork 🎨 What do you think?',
    author: mockUsers[1],
    stats: { likes: 2156, comments: 143 },
    meLiked: true,
  },
  {
    id: '3',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    caption: 'Morning workout motivation 💪 Who\'s joining me today? #fitness',
    author: mockUsers[2],
    stats: { likes: 892, comments: 56 },
    meLiked: false,
  },
  {
    id: '4',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    caption: 'Sunset vibes from Bali 🌅 Can\'t believe this view is real!',
    author: mockUsers[5],
    stats: { likes: 3421, comments: 278 },
    meLiked: false,
  },
  {
    id: '5',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    caption: '5-minute pasta recipe that will change your life 🍝 #cooking',
    author: mockUsers[4],
    stats: { likes: 1876, comments: 234 },
    meLiked: true,
  },
  {
    id: '6',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    caption: 'Digital art time-lapse ✨ 3 hours condensed into 30 seconds',
    author: mockUsers[3],
    stats: { likes: 967, comments: 92 },
    meLiked: false,
  },
];

// Mock comments data
const mockComments: { [videoId: string]: Comment[] } = {
  '1': [
    { id: 'c1', user: mockUsers[1], text: 'This is incredible! 🔥', ts: Date.now() - 3600000 },
    { id: 'c2', user: mockUsers[2], text: 'Teach me your moves!', ts: Date.now() - 1800000 },
    { id: 'c3', user: mockUsers[3], text: 'So smooth! 💯', ts: Date.now() - 900000 },
  ],
  '2': [
    { id: 'c4', user: mockUsers[0], text: 'Love the colors!', ts: Date.now() - 7200000 },
    { id: 'c5', user: mockUsers[4], text: 'Amazing technique', ts: Date.now() - 3600000 },
  ],
  '3': [
    { id: 'c6', user: mockUsers[1], text: 'Motivation right here! 💪', ts: Date.now() - 5400000 },
  ],
  '4': [
    { id: 'c7', user: mockUsers[2], text: 'Bucket list destination!', ts: Date.now() - 1800000 },
    { id: 'c8', user: mockUsers[0], text: 'When are we going? 😍', ts: Date.now() - 900000 },
  ],
  '5': [
    { id: 'c9', user: mockUsers[3], text: 'Making this tonight!', ts: Date.now() - 2700000 },
    { id: 'c10', user: mockUsers[1], text: 'Recipe please! 🙏', ts: Date.now() - 1800000 },
  ],
  '6': [
    { id: 'c11', user: mockUsers[0], text: 'Talent! 🎨', ts: Date.now() - 3600000 },
  ],
};

/**
 * Fetches a page of videos from the feed
 * @param page - Page number (0-based)
 * @returns Promise resolving to array of videos
 */
export async function fetchFeed(page = 0): Promise<Video[]> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));
  
  const pageSize = 6;
  const start = page * pageSize;
  
  // For demo, cycle through mock videos
  const cycledVideos = [];
  for (let i = 0; i < pageSize; i++) {
    const videoIndex = (start + i) % mockVideos.length;
    const video = mockVideos[videoIndex];
    // Create unique IDs for pagination
    cycledVideos.push({
      ...video,
      id: `${video.id}-p${page}-${i}`,
    });
  }
  
  return cycledVideos;
}

/**
 * Fetches comments for a specific video
 * @param videoId - ID of the video
 * @returns Promise resolving to array of comments
 */
export async function fetchComments(videoId: string): Promise<Comment[]> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 100));
  
  // Extract base video ID (remove pagination suffix)
  const baseId = videoId.split('-')[0];
  return mockComments[baseId] || [];
}

/**
 * Sends a like/unlike action for a video
 * @param videoId - ID of the video
 * @param like - Whether to like (true) or unlike (false)
 * @returns Promise that resolves when action is complete
 */
export async function sendLike(videoId: string, like: boolean): Promise<void> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 50));
  
  // In a real app, this would update the backend
  console.log(`${like ? 'Liked' : 'Unliked'} video ${videoId}`);
  
  // Simulate occasional network failure for testing
  if (Math.random() < 0.1) {
    throw new Error('Network error - like action failed');
  }
}

/**
 * Sends a new comment for a video
 * @param videoId - ID of the video
 * @param text - Comment text
 * @returns Promise resolving to the created comment
 */
export async function sendComment(videoId: string, text: string): Promise<Comment> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 100));
  
  // Create mock comment
  const newComment: Comment = {
    id: `c${Date.now()}`,
    user: { id: 'current-user', name: 'You', avatar: 'https://i.pravatar.cc/150?img=99' },
    text: text,
    ts: Date.now(),
  };
  
  // In a real app, this would save to backend
  console.log(`Added comment to video ${videoId}:`, text);
  
  // Simulate occasional network failure for testing
  if (Math.random() < 0.05) {
    throw new Error('Network error - comment failed to send');
  }
  
  return newComment;
}