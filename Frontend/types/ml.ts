// Shared ML types to break circular dependencies

export interface Interaction {
  videoId: string;
  liked: boolean;
}

export interface VideoVectors {
  [videoId: string]: number[];
}