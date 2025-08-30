import random
import numpy as np
import tensorflow as tf
from sklearn.model_selection import train_test_split
from mock_api import load_from_db
from utils import reshape_embeddings

def load(test_size=0.1):
    """
    Load vector embeddings and labels, flatten embeddings, 
    convert labels to binary (1 if <=5 else 0), and split into train/test sets.
    
    """

    X, y =  load_from_db()
    X = reshape_embeddings(X)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, random_state=42)
    return X_train, X_test, y_train, y_test

def create_clients(embeddings, labels, num_clients=2, user_dim=64, initial='client'):
    """
    split training data into 'num_clients', 
    adds random user embedding to each shard,
    return a dictionary mapping client names to their data
    """

    client_names = [f"{initial}_{i+1}" for i in range(num_clients)]
    data = list(zip(embeddings, labels))
    random.shuffle(data)
    size = len(data) // num_clients
    shards = [data[i:i+size] for i in range(0, size*num_clients, size)]
    
    clients = {}
    for i, shard in enumerate(shards):
        videos, y = zip(*shard)
        videos = np.array(videos)
        y = np.array(y)
        
        user_embedding = np.random.rand(1, user_dim).astype(np.float32)
        user_embedding_tile = np.tile(user_embedding, (videos.shape[0], 1))
        
        X_concat = np.concatenate([videos, user_embedding_tile], axis=1)
        clients[client_names[i]] = list(zip(X_concat, y))
    return clients

def prepare_test_set(X_test, y_test, user_dim=64):
    user_embedding_test = np.random.rand(1, user_dim).astype(np.float32)
    user_embedding_test_tile = np.tile(user_embedding_test, (X_test.shape[0], 1))
    X_test_concat = np.concatenate([X_test, user_embedding_test_tile], axis=1)
    test_dataset = tf.data.Dataset.from_tensor_slices((X_test_concat, y_test)).batch(len(y_test))
    return test_dataset

