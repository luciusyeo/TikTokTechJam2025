from fastapi import APIRouter
from typing import List
import numpy as np
from pydantic import BaseModel
from model import BinaryMLP
import requests

router = APIRouter(prefix="/local")

# Privacy settings
CLIP_NORM = 1.5           # maximum L2 norm for weight clipping
NOISE_STD = 0.1           # standard deviation of Gaussian noise
MAX_SUBSET_RATIO = 0.9    # fraction of weights to keep (rest zeroed out)

GLOBAL_MODEL_URL = "http://localhost:8000/update_model"  # central server endpoint
GLOBAL_GET_MODEL_URL = "http://localhost:8000/get_global_model"  # get global model endpoint

class ModelData(BaseModel):
    client_id: str
    X: List[List[float]]   # features, 2D list (samples × features)
    y: List[int]           # labels, 1D list

@router.post("/train")
def train_local(data: ModelData):
    # Validate input dimensions match expected architecture
    expected_input_dim = 32
    actual_input_dim = len(data.X[0])
    if actual_input_dim != expected_input_dim:
        return {
            "error": f"Input dimension mismatch: expected {expected_input_dim}, got {actual_input_dim}"
        }
    
    # Initialize local model
    model = BinaryMLP(input_dim=32, hidden_dim=128)

    # Fetch global model weights
    try:
        resp = requests.get(GLOBAL_GET_MODEL_URL)
        global_weights = resp.json().get("weights", [])
        if global_weights:
            model.model.set_weights([np.array(w) for w in global_weights])
        else:
            print("⚠️ No weights found in the global model response.")
    except Exception as e:
        print(f"⚠️ Could not fetch global model: {e}")

    X = np.array(data.X, dtype=np.float32)
    y = np.array(data.y, dtype=np.int32)

    # Train locally with differential privacy
    model.fit_with_dp(X, y, epochs=3, batch_size=16)

    # Apply Privacy to Weights
    updated_weights = model.model.get_weights()
    private_weights = []

    for w in updated_weights:
        # 1. Clip the weight vector
        norm = np.linalg.norm(w)
        clipped_w = w * min(1.0, CLIP_NORM / (norm + 1e-6))

        # 2. Add Gaussian noise
        noisy_w = clipped_w + np.random.normal(0, NOISE_STD, size=clipped_w.shape)

        # 3. Random subset: zero out a portion of weights
        mask = np.random.rand(*noisy_w.shape) < MAX_SUBSET_RATIO
        noisy_w = noisy_w * mask

        private_weights.append(noisy_w.tolist())

    # Send to Global Server
    payload = {
        "client_id": data.client_id,
        "weights": private_weights
    }
    try:
        resp = requests.post(GLOBAL_MODEL_URL, json=payload)
        agg_response = resp.json()
        print(f"Response from global model update: {agg_response}")
    except Exception as e:
        print(f"⚠️ Could not send weights to global model: {e}")
        agg_response = {"error": str(e)}

    return {
        "message": f"Local training done for client {data.client_id}",
        "weights_sent": True,
        "aggregator_response": agg_response
    }