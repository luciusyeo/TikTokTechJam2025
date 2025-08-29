import numpy as np
import random
import cv2
import os
from imutils import paths
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelBinarizer
from sklearn.metrics import accuracy_score

import tensorflow as tf
from keras.optimizers import SGD
from keras import backend as K

from utils import *

# --- Paths & Data ---
    # This loads all images from the folder and converts them to grayscale flattened arrays.
    #link to training set: https://www.kaggle.com/datasets/scolianni/mnistasjpg?resource=download&select=trainingSet
img_path = '/Users/luciusyeojunjie/Desktop/TikTokTechJam2025/federated/data'

image_paths = list(paths.list_images(img_path))
print("Found images:", len(image_paths))

image_list, label_list = load(image_paths, verbose=10000)
print("Loaded data:", len(image_list), "Loaded labels:", len(label_list))

# Binarize labels
    # Converts labels like 0,1,2...9 into one-hot vectors, e.g., 3 → [0,0,0,1,0,0,0,0,0,0].
lb = LabelBinarizer()
label_list = lb.fit_transform(label_list)

# Split train/test
    # random_state ensures reproducibility
X_train, X_test, y_train, y_test = train_test_split(
    image_list, label_list, test_size=0.1, random_state=42
)

# Create clients
clients = create_clients(X_train, y_train, num_clients=10, initial='client')

# Batch data for each client
    # Federated learning: training is split among many “clients” (like phones or separate computers).
    # create_clients divides the training data into 10 random shards, one per client.
    # batch_data converts each client’s data into TensorFlow datasets (batches for training).
clients_batched = {
    client_name: batch_data(data) for client_name, data in clients.items()
}

# Batch test set
    # Entire test set is one batch (all images together).
    # This is used to evaluate the global model after each communication round.

test_batched = tf.data.Dataset.from_tensor_slices((X_test, y_test)).batch(len(y_test))

# --- Training Settings ---
comms_round = 10
lr = 0.01
loss = 'categorical_crossentropy'
metrics = ['accuracy']

# Initialize global model
    # SimpleMLP creates a Multi-Layer Perceptron (MLP) with:
        # Input: 784 (28x28 flattened image)
        # Two hidden layers with 200 neurons each
        # Output: 10 neurons (one for each digit, softmax activation)

smlp_global = SimpleMLP()
global_model = smlp_global.build(784, 10) #input: 784, output: 10

print("Starting federated training...")

# --- Federated Training Loop --- Client Side 
for comm_round in range(comms_round):

    global_weights = global_model.get_weights()
    scaled_local_weight_list = [] #tracks all the client's weights

    client_names = list(clients_batched.keys()) # Gets the client names
    random.shuffle(client_names) # Clients are shuffled to simulate random selection in federated learning

    for client in client_names:
        # Create local model
        smlp_local = SimpleMLP()
        local_model = smlp_local.build(784, 10)

        # Create a fresh optimizer for this local model
            
            # Optimizer decides how to update the model’s weights during training 
            # so that the model improves at its task
                # Momention: helps the optimizer carry some "memory" of past updates
        local_optimizer = SGD(learning_rate=lr, momentum=0.9)

            #prepares the model for training
                #specifies loss, optimizer and metrics 
                # loss: tells model how to measure its mistakes
                # metrics: tells model to track accuracy
        local_model.compile(loss=loss, optimizer=local_optimizer, metrics=metrics)

            #copies current global weights into the model's
        local_model.set_weights(global_weights)

        # Train on client's data
            # clients_batched[client]: data shard for this client
            # epochs = 1 means a single pass over all the data in the shard
                # Single pass is good to prevent overfitting on small datasets
            # verbose = 0 means dont print progress
        local_model.fit(clients_batched[client], epochs=1, verbose=0)

        # Scale weights and add to list
        scaling_factor = weight_scalling_factor(clients_batched, client)
        scaled_weights = scale_model_weights(local_model.get_weights(), scaling_factor)
        scaled_local_weight_list.append(scaled_weights)

        # Free memory
        K.clear_session()

    # Average scaled weights
    average_weights = sum_scaled_weights(scaled_local_weight_list)

    # Update global model
    global_model.set_weights(average_weights)

    # Test global model
    for X_test_batch, Y_test_batch in test_batched:
        global_acc, global_loss = test_model(X_test_batch, Y_test_batch, global_model, comm_round)

print("Federated training finished!")

# --- Standard SGD for comparison ---
SGD_dataset = tf.data.Dataset.from_tensor_slices((X_train, y_train)).shuffle(len(y_train)).batch(320)

smlp_SGD = SimpleMLP()
SGD_model = smlp_SGD.build(784, 10)
SGD_optimizer = SGD(learning_rate=lr, momentum=0.9)
SGD_model.compile(loss=loss, optimizer=SGD_optimizer, metrics=metrics)

_ = SGD_model.fit(SGD_dataset, epochs=100, verbose=0)

for X_test_batch, Y_test_batch in test_batched:
    SGD_acc, SGD_loss = test_model(X_test_batch, Y_test_batch, SGD_model, 1)
