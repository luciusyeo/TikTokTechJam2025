import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage key for video likes
const VIDEO_LIKES_KEY = 'video_likes';

// Type for storing likes
interface VideoLikes {
  [videoId: string]: boolean; // true = liked, false = not liked
}

// In-memory cache for likes
let videoLikes: VideoLikes = {};
let isInitialized = false;

/**
 * Initialize the like storage system
 */
export async function initializeML(): Promise<void> {
  if (isInitialized) return;

  try {
    // Load saved likes from storage
    const savedLikes = await AsyncStorage.getItem(VIDEO_LIKES_KEY);
    
    if (savedLikes) {
      videoLikes = JSON.parse(savedLikes);
      console.log(`Loaded ${Object.keys(videoLikes).length} video likes from storage`);
    } else {
      videoLikes = {};
    }

    isInitialized = true;
    console.log('Like storage system initialized successfully');
  } catch (error) {
    console.error('Failed to initialize like storage system:', error);
    videoLikes = {};
    isInitialized = true;
  }
}

/**
 * Record a like/unlike for a video
 */
export async function recordLike(videoId: string, isLiked: boolean): Promise<void> {
  if (!isInitialized) {
    await initializeML();
  }

  try {
    // Update in-memory cache
    videoLikes[videoId] = isLiked;

    // Save to storage
    await AsyncStorage.setItem(VIDEO_LIKES_KEY, JSON.stringify(videoLikes));
    
    console.log(`Recorded ${isLiked ? 'like' : 'unlike'} for video ${videoId}`);
  } catch (error) {
    console.error('Failed to record like:', error);
  }
}

/**
 * Get like status for a specific video
 */
export async function getVideoLikeStatus(videoId: string): Promise<boolean> {
  if (!isInitialized) {
    await initializeML();
  }

  return videoLikes[videoId] || false;
}

/**
 * Get all liked video IDs
 */
export async function getLikedVideos(): Promise<string[]> {
  if (!isInitialized) {
    await initializeML();
  }

  return Object.keys(videoLikes).filter(videoId => videoLikes[videoId]);
}

/**
 * Get all video likes data for ML training
 */
export async function getAllLikesData(): Promise<VideoLikes> {
  if (!isInitialized) {
    await initializeML();
  }

  return { ...videoLikes };
}

/**
 * Get like statistics
 */
export async function getLikeStats(): Promise<{ totalVideos: number; likedVideos: number; likeRate: number }> {
  if (!isInitialized) {
    await initializeML();
  }

  const totalVideos = Object.keys(videoLikes).length;
  const likedVideos = Object.values(videoLikes).filter(liked => liked).length;
  const likeRate = totalVideos > 0 ? likedVideos / totalVideos : 0;

  return {
    totalVideos,
    likedVideos,
    likeRate
  };
}

/**
 * Reset all like data (for testing/debugging)
 */
export async function resetMLData(): Promise<void> {
  try {
    await AsyncStorage.removeItem(VIDEO_LIKES_KEY);
    videoLikes = {};
    isInitialized = false;
    console.log('Like data reset successfully');
  } catch (error) {
    console.error('Failed to reset like data:', error);
  }
}

// Legacy function for backward compatibility - now just records likes
export async function recordInteraction(interaction: { videoId: string; action: string; value: number; timestamp: number }): Promise<void> {
  if (interaction.action === 'like') {
    await recordLike(interaction.videoId, true);
  } else if (interaction.action === 'unlike') {
    await recordLike(interaction.videoId, false);
  }
  // Ignore all other interaction types
}