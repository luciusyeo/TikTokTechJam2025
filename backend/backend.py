from fastapi import FastAPI
from pydantic import BaseModel
import tensorflow as tf
from model import BinaryMLP
from supabase import create_client, Client
import config
import numpy as np

# -----------------------------
# Supabase client
# -----------------------------
supabase_client: Client = create_client(config.SUPABASE_URL, config.SUPABASE_KEY)

# -----------------------------
# Global model in memory
# -----------------------------
global_model = BinaryMLP(input_dim=512)  # TODO: adjust input_dim for user+video concatenation
global_model_state = None  # list of numpy arrays

# -----------------------------
# Pydantic schemas
# -----------------------------
class ModelUpdate(BaseModel):
    client_id: str
    weights: list  # list of lists (numpy arrays) 

class RecommendRequest(BaseModel):
    user_vector: list
    top_k: int = 5

# -----------------------------
# Helper functions
# -----------------------------
def save_global_model(weights):
    supabase_client.table("global_models").insert({
        "weights": [w.tolist() for w in weights]  # store as JSON-friendly lists
    }).execute()

def load_latest_global_model():
    res = supabase_client.table("global_models") \
        .select("weights") \
        .order("created_at", desc=True) \
        .limit(1) \
        .execute()
    if res.data:
        return [np.array(w) for w in res.data[0]["weights"]]
    return None

# -----------------------------
# FastAPI App
# -----------------------------
app = FastAPI()

@app.on_event("startup")
def startup_event():
    global global_model, global_model_state
    weights = load_latest_global_model()
    if weights:
        global_model.set_weights(weights)
        global_model_state = weights
        print("✅ Loaded latest global model from Supabase")
    else:
        # save initial weights
        initial_weights = global_model.get_weights()
        save_global_model(initial_weights)
        global_model_state = initial_weights
        print("⚡ Initialized first global model")

@app.get("/get_global_model")
def get_global_model():
    if global_model_state is None:
        return {"weights": []}
    return {"weights": [w.tolist() for w in global_model_state]}

@app.post("/update_model")
def update_model(update: ModelUpdate):
    global global_model, global_model_state
    client_weights = [np.array(w) for w in update.weights]

    # Simple FedAvg: average element-wise
    new_weights = []
    if global_model_state is None:
        return {"error": "Global model state is not initialized."}
    for gw, cw in zip(global_model_state, client_weights):
        new_weights.append((gw + cw) / 2.0)

    global_model.set_weights(new_weights)
    global_model_state = new_weights
    save_global_model(global_model_state)

    return {"status": "global model updated, versioned in Supabase"}

@app.post("/recommend")
def recommend(req: RecommendRequest):
    global global_model
    user_vec = tf.convert_to_tensor([req.user_vector], dtype=tf.float32)

    videos = supabase_client.table("videos").select("id, video_vector, url").execute().data
    scores = []
    for v in videos:
        video_vec = tf.convert_to_tensor([v["video_vector"]], dtype=tf.float32)
        score = global_model.forward(user_vec, video_vec).numpy().item()
        scores.append((v["id"], score, v["url"]))

    scores.sort(key=lambda x: x[1], reverse=True)
    top_videos = [{"id": vid, "url": url} for vid, _, url in scores[:req.top_k]]

    return {"recommendations": top_videos}
