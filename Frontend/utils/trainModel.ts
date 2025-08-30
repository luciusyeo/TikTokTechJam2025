import { loadInteractions } from "../storage/interactions";
import { loadUserVector } from "../storage/userVector";
import { fetchVideoVectors } from "../api/backend";
import { sendTrainingBatch } from "./localModel"
import { Interaction } from "@/src/types";

const TRAIN_BATCH_SIZE = 3;

type LocalModelUpdate = any;

export async function maybeTrainLocalModel(): Promise<void> {
  const interactions: Interaction[] = await loadInteractions();
  if (interactions.length < TRAIN_BATCH_SIZE) return;

  // Take the latest 3 interactions
  const newBatch: Interaction[] = interactions.slice(-TRAIN_BATCH_SIZE);

  // Load user vector
  const userVector: number[] | null = await loadUserVector();
  if (!userVector || userVector.length === 0) return;

  // Fetch video vectors as array of arrays
  const videoIds: string[] = newBatch.map(inter => inter.videoId);
  const videoVectors: number[][] = await fetchVideoVectors(videoIds);

  console.log(userVector.length);  // Should print 16
  console.log(videoVectors[0].length);  // Should print 16

  // Construct input X and labels y
  const X: number[][] = newBatch.map((inter, idx) => [
    ...userVector,
    ...videoVectors[idx], // access by index
  ]);
  const y: number[] = newBatch.map(inter => (inter.liked ? 1 : 0));

  // Train local model
  await sendTrainingBatch(X, y);
}
