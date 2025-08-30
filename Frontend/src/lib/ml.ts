import AsyncStorage from '@react-native-async-storage/async-storage';
import * as tf from '@tensorflow/tfjs';
import { Video, VideoInteractions, VideoInteraction } from '../types';

// Storage keys
const VIDEO_INTERACTIONS_KEY = 'video_interactions';
const MODEL_WEIGHTS_KEY = 'ml_model_weights';
const COUNTER_KEY = 'count';
const VECTOR_ARRAYS_KEY = 'vector_arrays';

// In-memory cache for video interactions
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
    // Update in-memory cache - liking a video automatically marks it as viewed
    if (!videoInteractions[videoId]) {
      videoInteractions[videoId] = { viewed: false, liked: false };
    }
    
    videoInteractions[videoId].viewed = true; // Liking implies viewing
    videoInteractions[videoId].liked = isLiked;

    // Save to storage
    await AsyncStorage.setItem(VIDEO_INTERACTIONS_KEY, JSON.stringify(videoInteractions));
    
    console.log(`Recorded ${isLiked ? 'like' : 'unlike'} for video ${videoId} (also marked as viewed)`);
    
    // Check if we should trigger training
    const totalInteractions = Object.keys(videoInteractions).length;
    if (shouldTriggerTraining(totalInteractions)) {
      console.log(`Triggering model training after ${totalInteractions} interactions`);
      
      // Train in background without blocking UI
      setTimeout(() => {
        trainPersonalizedModel().catch(error => {
          console.error('Background training failed:', error);
        });
      }, 100);
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
    // Update in-memory cache - only mark as viewed if not already recorded
    if (!videoInteractions[videoId]) {
      videoInteractions[videoId] = { viewed: true, liked: false };
      
      // Save to storage
      await AsyncStorage.setItem(VIDEO_INTERACTIONS_KEY, JSON.stringify(videoInteractions));
      
      console.log(`Recorded view for video ${videoId}`);
    }
    // If already exists, no need to update since we don't want to overwrite like status
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

/**
 * Get all video interactions data for ML training
 */
export async function getAllInteractionsData(): Promise<VideoInteractions> {
  if (!isInitialized) {
    await initializeML();
  }

  return { ...videoInteractions };
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
export async function storeVectorArray(key: string, vectorArray: number[]): Promise<void> {
  try {
    const storageKey = `${VECTOR_ARRAYS_KEY}_${key}`;
    await AsyncStorage.setItem(storageKey, JSON.stringify(vectorArray));
    console.log(`Vector array stored with key: ${key}`);
  } catch (error) {
    console.error(`Failed to store vector array with key ${key}:`, error);
  }
}

/**
 * Get a stored vector array by key
 */
export async function getVectorArray(key: string): Promise<number[] | null> {
  try {
    const storageKey = `${VECTOR_ARRAYS_KEY}_${key}`;
    const saved = await AsyncStorage.getItem(storageKey);
    if (saved) {
      const vectorArray = JSON.parse(saved);
      console.log(`Vector array retrieved with key: ${key}`);
      return vectorArray;
    }
    return null;
  } catch (error) {
    console.error(`Failed to get vector array with key ${key}:`, error);
    return null;
  }
}

/**
 * Clear a stored vector array by key
 */
export async function clearVectorArray(key: string): Promise<void> {
  try {
    const storageKey = `${VECTOR_ARRAYS_KEY}_${key}`;
    await AsyncStorage.removeItem(storageKey);
    console.log(`Vector array cleared with key: ${key}`);
  } catch (error) {
    console.error(`Failed to clear vector array with key ${key}:`, error);
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

// ============================================================================
// TENSORFLOW.JS TRAINING PIPELINE
// ============================================================================

/**
 * Build binary MLP model for like prediction
 */
function buildBinaryMLP(inputDim: number): tf.Sequential {
  const model = tf.sequential();
  
  model.add(tf.layers.dense({inputShape: [inputDim], units: 64, activation: 'relu'}));
  model.add(tf.layers.dense({units: 64, activation: 'relu'}));
  model.add(tf.layers.dense({units: 1, activation: 'sigmoid'}));

  model.compile({
    optimizer: tf.train.sgd(0.01),
    loss: 'binaryCrossentropy',
    metrics: ['accuracy'],
  });

  return model;
}

/**
 * Prepare training data by concatenating video features with user embedding
 */
function prepareData(X_train: number[][], y_train: number[], userEmbedding: number[]) {
  // X_train: [numSamples, videoDim]
  // userEmbedding: [1, userDim]
  
  const userTile = tf.tile(tf.tensor([userEmbedding]), [X_train.length, 1]);
  const X_concat = tf.concat([tf.tensor(X_train), userTile], 1); // [numSamples, videoDim+userDim]
  const y = tf.tensor(y_train).reshape([y_train.length, 1]);

  return {X_concat, y};
}

/**
 * Train model on device with prepared data
 */
async function trainOnDevice(model: tf.Sequential, X_concat: tf.Tensor, y: tf.Tensor, epochs = 1): Promise<void> {
  await model.fit(X_concat, y, {
    epochs,
    batchSize: X_concat.shape[0], // or smaller batch if large
    shuffle: true,
    verbose: 0,
  });
}

/**
 * Extract model weights as JavaScript arrays
 */
function getModelWeights(model: tf.Sequential): any[] {
  return model.getWeights().map(w => w.arraySync());
}

/**
 * Save model weights to AsyncStorage
 */
async function saveModelWeights(weights: any[]): Promise<void> {
  try {
    await AsyncStorage.setItem(MODEL_WEIGHTS_KEY, JSON.stringify(weights));
    console.log('Model weights saved successfully');
  } catch (error) {
    console.error('Failed to save model weights:', error);
  }
}

/**
 * Load model weights from AsyncStorage
 */
async function loadModelWeights(): Promise<any[] | null> {
  try {
    const saved = await AsyncStorage.getItem(MODEL_WEIGHTS_KEY);
    if (saved) {
      const weights = JSON.parse(saved);
      console.log('Model weights loaded successfully');
      return weights;
    }
    return null;
  } catch (error) {
    console.error('Failed to load model weights:', error);
    return null;
  }
}

/**
 * Clear saved model weights
 */
async function clearModelWeights(): Promise<void> {
  try {
    await AsyncStorage.removeItem(MODEL_WEIGHTS_KEY);
    console.log('Model weights cleared successfully');
  } catch (error) {
    console.error('Failed to clear model weights:', error);
  }
}

// ============================================================================
// FEATURE EXTRACTION
// ============================================================================

/**
 * Extract numerical features from video metadata
 */
function extractVideoFeatures(video: Video): number[] {
  return [
    Math.log(video.stats.likes + 1) / 10,      // Log-normalized likes (0-1 range)
    Math.log(video.stats.comments + 1) / 5,   // Log-normalized comments (0-2 range) 
    Math.min(video.caption.length / 100, 1),  // Caption length (0-1 range, capped)
    Math.min(video.author.name.length / 20, 1), // Author name length (0-1 range, capped)
  ];
}

/**
 * Generate user embedding from like history
 */
function generateUserEmbedding(likedVideoIds: string[], allVideos: Video[]): number[] {
  const likedVideos = allVideos.filter(v => likedVideoIds.includes(v.id));
  
  if (likedVideos.length === 0) {
    // Default embedding for new users
    return [0, 0, 0];
  }
  
  const avgLikes = likedVideos.reduce((sum, v) => sum + v.stats.likes, 0) / likedVideos.length;
  const avgComments = likedVideos.reduce((sum, v) => sum + v.stats.comments, 0) / likedVideos.length;
  const likeRatio = likedVideos.length / allVideos.length;
  
  return [
    Math.log(avgLikes + 1) / 10,    // User's preference for popular content
    Math.log(avgComments + 1) / 5,  // User's preference for engaging content  
    Math.min(likeRatio, 1),         // User's overall activity level (0-1 range)
  ];
}

/**
 * Get video metadata for training (temporary helper function)
 * TODO: Replace with actual video database queries in production
 */
async function getVideosForTraining(videoIds: string[]): Promise<Video[]> {
  // Generate mock video metadata based on video IDs
  // In production, this would fetch from your video database/API
  return videoIds.map(id => {
    const idNum = parseInt(id.replace(/\D/g, '')) || Math.floor(Math.random() * 1000);
    
    return {
      id,
      src: `https://example.com/video_${id}`,
      caption: `Video content ${id} - ${['Amazing content!', 'Check this out', 'So cool!', 'Incredible video'][idNum % 4]}`,
      author: { 
        id: `author_${idNum % 10}`, 
        name: `user${idNum % 100}`,
        avatar: undefined 
      },
      stats: { 
        likes: Math.floor(Math.random() * 500) + 50,     // 50-550 likes
        comments: Math.floor(Math.random() * 100) + 5    // 5-105 comments
      },
      meLiked: false
    };
  });
}

// ============================================================================
// MAIN TRAINING PIPELINE
// ============================================================================

/**
 * Train personalized model on device using collected like data
 */
export async function trainPersonalizedModel(): Promise<void> {
  try {
    console.log('Starting personalized model training...');
    
    // Get training data
    const likesData = await getAllLikesData();
    const allVideoIds = Object.keys(likesData);
    
    // Check if we have enough training data
    if (allVideoIds.length < 5) {
      console.log('Not enough training data (need at least 5 interactions). Current:', allVideoIds.length);
      return;
    }
    
    // Get video metadata for training
    const videos = await getVideosForTraining(allVideoIds);
    console.log(`Training on ${videos.length} videos`);
    
    // Prepare features and labels
    const X_train = videos.map(extractVideoFeatures);
    const y_train = videos.map(video => likesData[video.id] ? 1 : 0);
    const likedVideoIds = await getLikedVideos();
    const userEmbedding = generateUserEmbedding(likedVideoIds, videos);
    
    console.log('Feature dimensions:', {
      videoFeatures: X_train[0].length,
      userEmbedding: userEmbedding.length,
      totalInput: X_train[0].length + userEmbedding.length
    });
    
    // Build and train model
    const inputDim = X_train[0].length + userEmbedding.length;
    const model = buildBinaryMLP(inputDim);
    
    const {X_concat, y} = prepareData(X_train, y_train, userEmbedding);
    
    console.log('Training model with data shape:', X_concat.shape, y.shape);
    await trainOnDevice(model, X_concat, y, 1);
    
    // Save model weights for federated learning
    const weights = getModelWeights(model);
    await saveModelWeights(weights);
    
    // Cleanup tensors to prevent memory leaks
    X_concat.dispose();
    y.dispose();
    model.dispose();
    
    console.log('Model training completed successfully');
    
  } catch (error) {
    console.error('Training failed:', error);
  }
}

/**
 * Check if model training should be triggered
 */
function shouldTriggerTraining(totalInteractions: number): boolean {
  // Train after every 10 likes, starting from 10
  return totalInteractions >= 10 && totalInteractions % 10 === 0;
}