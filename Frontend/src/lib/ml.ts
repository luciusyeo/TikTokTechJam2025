import AsyncStorage from '@react-native-async-storage/async-storage';
import { VideoInteractions } from '../types';
import { maybeTrainLocalModel } from "../../utils/trainModel"
import { buildUserVector } from "../../utils/vectorUtils"

// Storage keys
const VIDEO_INTERACTIONS_KEY = 'video_interactions';
const COUNTER_KEY = 'count';
const VECTOR_ARRAYS_KEY = 'vector_arrays';

let videoInteractions: VideoInteractions = {};
let isInitialized = false;

/**
 * Initialize the video interaction storage system
 */
export async function initializeML(): Promise<void> {
  if (isInitialized) return;

  try {
    const savedInteractions = await AsyncStorage.getItem(VIDEO_INTERACTIONS_KEY);
    
    if (savedInteractions) {
      videoInteractions = JSON.parse(savedInteractions);
      console.log(`Loaded ${Object.keys(videoInteractions).length} video interactions from storage`);
    } else {
      videoInteractions = {};
    }

    isInitialized = true;
    console.log('Video interaction storage system initialized successfully');
  } catch (error) {
    console.error('Failed to initialize video interaction storage system:', error);
    videoInteractions = {};
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
    if (!videoInteractions[videoId]) {
      videoInteractions[videoId] = { viewed: false, liked: false };
    }
    
    videoInteractions[videoId].viewed = true; // Liking implies viewing
    videoInteractions[videoId].liked = isLiked;

    // Save to storage
    await AsyncStorage.setItem(VIDEO_INTERACTIONS_KEY, JSON.stringify(videoInteractions));
    
    console.log(`Recorded ${isLiked ? 'like' : 'unlike'} for video ${videoId} (also marked as viewed)`);
    
    // Call functions based on like/dislike action
    if (isLiked) {
      await maybeTrainLocalModel();
      await buildUserVector();
    } else {
      await maybeTrainLocalModel();
    }
    
  } catch (error) {
    console.error('Failed to record like:', error);
  }
}

/**
 * Record that a video was viewed (without liking/unliking)
 */
export async function recordViewed(videoId: string): Promise<void> {
  if (!isInitialized) {
    await initializeML();
  }

  try {
    if (!videoInteractions[videoId]) {
      videoInteractions[videoId] = { viewed: true, liked: false };
      
      // Save to storage
      await AsyncStorage.setItem(VIDEO_INTERACTIONS_KEY, JSON.stringify(videoInteractions));
      
      console.log(`Recorded view for video ${videoId}`);
    }
  } catch (error) {
    console.error('Failed to record view:', error);
  }
}

/**
 * Get like status for a specific video
 */
export async function getVideoLikeStatus(videoId: string): Promise<boolean> {
  if (!isInitialized) {
    await initializeML();
  }

  return videoInteractions[videoId]?.liked || false;
}

/**
 * Get all liked video IDs
 */
export async function getLikedVideos(): Promise<string[]> {
  if (!isInitialized) {
    await initializeML();
  }

  return Object.keys(videoInteractions).filter(videoId => videoInteractions[videoId].liked);
}

/**
 * Get all viewed video IDs
 */
export async function getViewedVideos(): Promise<string[]> {
  if (!isInitialized) {
    await initializeML();
  }

  return Object.keys(videoInteractions).filter(videoId => videoInteractions[videoId].viewed);
}

export interface Interaction {
  videoId: string;
  liked: boolean;
}

/**
 * Get all video interactions data for ML training
 */
export async function getAllInteractionsData(): Promise<Interaction[]> {
  if (!isInitialized) {
    await initializeML();
  }

  // Convert your object to an array
  // If videoInteractions is like { videoId1: { liked: true }, videoId2: { liked: false } }
  // we need to transform it into an array
  const interactions: Interaction[] = Object.entries(videoInteractions).map(
    ([videoId, data]) => ({
      videoId,
      liked: data.liked,
    })
  );

  return interactions;
}

/**
 * Get all video likes data for ML training
 */
export async function getAllLikesData(): Promise<{[videoId: string]: boolean}> {
  if (!isInitialized) {
    await initializeML();
  }

  const likesData: {[videoId: string]: boolean} = {};
  for (const [videoId, interaction] of Object.entries(videoInteractions)) {
    likesData[videoId] = interaction.liked;
  }
  
  return likesData;
}

