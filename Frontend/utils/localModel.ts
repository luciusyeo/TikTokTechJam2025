import axios from "axios";

const BACKEND_URL = "http://localhost:8000";

/**
 * Send training batch to backend /local/train endpoint
 * @param X - input features (user+video vectors)
 * @param y - labels (liked or not)
 */
export async function sendTrainingBatch(X: number[][], y: number[]): Promise<void> {
  try {
    // Hardcoded client_id
    const clientId = "1"; // Use client ID "1" for this example

    // Send the request with client_id included in the payload
    const response = await axios.post(`${BACKEND_URL}/local/train`, { X, y, client_id: clientId });
    
    // Log the response data
    if (response.status === 200) {
      console.log("Training batch sent successfully:", response.data);
    } else {
      console.error("Error response from server:", response.status, response.data);
    }
  } catch (err) {
    console.error("Failed to send training batch:", err);
  }
}
