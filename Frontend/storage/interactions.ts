import { getAllInteractionsData } from "../src/lib/ml";

// Define the interaction shape
export interface Interaction {
  videoId: string;
  liked: boolean;
}

export async function loadInteractions(): Promise<Interaction[]> {
  // Fetch raw data
  const data = await getAllInteractionsData();

  // Make sure it's returned as an array
  // If getAllInteractionsData already returns an array, this cast is fine
  return data as Interaction[];
}
