from fastapi import FastAPI
from pydantic import BaseModel
import tensorflow as tf
from trust_graph_utils import create_trust_graph, trust_graph_to_json, update_trust, add_device_to_trust_graph
from model import BinaryMLP
from supabase import create_client, Client
import config
import numpy as np
from local_api import router as local_router
from typing import Dict, List
import random

# Supabase client
supabase_client: Client = create_client(config.SUPABASE_URL, config.SUPABASE_KEY)


# Global model init
global_model = BinaryMLP(input_dim=32, hidden_dim= 128)
expected_clients = 1   # how many devices you expect in this round
trust_graph = create_trust_graph(expected_clients)
noisy_id = "noisy"
trust_graph.add_node(noisy_id, trust=0.2)

# -----------------------------
# Global model in memory
# -----------------------------
global_model_state = None  # list of numpy arrays
client_updates: Dict[str, List[np.ndarray]] = {}  # store weights per client
client_vectors: Dict[str, np.ndarray] = {}

# Pydantic schemas
class ModelUpdate(BaseModel):
    client_id: str
    weights: list  # list of lists (numpy arrays) 

class RecommendRequest(BaseModel):
    user_vector: list
    top_k: int = 10

# Helper functions
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

# FastAPI App
app = FastAPI()
app.include_router(local_router)

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
    global client_updates, global_model_state, client_vectors, trust_graph, noisy_id

    client_weights = [np.array(w) for w in update.weights]

    # Extract the first 16 elements as the user vector
    user_vector = np.array(client_weights[0][0, :16], dtype=np.float32)
    client_vectors[update.client_id] = user_vector
    print("client", update.client_id, ": ", user_vector)

    # Simulate a local validation accuracy for demo
    val_acc = random.uniform(0.7, 0.95) if "noisy" not in update.client_id else 0.2

    # --- Add or update client node dynamically ---
    if update.client_id not in client_updates:
        client_updates[update.client_id] = []
        add_device_to_trust_graph(trust_graph, update.client_id, initial_trust=val_acc)

    # Update trust for this client
    update_trust(trust_graph, update.client_id, val_acc)

    # Append weights for this client
    client_updates[update.client_id].append(np.array(client_weights, dtype=object))

    # --- Simulate noisy node contributes once per round ---
    if noisy_id not in client_updates:
        client_updates[noisy_id] = []
        # Generate noisy update (randomized)
        noisy_weights = [w + np.random.normal(0, 0.5, w.shape) for w in client_weights]
        client_updates[noisy_id].append(np.array(noisy_weights, dtype=object))
        # Trust remains low
        update_trust(trust_graph, noisy_id, 0.2)

    # --- Federated averaging with trust weighting ---
    if len(client_updates) >= expected_clients:
        all_client_weights = []

        # Average multiple submissions per client
        for updates_per_client in client_updates.values():
            client_avg = []
            for layer_weights in zip(*updates_per_client):
                client_avg.append(np.mean(layer_weights, axis=0))
            all_client_weights.append(client_avg)

        # Weighted aggregation using trust scores
        new_weights = []
        for layer_idx in range(len(all_client_weights[0])):
            weighted_sum = sum(
                trust_graph.nodes[c]['trust'] * all_client_weights[i][layer_idx]
                for i, c in enumerate(client_updates.keys())
            )
            total_trust = sum(trust_graph.nodes[c]['trust'] for c in client_updates.keys())
            new_weights.append(weighted_sum / total_trust)

        # Set new global model
        global_model.set_weights(new_weights)
        global_model_state = new_weights

        # Reset for next round
        client_updates = {}
        
        return {"status": "Aggregated", "new_global_model": "ready"}
    else:
        return {"status": f"Waiting for {expected_clients - len(client_updates)} more clients"}


@app.post("/recommend")
def recommend(req: RecommendRequest):
    global global_model
    
    if len(req.user_vector) != 16:
        return {"error": f"user_vector must be exactly 16 dimensions, got {len(req.user_vector)}"}
    
    user_vec = np.array(req.user_vector, dtype=np.float32)

    videos = supabase_client.table("videos").select("id, gen_vector, url").execute().data

    # If user vector is zero, return fully random recommendations
    if np.all(user_vec == 0):
        random.shuffle(videos)
        top_videos = [{"id": v["id"], "url": v["url"]} for v in videos[:req.top_k]]
        return {"recommendations": top_videos}

    # Convert to tensor for model
    user_vec_tf = tf.convert_to_tensor([req.user_vector], dtype=tf.float32)

    # Compute scores
    scored_videos = []
    for v in videos:
        if len(v.get("gen_vector", [])) != 16:
            continue
        video_vec_tf = tf.convert_to_tensor([v["gen_vector"]], dtype=tf.float32)
        score = global_model.forward(user_vec_tf, video_vec_tf).numpy().item()
        scored_videos.append((v["id"], score, v["url"]))

    scored_videos.sort(key=lambda x: x[1], reverse=True)

    top_k = req.top_k
    top_videos = [{"id": vid, "url": url} for vid, _, url in scored_videos[:top_k]]

    # Mix in 20% random videos
    num_random = max(1, int(top_k * 0.2))
    remaining_videos = [v for v in videos if v["id"] not in [vid for vid, _, _ in scored_videos[:top_k]]]
    random_videos = random.sample(remaining_videos, min(num_random, len(remaining_videos)))
    random_videos_formatted = [{"id": v["id"], "url": v["url"]} for v in random_videos]

    # Combine and slice to maintain top_k length
    final_recommendations = top_videos[:top_k - len(random_videos_formatted)] + random_videos_formatted

    return {"recommendations": final_recommendations}


@app.get("/user_vector")
def get_user_vectors():
    # Convert all np.ndarrays to lists for JSON serialization
    all_vectors = {user_id: vec.tolist() for user_id, vec in client_vectors.items()}
    
    return {"client_vectors": all_vectors}

@app.get("/trust_graph")
def get_trust_graph():
    return trust_graph_to_json(trust_graph)
