import { loadInteractions } from "../storage/interactions";
import { saveUserVector } from "../storage/userVector";
import * as math from "mathjs";
import { fetchVideoVectors } from "../api/backend";

// Define the shape of an interaction
interface Interaction {
  videoId: string;
  liked: boolean;
}

/**
 * Build and store the user vector based on liked interactions
 * @returns user vector as number array
 */
export async function buildUserVector(): Promise<number[]> {
  // 1. Load all interactions
  const interactions: Interaction[] = await loadInteractions();

  // 2. Filter liked interactions only
  const likedVideos = interactions.filter(i => i.liked);

  if (likedVideos.length === 0) {
    // If no liked videos, return zero vector of fixed size 1024
    const emptyVector = Array(1024).fill(0);
    await saveUserVector(emptyVector);
    return emptyVector;
  }

  // 3. Get video IDs of liked videos
  const videoIds = likedVideos.map(i => i.videoId);

  // 4. Fetch video vectors from backend/Supabase
  const videoVectors: number[][] = await fetchVideoVectors(videoIds);

  // 5. Sum the vectors
  let sumVector = Array(1024).fill(0);
  likedVideos.forEach((_, idx) => {
    const vec = videoVectors[idx];
    if (vec) {
      sumVector = math.add(sumVector, vec) as number[];
    }
  });

  // 6. Average
  const userVector = math.divide(sumVector, likedVideos.length) as number[];

  // 7. Save updated user vector into local storage
  await saveUserVector(userVector);

  return userVector;
}
