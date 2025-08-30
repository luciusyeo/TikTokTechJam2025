import { loadInteractions } from "../storage/interactions";
import { saveUserVector } from "../storage/userVector";
import * as math from "mathjs";
import { fetchVideoVectors } from "../api/backend";

/**
 * Build and store the user vector based on liked interactions
 * @returns {Array} user vector
 */
export async function buildUserVector() {
  // 1. Load all interactions
  const interactions = await loadInteractions();

  // 2. Filter liked interactions only
  const likedVideos = interactions.filter(i => i.liked);

  if (likedVideos.length === 0) {
    const emptyVector = Array(Object.values(videoVectors)[0].length).fill(0);
    await saveUserVector(emptyVector);
    return emptyVector; // no likes yet
  }

  // 3. Get video IDs of liked videos
  const videoIds = likedVideos.map(i => i.videoId);

  // 4. Fetch video vectors from backend/Supabase
  const videoVectors = await fetchVideoVectors(videoIds);
  // videoVectors = { videoId: [vector array], ... }

  // 5. Sum the vectors
  let sumVector = Array(Object.values(videoVectors)[0].length).fill(0);
  likedVideos.forEach(inter => {
    const vec = videoVectors[inter.videoId];
    if (vec) {
      sumVector = math.add(sumVector, vec);
    }
  });

  // 6. Average
  const userVector = math.divide(sumVector, likedVideos.length);

  // 7. Save updated user vector into local storage
  await saveUserVector(userVector);

  return userVector;
}
