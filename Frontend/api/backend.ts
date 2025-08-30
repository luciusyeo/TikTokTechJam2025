import { supabase } from "../src/lib/supabase"; // your Supabase client

interface VideoRow {
  id: number;
  gen_vector: number[];
}

export async function fetchVideoVectors(
  videoIds: number[]
): Promise<number[][]> {
  if (!videoIds || videoIds.length === 0) return [];

  try {
    const { data, error } = await supabase
      .from("videos")
      .select("id, gen_vector")
      .in("id", videoIds);

    if (error) {
      console.error("Supabase error fetching video vectors:", error);
      return [];
    }

    const typedData = (data ?? []) as VideoRow[];

    // Map to array of vectors in the same order as videoIds
    const vectors: number[][] = videoIds.map((id) => {
      const video = typedData.find((v) => Number(v.id) === Number(id)); // Ensuring that both are treated as numbers

      if (!video) {
        console.warn(`Video ID ${id} not found in fetched data.`);
        return [];
      }

      if (!video.gen_vector || video.gen_vector.length === 0) {
        console.warn(`No valid vector found for video ID: ${id}`);
        return [];
      }

      return video.gen_vector;
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
    const response = await axios.post(
      `${BACKEND_URL}/model-update`,
      localUpdate
    );
    console.log("Model update sent successfully:", response.data);
  } catch (err) {
    console.error("Failed to send model update:", err);
  }
}
