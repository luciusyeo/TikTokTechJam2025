import AsyncStorage from "@react-native-async-storage/async-storage";
import { loadInteractions } from "../storage/interactions";
import { loadUserVector } from "../storage/userVector";
import { fetchVideoVectors, sendModelUpdate } from "../api/backend";
import { trainLocalModel } from "./localModel";

const TRAIN_BATCH_SIZE = 3;
const NEW_COUNT_KEY = "count";

export async function maybeTrainLocalModel() {
  const interactions = await loadInteractions();
  if (interactions.length < TRAIN_BATCH_SIZE) return;

  // Load new interaction count
  // let newCountStr = await AsyncStorage.getItem(NEW_COUNT_KEY);
  // let newCount = newCountStr ? parseInt(newCountStr) : 0;

  
  // if (newCount < TRAIN_BATCH_SIZE) return; // wait until enough interactions


  // Train on the latest 3 interactions
  const newBatch = interactions.slice(-TRAIN_BATCH_SIZE);

  const userVector = await loadUserVector();
  if (!userVector || userVector.length === 0) return;

  const videoIds = newBatch.map(inter => inter.videoId);
  const videoVectors = await fetchVideoVectors(videoIds);

  const X = newBatch.map(inter => [...userVector, ...videoVectors[inter.videoId]]);
  const y = newBatch.map(inter => inter.liked ? 1 : 0);

  const localUpdate = await trainLocalModel(X, y);
  await sendModelUpdate(localUpdate);
}