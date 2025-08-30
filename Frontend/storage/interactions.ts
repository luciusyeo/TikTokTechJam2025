import { getAllInteractionsData } from "../src/lib/ml";
import { Interaction } from "@/src/types";

export async function loadInteractions(): Promise<Interaction[]> {
  const data = await getAllInteractionsData();

  return data as Interaction[];
}
