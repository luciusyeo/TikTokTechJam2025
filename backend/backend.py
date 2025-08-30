from fastapi import FastAPI
from pydantic import BaseModel
import torch
from model import Recommender
from supabase import create_client, Client
import config

# -----------------------------
# Supabase client
# -----------------------------
supabase_client: Client = create_client(config.SUPABASE_URL, config.SUPABASE_KEY)

# -----------------------------
# Global model in memory
# -----------------------------
global_model = Recommender()
global_model_state = None  # latest weights as JSON

# -----------------------------
# Pydantic schemas
# -----------------------------
class ModelUpdate(BaseModel):
    client_id: str
    weights: dict

class RecommendRequest(BaseModel):
    user_vector: list
    top_k: int = 5

# -----------------------------
# Helper functions
# -----------------------------
def save_global_model(weights):
    supabase_client.table("global_models").insert({
        "weights": weights
    }).execute()

def load_latest_global_model():
    res = supabase_client.table("global_models") \
        .select("weights") \
        .order("created_at", desc=True) \
        .limit(1) \
        .execute()
    if res.data:
        return res.data[0]["weights"]
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
        global_model.load_state_dict({k: torch.tensor(v) for k, v in weights.items()})
        global_model_state = weights
        print("✅ Loaded latest global model from Supabase")
    else:
        # save initial empty model
        global_model_state = {k: v.tolist() for k, v in global_model.state_dict().items()}
        save_global_model(global_model_state)
        print("⚡ Initialized first global model")

@app.get("/get_global_model")
def get_global_model():
    return {"weights": global_model_state}

@app.post("/update_model")
def update_model(update: ModelUpdate):
    global global_model, global_model_state

    # Load client weights
    client_weights = {k: torch.tensor(v) for k, v in update.weights.items()}
    global_dict = global_model.state_dict()

    # FedAvg: simple average
    for k in global_dict.keys():
        global_dict[k] = (global_dict[k] + client_weights[k]) / 2
    global_model.load_state_dict(global_dict)

    # Save versioned checkpoint in Supabase
    global_model_state = {k: v.tolist() for k, v in global_model.state_dict().items()}
    save_global_model(global_model_state)

    return {"status": "global model updated, versioned in Supabase"}

@app.post("/recommend")
def recommend(req: RecommendRequest):
    global global_model
    user_vec = torch.tensor(req.user_vector, dtype=torch.float32).unsqueeze(0)

    # Fetch videos from Supabase
    videos = supabase_client.table("videos").select("id, video_vector, url").execute().data
    scores = []

    for v in videos:
        video_vec = torch.tensor(v["video_vector"], dtype=torch.float32).unsqueeze(0)
        score = global_model(user_vec, video_vec).item()
        scores.append((v["id"], score, v["url"]))

    scores.sort(key=lambda x: x[1], reverse=True)
    top_videos = [{"id": vid, "url": url} for vid, _, url in scores[:req.top_k]]

    return {"recommendations": top_videos}

@app.get("/supabase_test")
def supabase_test():
    # 1️⃣ Insert a test video row
    test_video = {
        "video_vector": [0.1, 0.2, 0.3, 0.4],
        "url": "https://example.com/test_vid.mp4"
    }
    supabase_client.table("videos").upsert(test_video).execute()

    # 2️⃣ Fetch the video back
    res = supabase_client.table("videos").select("*").execute()

    return {
        "message": "Supabase insert/fetch successful",
        "data": res.data
    }

@app.get("/")
def root():
    return {"status": "FastAPI is running!"}