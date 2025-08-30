import { supabase } from "../src/lib/supabase"; // your Supabase client

/**
 * Fetch video vectors directly from Supabase
 * @param {Array<string>} videoIds
 * @returns {Promise<Object>} - { videoId: [vector array], ... }
 */
export async function fetchVideoVectors(videoIds) {
  if (!videoIds || videoIds.length === 0) return {};

  try {
    const { data, error } = await supabase
      .from("videos")
      .select("id, vector") // 'vector' is your pgvector column
      .in("id", videoIds);

    if (error) {
      console.error("Supabase error fetching video vectors:", error);
      return {};
    }

    // Map to { videoId: vectorArray }
    const videoVectors = {};
    data.forEach(video => {
      videoVectors[video.id] = video.vector; // assuming vector is stored as an array
    });

    return videoVectors;
  } catch (err) {
    console.error("Failed to fetch video vectors:", err);
    return {};
  }
}

import axios from "axios";

const BACKEND_URL = "https://your-backend.com"; // replace with your backend URL

/**
 * Send the local model update to the backend
 * @param {Object} localUpdate - e.g., model weights or gradients
 */
export async function sendModelUpdate(localUpdate) {
  try {
    const response = await axios.post(`${BACKEND_URL}/model-update`, localUpdate);
    console.log("Model update sent successfully:", response.data);
  } catch (err) {
    console.error("Failed to send model update:", err);
  }
}