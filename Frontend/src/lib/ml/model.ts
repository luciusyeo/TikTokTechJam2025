import * as tf from "@tensorflow/tfjs";

// Define the model
export const buildBinaryMLP = (inputDim: number) => {
  const model = tf.sequential();
  model.add(
    tf.layers.dense({ units: 64, activation: "relu", inputShape: [inputDim] })
  );
  model.add(tf.layers.dense({ units: 64, activation: "relu" }));
  model.add(tf.layers.dense({ units: 64, activation: "relu" }));
  model.add(tf.layers.dense({ units: 1, activation: "sigmoid" }));
  model.compile({
    optimizer: tf.train.adam(),
    loss: "binaryCrossentropy",
    metrics: ["accuracy"],
  });
  return model;
};

export const trainModel = async (
  model: tf.LayersModel,
  xClient: tf.Tensor, // shape [numSamples, videoDim + userDim]
  yClient: tf.Tensor,
  epochs = 1,
  batchSize = 32
) => {
  // Train on local client data
  await model.fit(xClient, yClient, {
    epochs,
    batchSize,
    shuffle: true,
    verbose: 0,
  });

  const updatedWeights = model.getWeights();


  return updatedWeights;
};
