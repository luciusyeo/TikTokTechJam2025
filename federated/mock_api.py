import json
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
    with open(embedding_dir+"/animals.json", 'r') as f:
        dataAnimals = json.load(f)

    with open(embedding_dir+"/nature.json", 'r') as f:
        dataNature = json.load(f)

    X_list, y_list = [], []

    # Flatten nested lists
    flat_animals = [item for sublist in dataAnimals for item in sublist]
    flat_nature = [item for sublist in dataNature for item in sublist]

    for x in flat_animals:
        X_list.append(x)
        y_list.append(1)

    for x in flat_nature:
        X_list.append(x)
        y_list.append(0)

    X = np.array(X_list)
    y = np.array(y_list)
    
    return X, y


def get_client_update(shape=(512,)):
    """Simulate client model weights after local training."""
    return np.random.rand(*shape)

def load_global_model():
    """Simulate loading global model weight from server."""
    rng = np.random.default_rng(42)
    return rng.random(512)
