import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { UserEmbedding, VideoInteraction, MLModelState } from '../types';

// Global ML state
let mlModel: tf.Sequential | null = null;
let isInitialized = false;
let userEmbedding: UserEmbedding | null = null;
const interactionHistory: VideoInteraction[] = [];

// Storage keys
const MODEL_VERSION = '1.0.0';
const MODEL_WEIGHTS_KEY = 'ml_model_weights';
const USER_EMBEDDING_KEY = 'user_embedding';
const INTERACTION_HISTORY_KEY = 'interaction_history';

/**
 * Build a binary MLP model for user preference prediction
 */
export function buildBinaryMLP(inputDim: number): tf.Sequential {
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
export function prepareData(X_train: number[][], y_train: number[], userEmbedding: number[]) {
  // X_train: [numSamples, videoDim]
  // userEmbedding: [1, userDim]
  
  const userTile = tf.tile(tf.tensor(userEmbedding), [X_train.length, 1]);
  const X_concat = tf.concat([tf.tensor(X_train), userTile], 1); // [numSamples, videoDim+userDim]
  const y = tf.tensor(y_train).reshape([y_train.length, 1]);

  return {X_concat, y};
}

/**
 * Train model on device with user interaction data
 */
export async function trainOnDevice(model: tf.Sequential, X_concat: tf.Tensor, y: tf.Tensor, epochs = 1): Promise<void> {
  await model.fit(X_concat, y, {
    epochs,
    batchSize: X_concat.shape[0], // or smaller batch if large
    shuffle: true,
    verbose: 0,
  });
}

/**
 * Extract model weights for federated learning
 */
export function getModelWeights(model: tf.Sequential): any[] {
  return model.getWeights().map(w => w.arraySync());
}

/**
 * Initialize TensorFlow.js and load saved model/user data
 */
export async function initializeML(): Promise<void> {
  if (isInitialized) return;

  try {
    // Wait for TensorFlow.js to be ready (this automatically sets up the platform)
    await tf.ready();
    console.log('TensorFlow.js initialized');

    // Load saved model weights if available
    const savedModelData = await AsyncStorage.getItem(MODEL_WEIGHTS_KEY);
    const savedUserEmbedding = await AsyncStorage.getItem(USER_EMBEDDING_KEY);
    const savedInteractions = await AsyncStorage.getItem(INTERACTION_HISTORY_KEY);

    // Initialize user embedding (default to random if new user)
    if (savedUserEmbedding) {
      userEmbedding = JSON.parse(savedUserEmbedding);
    } else {
      userEmbedding = {
        vector: Array(32).fill(0).map(() => Math.random() * 0.1 - 0.05), // Small random values
        lastUpdated: Date.now()
      };
    }

    // Load interaction history
    if (savedInteractions) {
      const interactions = JSON.parse(savedInteractions);
      interactionHistory.push(...interactions.slice(-100)); // Keep last 100 interactions
    }

    // Build model (assuming video features = 64 dim, user embedding = 32 dim)
    const inputDim = 64 + 32; // videoDim + userDim
    mlModel = buildBinaryMLP(inputDim);

    // Load saved weights if available and version matches
    if (savedModelData) {
      try {
        const { version, weights } = JSON.parse(savedModelData);
        if (version === MODEL_VERSION) {
          const tensors = weights.map((w: any) => tf.tensor(w));
          mlModel.setWeights(tensors);
          console.log('Loaded saved model weights');
        } else {
          console.log('Model version mismatch, using fresh model.');
        }
      } catch (error) {
        console.warn('Failed to load saved weights, using fresh model:', error);
      }
    }

    isInitialized = true;
    console.log('ML system initialized successfully');
  } catch (error) {
    console.error('Failed to initialize ML system:', error);
  }
}

/**
 * Record user interaction for training
 */
export async function recordInteraction(interaction: VideoInteraction): Promise<void> {
  if (!isInitialized) {
    await initializeML();
  }

  interactionHistory.push(interaction);

  // Keep only recent interactions (last 100)
  if (interactionHistory.length > 100) {
    interactionHistory.splice(0, interactionHistory.length - 100);
  }

  // Save to storage
  await AsyncStorage.setItem(INTERACTION_HISTORY_KEY, JSON.stringify(interactionHistory));

  // Trigger training if we have enough data
  if (interactionHistory.length >= 5 && mlModel && userEmbedding) {
    await trainOnUserInteractions();
  }
}

/**
 * Train model based on accumulated user interactions
 */
export async function trainOnUserInteractions(): Promise<void> {
  if (!mlModel || !userEmbedding || interactionHistory.length === 0) return;

  try {
    // Filter interactions that have video features and are training-worthy
    const trainingData = interactionHistory.filter(interaction => 
      interaction.videoFeatures && 
      ['swipe_up', 'swipe_down', 'like', 'unlike'].includes(interaction.action)
    ).slice(-20); // Use last 20 interactions for training

    if (trainingData.length < 2) return;

    // Prepare training data
    const X_train = trainingData.map(interaction => interaction.videoFeatures!);
    const y_train = trainingData.map(interaction => {
      // Convert actions to binary labels
      if (interaction.action === 'like' || interaction.action === 'swipe_up') return 1;
      if (interaction.action === 'unlike' || interaction.action === 'swipe_down') return 0;
      return interaction.value > 0 ? 1 : 0;
    });

    const {X_concat, y} = prepareData(X_train, y_train, userEmbedding.vector);

    // Train the model
    await trainOnDevice(mlModel, X_concat, y, 1);

    // Clean up tensors
    X_concat.dispose();
    y.dispose();

    // Save updated model weights with version
    const weights = getModelWeights(mlModel);
    const modelData = {
      version: MODEL_VERSION,
      weights: weights,
    };
    await AsyncStorage.setItem(MODEL_WEIGHTS_KEY, JSON.stringify(modelData));

    console.log(`Trained model on ${trainingData.length} interactions`);
  } catch (error) {
    console.error('Training failed:', error);
  }
}

/**
 * Generate mock video features for demonstration
 * In a real app, these would come from video content analysis
 */
export function generateMockVideoFeatures(videoId: string): number[] {
  // Create deterministic features based on video ID for consistency
  const hash = videoId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  const features: number[] = [];
  for (let i = 0; i < 64; i++) {
    features.push(((hash + i) % 1000) / 1000); // Normalize to [0, 1]
  }
  
  return features;
}

/**
 * Predict user preference for a video
 */
export async function predictUserPreference(videoId: string): Promise<number> {
  if (!mlModel || !userEmbedding) {
    await initializeML();
    if (!mlModel || !userEmbedding) return 0.5; // Default neutral preference
  }

  try {
    const videoFeatures = generateMockVideoFeatures(videoId);
    const {X_concat} = prepareData([videoFeatures], [0], userEmbedding.vector);
    
    const prediction = mlModel.predict(X_concat) as tf.Tensor;
    const score = await prediction.data();
    
    // Clean up tensors
    X_concat.dispose();
    prediction.dispose();

    return score[0]; // Return preference score [0, 1]
  } catch (error) {
    console.error('Prediction failed:', error);
    return 0.5;
  }
}

/**
 * Get current ML model state
 */
export function getMLModelState(): MLModelState {
  return {
    model: mlModel,
    isInitialized,
    isTraining: false, // This would be tracked during training
    lastTrainingTime: userEmbedding?.lastUpdated || 0
  };
}

/**
 * Update user embedding based on interactions (simple approach)
 */
export async function updateUserEmbedding(interactions: VideoInteraction[]): Promise<void> {
  if (!userEmbedding) return;

  // Simple approach: adjust embedding based on recent positive/negative interactions
  const recentInteractions = interactions.slice(-10);
  const positiveInteractions = recentInteractions.filter(i => 
    i.action === 'like' || i.action === 'swipe_up'
  );
  const negativeInteractions = recentInteractions.filter(i => 
    i.action === 'unlike' || i.action === 'swipe_down'
  );

  // Update embedding with small adjustments
  const learningRate = 0.01;
  for (let i = 0; i < userEmbedding.vector.length; i++) {
    const positiveSignal = positiveInteractions.length * learningRate;
    const negativeSignal = negativeInteractions.length * learningRate;
    userEmbedding.vector[i] += (positiveSignal - negativeSignal) * (Math.random() - 0.5);
    
    // Clamp values to reasonable range
    userEmbedding.vector[i] = Math.max(-1, Math.min(1, userEmbedding.vector[i]));
  }

  userEmbedding.lastUpdated = Date.now();
  
  // Save updated embedding
  await AsyncStorage.setItem(USER_EMBEDDING_KEY, JSON.stringify(userEmbedding));
}

/**
 * Reset ML model and user data (for testing/debugging)
 */
export async function resetMLData(): Promise<void> {
  await AsyncStorage.removeItem(MODEL_WEIGHTS_KEY);
  await AsyncStorage.removeItem(USER_EMBEDDING_KEY);
  await AsyncStorage.removeItem(INTERACTION_HISTORY_KEY);
  
  mlModel = null;
  isInitialized = false;
  userEmbedding = null;
  interactionHistory.length = 0;
  
  console.log('ML data reset');
}