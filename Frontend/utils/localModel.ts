import axios from "axios";

const BACKEND_URL = "http://localhost:8000"; // replace with your backend URL

/**
 * Send training batch to backend /train endpoint
 * @param X - input features (user+video vectors)
 * @param y - labels (liked or not)
 */
export async function sendTrainingBatch(X: number[][], y: number[]): Promise<void> {
  try {
    const response = await axios.post(`${BACKEND_URL}/train`, { X, y });
    console.log("Training batch sent successfully:", response.data);
  } catch (err) {
    console.error("Failed to send training batch:", err);
  }
}