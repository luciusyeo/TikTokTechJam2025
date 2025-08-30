import { storeVectorArray, getVectorArray } from "../src/lib/ml";

/**
 * Save user vector to local storage
 * @param userVector - array of numbers representing user vector
 */
export async function saveUserVector(userVector: number[]): Promise<void> {
  await storeVectorArray(userVector);
}

/**
 * Load user vector from local storage
 * @returns array of numbers representing user vector, or null if not found
 */
export async function loadUserVector(): Promise<number[] | null> {
  const vector = await getVectorArray();
  return vector ?? null;
}
