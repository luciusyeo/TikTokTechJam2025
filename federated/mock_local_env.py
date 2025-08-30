import numpy as np
import tensorflow as tf
from keras.optimizers import SGD
from mlp_model import build_binary_mlp

def local_trainer(global_weights, user_embedding, X_train, y_train, input_dim, epochs=100, lr=0.01, batch_size=32):
    # Ensure user embedding is tiled to match X_train samples
    if user_embedding.shape[0] == 1:
        user_embedding = np.tile(user_embedding, (X_train.shape[0], 1))
    
    # Concatenate user + video embeddings
    X_train_concat = np.concatenate([X_train, user_embedding], axis=1)
    
    # Create dataset
    train_dataset = tf.data.Dataset.from_tensor_slices((X_train_concat, y_train))
    train_dataset = train_dataset.shuffle(len(y_train)).batch(batch_size)
    
    # Initialize model and load global weights
    model = build_binary_mlp(input_dim)
    model.set_weights(global_weights)
    model.compile(loss='binary_crossentropy', optimizer=SGD(learning_rate=lr, momentum=0.9), metrics=['accuracy'])
    
    # Train locally
    model.fit(train_dataset, epochs=epochs, verbose=0)
    
    # Return updated model
    return model.get_weights()

