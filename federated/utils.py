import keras
import torch
from torchvision.io import read_video
from torchvision.transforms import Compose, Resize, ToTensor, Normalize
import numpy as np
import random
import tensorflow as tf
from sklearn.metrics import accuracy_score

def reshape_embeddings(X, flatten=True):
    """
    Reshape video or other embeddings to (num_samples, embedding_size).
    """
    if flatten:
        reshaped_X = X.reshape(X.shape[0], -1)
    else:
        reshaped_X = X
    return reshaped_X


def create_clients(video_embeddings, labels, num_clients=3, user_dim=64, initial='client'):
    """Splits dataset into clients and attaches random user embeddings."""
    client_names = [f"{initial}_{i+1}" for i in range(num_clients)]
    
    # Shuffle data
    data = list(zip(video_embeddings, labels))
    random.shuffle(data)
    
    # Shard data
    size = len(data) // num_clients
    shards = [data[i:i+size] for i in range(0, size*num_clients, size)]
    
    clients = {}
    for i, shard in enumerate(shards):
        videos, y = zip(*shard)
        videos = np.array(videos)
        y = np.array(y)
        
        # Create random user embedding for this client
        user_embedding = np.random.rand(1, user_dim).astype(np.float32)
        user_embedding_tile = np.tile(user_embedding, (videos.shape[0], 1))
        
        # Concatenate user embedding to video embeddings
        X_concat = np.concatenate([videos, user_embedding_tile], axis=1)
        
        clients[client_names[i]] = list(zip(X_concat, y))
        
    return clients


def batch_data(data_shard, bs=32):
    """
    Takes in a client's data shard and creates a tf.data.Dataset object.

    Args:
        data_shard: list of tuples (X_concat, y) for one client
        bs: batch size

    Returns:
        tf.data.Dataset object
    """
    # Separate shard into data and labels
    data, labels = zip(*data_shard)
    
    # Convert to arrays if needed
    data = np.array(data, dtype=np.float32)
    labels = np.array(labels, dtype=np.float32)

    dataset = tf.data.Dataset.from_tensor_slices((data, labels))
    return dataset.shuffle(len(labels)).batch(bs)


def preprocess_video(video_path, num_frames=16):
    video, _, _ = read_video(video_path, pts_unit='sec')
    video = video.permute(0, 3, 1, 2)  # T, C, H, W
    indices = torch.linspace(0, video.shape[0]-1, num_frames).long()
    video = video[indices]
    transform = Compose([
        Resize((224, 224)),
        ToTensor(),
        Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    video = torch.stack([transform(frame) for frame in video])
    video = video.unsqueeze(0)  # B=1
    return video


def test_model(X_test, Y_test, model, comm_round):
    # Predict probabilities
    logits = model.predict(X_test)

    # Convert to 0/1 predictions using 0.5 threshold
    preds = (logits > 0.5).astype(np.float32).flatten()

    # Ensure Y_test is a 1D numpy array
    y_true = np.array(Y_test).flatten()

    acc = accuracy_score(y_true, preds)
    loss = model.evaluate(X_test, Y_test, verbose=0)[0]

    print(f"Round {comm_round}: Test Accuracy: {acc:.4f}, Loss: {loss:.4f}")
    return acc, loss

def weight_scaling_factor(clients_trn_data, client_name):
    '''
    This computes a scaling factor for the client’s model based on how much data it has relative to all clients.

    For example, if a client has 1,000 images and the total across all clients is 10,000 images, its scaling factor is 0.1.

    This ensures that clients with more data have more influence on the global model.
'''
    client_names = list(clients_trn_data.keys())
    #get the bs
    bs = list(clients_trn_data[client_name])[0][0].shape[0]
    #first calculate the total training data points across clinets
    global_count = sum([tf.data.experimental.cardinality(clients_trn_data[client_name]).numpy() for client_name in client_names])*bs
    # get the total number of data points held by a client
    local_count = tf.data.experimental.cardinality(clients_trn_data[client_name]).numpy()*bs
    return local_count/global_count


def scale_model_weights(weight, scalar):
    '''function for scaling a models weights

    This multiplies all the weights of the local model by the scaling factor.

    If a layer’s weight matrix is W and scaling factor is 0.1, it becomes 0.1 * W.
    '''
    weight_final = []
    steps = len(weight)
    for i in range(steps):
        weight_final.append(scalar * weight[i])
    return weight_final

def sum_scaled_weights(scaled_weight_list):
    '''Return the sum of the listed scaled weights. The is equivalent to scaled avg of the weights'''
    avg_grad = list()
    #get the average grad accross all client gradients
    for grad_list_tuple in zip(*scaled_weight_list):
        layer_mean = tf.math.reduce_sum(grad_list_tuple, axis=0)
        avg_grad.append(layer_mean)
        
    return avg_grad
