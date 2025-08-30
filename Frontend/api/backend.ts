import { supabase } from "../src/lib/supabase"; // your Supabase client

/**
 * Fetch video vectors directly from Supabase
 * @param {Array<string>} videoIds
 * @returns {Promise<Object>} - { videoId: [vector array], ... }
 */

interface VideoRow {
  id: string;
  vector: number[];
}

interface VideoRow {
  id: string;
  vector: number[];
}

export async function fetchVideoVectors(videoIds: string[]): Promise<number[][]> {
  if (!videoIds || videoIds.length === 0) return [];

  try {
    const { data, error } = await supabase
      .from<VideoRow>("videos")
      .select("id, vector")
      .in("id", videoIds);

    if (error) {
      console.error("Supabase error fetching video vectors:", error);
      return [];
    }

    // Map to array of vectors in same order as videoIds
    const vectors: number[][] = videoIds.map(id => {
      const video = data?.find((v: VideoRow) => v.id === id); // explicit type here
      return video?.vector ?? [];
    });

    return vectors;
  } catch (err) {
    console.error("Failed to fetch video vectors:", err);
    return [];
  }
}



import axios from "axios";

const BACKEND_URL = "https://your-backend.com"; // replace with your backend URL

/**
 * Send the local model update to the backend
 * @param {Object} localUpdate - e.g., model weights or gradients
 */
export async function sendModelUpdate(localUpdate: any) {
  try {
    const response = await axios.post(`${BACKEND_URL}/model-update`, localUpdate);
    console.log("Model update sent successfully:", response.data);
  } catch (err) {
    console.error("Failed to send model update:", err);
  }
}