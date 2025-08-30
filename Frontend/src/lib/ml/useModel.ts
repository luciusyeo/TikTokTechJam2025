import * as tf from "@tensorflow/tfjs";
import { buildBinaryMLP, trainModel } from "./model";

export const loadGlobalModel = async (
  model: tf.LayersModel,
  globalWeights: number[][][]
) => {
  const weightTensors = globalWeights.map((w) => tf.tensor(w));

  model.setWeights(weightTensors);

  weightTensors.forEach((t) => t.dispose());
};

export const trainClientModel = async (
  clientX: number[][],
  clientY: number[][],
  inputDim: number
) => {
  await tf.ready();
  const model = buildBinaryMLP(inputDim);
  const xClient = tf.tensor2d(clientX, [clientX.length, inputDim]);
  const yClient = tf.tensor2d(clientY, [clientY.length, 1]);
  const updatedWeights = await trainModel(model, xClient, yClient);
  return { model, updatedWeights };
};

export const predictScore = (
  model: tf.LayersModel,
  userVec: number[],
  videoVec: number[]
) => {
  const inputVec = tf.concat(
    [tf.tensor2d([userVec]), tf.tensor2d([videoVec])],
    1
  );
  return (model.predict(inputVec) as tf.Tensor).dataSync()[0];
};

/**
 * const clientX = [
 * [...video1Embedding, ...userEmbedding],
 * [...video2Embedding, ...userEmbedding],
 * [...video3Embedding, ...userEmbedding]
 * ];
 * 
 * const clientY = [
  [1],  liked video1
  [0],  skipped video2
  [1]   liked video3
];
 */
