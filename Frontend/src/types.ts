// Core data types for TikTok-style feed app

export type User = {
  id: string;
  name: string;
  avatar?: string;
};

export type Video = {
  id: string;
  src: string;           // URL to mp4/webm (local or CDN)
  caption: string;
  author: User;
  stats: { likes: number; comments: number };
  meLiked?: boolean;
};

export type Comment = {
  id: string;
  user: User;
  text: string;
  ts: number;
};