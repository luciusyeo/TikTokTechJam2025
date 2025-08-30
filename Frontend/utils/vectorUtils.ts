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
    // If no liked videos, return zero vector of fixed size 16
    const emptyVector = Array(16).fill(0);
    await saveUserVector(emptyVector);
    console.log("User vector (empty):", emptyVector); // Log the empty vector
    return emptyVector;
  }

  console.log("Liked videos:", likedVideos);

  // 3. Get video IDs of liked videos
  const videoIds = likedVideos.map(i => parseInt(i.videoId)); // Convert to number

  // 4. Fetch video vectors from backend/Supabase
  const videoVectors: number[][] = await fetchVideoVectors(videoIds);

  // 5. Sum the vectors
  let sumVector = Array(16).fill(0);
  likedVideos.forEach((_, idx) => {
    const vec = videoVectors[idx];
    if (vec) {
      sumVector = math.add(sumVector, vec) as number[];
    }
  });

  // 6. Average
  const userVector = math.divide(sumVector, likedVideos.length) as number[];

  console.log("User vector:", userVector); // Log the calculated user vector

  // 7. Save updated user vector into local storage
  await saveUserVector(userVector);

  return userVector;
}
