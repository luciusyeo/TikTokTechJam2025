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

// Video interaction tracking for local storage
export interface VideoInteraction {
  viewed: boolean;
  liked: boolean;
}

// Collection of all video interactions
export interface VideoInteractions {
  [videoId: string]: VideoInteraction;
}

// Define the shape of an interaction
export interface Interaction {
  videoId: string;
  liked: boolean;
}
