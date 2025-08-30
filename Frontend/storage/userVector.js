import { storeVectorArray, getVectorArray } from "../src/lib/ml";

export async function saveUserVector(userVector) {
    await storeVectorArray(userVector)
}

export async function loadUserVector(){
    return getVectorArray();
}