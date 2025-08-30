from fastapi import APIRouter
from typing import List
import numpy as np
from pydantic import BaseModel
from model import BinaryMLP
import requests 


# -----------------------------
# Pydantic schemas
# -----------------------------
class ModelData(BaseModel):
    client_id: str
    X: List[List[float]]   # features, 2D list (samples × features)
    y: List[int]           # labels, 1D list

router = APIRouter(prefix="/local")

AGGREGATOR_URL = "http://localhost:8000/update_model"  # central server endpoint

@router.post("/train")
def train_local(data: ModelData):
    model = BinaryMLP(input_dim=len(data.X[0]), hidden_dim=128)

    # Convert incoming training data to numpy
    X = np.array(data.X, dtype=np.float32)
    y = np.array(data.y, dtype=np.int32)

    # 3. Train locally
    model.model.fit(X, y, epochs=3, batch_size=16, verbose=0)

    # 4. Get updated weights
    weights = [w.tolist() for w in model.model.get_weights()]

    payload = {
        "client_id": data.client_id,
        "weights": weights
    }
    try:
        resp = requests.post(AGGREGATOR_URL, json=payload)
        agg_response = resp.json()
    except Exception as e:
        agg_response = {"error": str(e)}

    return {
        "message": f"Local training done for client {data.client_id}",
        "weights_sent": True,
        "aggregator_response": agg_response
    }
