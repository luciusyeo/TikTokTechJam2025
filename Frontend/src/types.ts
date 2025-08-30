import * as tf from '@tensorflow/tfjs';

export type Video = {
  id: string;
  src: string; // file:/// local or https://
  caption: string;
  author: { id: string; name: string; avatar?: string };
  stats: { likes: number; comments: number };
  meLiked?: boolean;
};

export type Comment = {
  id: string;
  user: { id: string; name: string; avatar?: string };
  text: string;
  ts: number; // epoch ms
};

// Types for ML functionality
export interface UserEmbedding {
  vector: number[];
  lastUpdated: number;
}

export interface VideoInteraction {
  videoId: string;
  action: 'swipe_up' | 'swipe_down' | 'like' | 'unlike' | 'comment' | 'watch_time';
  value: number; // 1 for positive actions, 0 for negative, watch time in seconds
  timestamp: number;
  videoFeatures?: number[]; // Optional video embedding features
}

export interface MLModelState {
  model: tf.Sequential | null;
  isInitialized: boolean;
  isTraining: boolean;
  lastTrainingTime: number;
}
