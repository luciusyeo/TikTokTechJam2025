// Backend API configuration and endpoints

const API_BASE_URL = 'http://127.0.0.1:8000';

export interface RecommendationRequest {
  user_vector: number[];
  top_k?: number;
}

export interface RecommendationResponse {
  recommendations: Array<{
    id: string;
    url: string;
  }>;
}

/**
 * Fetch video recommendations from the backend ML model
 */
export async function fetchRecommendations(
  userVector: number[], 
  topK: number = 5
): Promise<RecommendationResponse> {
  const requestBody = {
    user_vector: userVector,
    top_k: topK,
  };
  
  console.log(`📡 POST /recommend (top_k=${topK})`);
  
  const response = await fetch(`${API_BASE_URL}/recommend`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ API Error (${response.status}):`, errorText);
    throw new Error(`Recommendation API failed: ${response.status} ${response.statusText}`);
  }

  const jsonResponse = await response.json();
  console.log(`📨 API Success: ${jsonResponse.recommendations?.length || 0} videos`);
  
  return jsonResponse;
}

/**
 * Health check for backend API
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/docs`, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}