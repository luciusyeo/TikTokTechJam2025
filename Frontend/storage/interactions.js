import { getAllInteractionsData } from "../src/lib/ml";

export async function loadInteractions() {
    return getAllInteractionsData();
}