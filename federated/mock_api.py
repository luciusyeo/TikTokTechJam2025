import keras
import torch
from torchvision.io import read_video
from torchvision.transforms import Compose, Resize, ToTensor, Normalize
from timm import create_model
import numpy as np
import random
import os
from imutils import paths
import tensorflow as tf
from sklearn.metrics import accuracy_score

embedding_dir = '/Users/luciusyeojunjie/Desktop/TikTokTechJam2025/federated/data'

def load_from_db():
    embedding_paths = list(paths.list_files(embedding_dir, validExts=(".npy",)))
    
    X_list, y_list = [], []

    for file_path in embedding_paths:
        embedding = np.load(file_path)
        X_list.append(embedding)
        
        label_str = os.path.splitext(os.path.basename(file_path))[0]
        label = int(label_str)
        y_list.append(label)

    X = np.array(X_list)
    y = np.array([1 if label <= 5 else 0 for label in y_list], dtype=np.float32)
    
    return X, y


def get_client_update(shape=(512,)):
    """Simulate client model weights after local training."""
    return np.random.rand(*shape)

def load_global_model():
    """Simulate loading global model weight from server."""
    rng = np.random.default_rng(42)
    return rng.random(512)
