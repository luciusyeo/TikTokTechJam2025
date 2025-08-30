import random
import numpy as np
import tensorflow as tf
from keras.optimizers import SGD
from keras import backend as K
from mlp_model import build_binary_mlp
from utils import weight_scaling_factor, scale_model_weights, sum_scaled_weights, test_model

def federated_training(clients_batched, test_batched, input_dim, comm_rounds=20, lr=0.01):
    global_model = build_binary_mlp(input_dim)
    global_model.compile(loss='binary_crossentropy', optimizer=SGD(learning_rate=lr, momentum=0.9), metrics=['accuracy'])

    client_models = {}
    client_names = list(clients_batched.keys())
    for client in client_names:
        model = build_binary_mlp(input_dim)
        model.compile(loss='binary_crossentropy', optimizer=SGD(learning_rate=lr, momentum=0.9), metrics=['accuracy'])
        client_models[client] = model

    for comm_round in range(comm_rounds):
        global_weights = global_model.get_weights()
        scaled_local_weight_list = []
        random.shuffle(client_names)

        for client in client_names:
            local_model = client_models[client]
            local_model.set_weights(global_weights)

            # Train on client's data
            local_model.fit(clients_batched[client], epochs=1, verbose=0)

            # Scale and store weights
            scaling_factor = weight_scaling_factor(clients_batched, client)
            scaled_weights = scale_model_weights(local_model.get_weights(), scaling_factor)
            scaled_local_weight_list.append(scaled_weights)

        # Aggregate global weights
        average_weights = sum_scaled_weights(scaled_local_weight_list)
        global_model.set_weights(average_weights)

        # Evaluate global model
        for X_test_batch, Y_test_batch in test_batched:
            acc, loss = test_model(X_test_batch, Y_test_batch, global_model, comm_round)

    return global_model


def standard_sgd_training(X_train, y_train, test_batched, input_dim, epochs=100, lr=0.01):
    # Add random user embeddings for consistency with federated model
    user_embeddings = np.random.rand(X_train.shape[0], input_dim - X_train.shape[1]).astype(np.float32)
    X_train_concat = np.concatenate([X_train, user_embeddings], axis=1)
    
    SGD_dataset = tf.data.Dataset.from_tensor_slices((X_train_concat, y_train)).shuffle(len(y_train)).batch(len(y_train))
    
    sgd_model = build_binary_mlp(input_dim)
    sgd_model.compile(loss='binary_crossentropy', optimizer=SGD(learning_rate=lr, momentum=0.9), metrics=['accuracy'])
    sgd_model.fit(SGD_dataset, epochs=epochs, verbose=0)
    
    for X_test_batch, Y_test_batch in test_batched:
        test_model(X_test_batch, Y_test_batch, sgd_model, 1)
    
    return sgd_model