/**
 * Get interaction statistics
 */
export async function getInteractionStats(): Promise<{ 
  totalVideos: number; 
  viewedVideos: number; 
  likedVideos: number; 
  viewRate: number;
  likeRate: number; 
}> {
  if (!isInitialized) {
    await initializeML();
  }

  const totalVideos = Object.keys(videoInteractions).length;
  const viewedVideos = Object.values(videoInteractions).filter(interaction => interaction.viewed).length;
  const likedVideos = Object.values(videoInteractions).filter(interaction => interaction.liked).length;
  const viewRate = totalVideos > 0 ? viewedVideos / totalVideos : 0;
  const likeRate = totalVideos > 0 ? likedVideos / totalVideos : 0;

  return {
    totalVideos,
    viewedVideos,
    likedVideos,
    viewRate,
    likeRate
  };
}

/**
 * Get like statistics 
 */
export async function getLikeStats(): Promise<{ totalVideos: number; likedVideos: number; likeRate: number }> {
  const stats = await getInteractionStats();
  
  return {
    totalVideos: stats.totalVideos,
    likedVideos: stats.likedVideos,
    likeRate: stats.likeRate
  };
}

/**
 * Reset all interaction data (for testing/debugging)
 */
export async function resetMLData(): Promise<void> {
  try {
    await AsyncStorage.removeItem(VIDEO_INTERACTIONS_KEY);
    videoInteractions = {};
    isInitialized = false;
    console.log('Video interaction data reset successfully');
  } catch (error) {
    console.error('Failed to reset interaction data:', error);
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

// ============================================================================
// VECTOR ARRAY STORAGE FUNCTIONS
// ============================================================================

/**
 * Store a vector array with a given key
 */
export async function storeVectorArray(vectorArray: number[]): Promise<void> {
  try {
    const storageKey = `${VECTOR_ARRAYS_KEY}`;
    await AsyncStorage.setItem(storageKey, JSON.stringify(vectorArray));
    console.log(`Vector array stored with key: ${VECTOR_ARRAYS_KEY}`);
  } catch (error) {
    console.error(`Failed to store vector array with key ${VECTOR_ARRAYS_KEY}:`, error);
  }
}

/**
 * Get a stored vector array by key
 */
export async function getVectorArray(): Promise<number[] | null> {
  try {
    const storageKey = `${VECTOR_ARRAYS_KEY}`;
    const saved = await AsyncStorage.getItem(storageKey);
    if (saved) {
      const vectorArray = JSON.parse(saved);
      console.log(`Vector array retrieved with key: ${VECTOR_ARRAYS_KEY}`);
      return vectorArray;
    }
    return null;
  } catch (error) {
    console.error(`Failed to get vector array with key ${VECTOR_ARRAYS_KEY}:`, error);
    return null;
  }
}

/**
 * Clear a stored vector array by key
 */
export async function clearVectorArray(): Promise<void> {
  try {
    const storageKey = `${VECTOR_ARRAYS_KEY}`;
    await AsyncStorage.removeItem(storageKey);
    console.log(`Vector array cleared with key: ${VECTOR_ARRAYS_KEY}`);
  } catch (error) {
    console.error(`Failed to clear vector array with key ${VECTOR_ARRAYS_KEY}:`, error);
  }
}

// ============================================================================
// SIMPLE COUNTER FUNCTIONS
// ============================================================================

/**
 * Get current counter value
 */
export async function getCounter(): Promise<number> {
  try {
    const saved = await AsyncStorage.getItem(COUNTER_KEY);
    return saved ? parseInt(saved) : 0;
  } catch (error) {
    console.error('Failed to get counter:', error);
    return 0;
  }
}

/**
 * Increment counter by 1 and return new value
 */
export async function incrementCounter(): Promise<number> {
  try {
    const currentCount = await getCounter();
    const newCount = currentCount + 1;
    await AsyncStorage.setItem(COUNTER_KEY, newCount.toString());
    console.log(`Counter incremented to ${newCount}`);
    return newCount;
  } catch (error) {
    console.error('Failed to increment counter:', error);
    return 0;
  }
}

/**
 * Reset counter to 0
 */
export async function resetCounter(): Promise<void> {
  try {
    await AsyncStorage.setItem(COUNTER_KEY, '0');
    console.log('Counter reset to 0');
  } catch (error) {
    console.error('Failed to reset counter:', error);
  }
}