import { loadInteractions } from "../storage/interactions";
import { saveUserVector } from "../storage/userVector";
import * as math from "mathjs";
import { fetchVideoVectors } from "../api/backend";

// Define the shape of an interaction
interface Interaction {
  videoId: string;
  liked: boolean;
}

// Define type for video vectors mapping
interface VideoVectors {
  [videoId: string]: number[];
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
    // If no liked videos, return zero vector
    // For safety, fetch a sample video vector length
    const sampleVideoIds = interactions.map(i => i.videoId).slice(0, 1);
    let vectorLength = 10; // default length if no sample
    if (sampleVideoIds.length > 0) {
      const sampleVectors = await fetchVideoVectors(sampleVideoIds);
      if (sampleVectors.length > 0) vectorLength = sampleVectors[0].length;
    }

    const emptyVector = Array(vectorLength).fill(0);
    await saveUserVector(emptyVector);
    return emptyVector;
  }

  // 3. Get video IDs of liked videos
  const videoIds = likedVideos.map(i => i.videoId);

  // 4. Fetch video vectors from backend/Supabase
  const videoVectors: number[][] = await fetchVideoVectors(videoIds);

  // 5. Sum the vectors
  let sumVector = Array(videoVectors[0].length).fill(0);
  likedVideos.forEach((inter, idx) => {
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
