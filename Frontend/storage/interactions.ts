import { getAllInteractionsData } from "../src/lib/ml";

// Define the interaction shape
export interface Interaction {
  videoId: string;
  liked: boolean;
}

export async function loadInteractions(): Promise<Interaction[]> {
  const data = await getAllInteractionsData();

  return data as Interaction[];
}
