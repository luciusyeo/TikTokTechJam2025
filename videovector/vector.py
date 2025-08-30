import ssl
import certifi

ssl._create_default_https_context = lambda: ssl.create_default_context(cafile=certifi.where())

import os
import cv2
import torch
import clip
import numpy as np
from PIL import Image
from tqdm import tqdm
from supabase import create_client

import config

# --- Initialize Supabase ---
supabase = create_client(config.SUPABASE_URL, config.SUPABASE_KEY)
bucket_name = "videos"  # make sure you created this in Supabase Storage

# --- Initialize CLIP ---
device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)

# --- Function to extract frames ---
def extract_frames(video_path, fps=1):
    cap = cv2.VideoCapture(video_path)
    frames = []
    video_fps = cap.get(cv2.CAP_PROP_FPS)
    if video_fps == 0:
        video_fps = 25  # default fallback
    frame_interval = max(int(video_fps / fps), 1)
    count = 0
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if count % frame_interval == 0:
            frames.append(frame)
        count += 1
    cap.release()
    return frames

# --- Function to get video embedding ---
def get_video_embedding(frames):
    frame_embeddings = []
    for frame in frames:
        img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        img_input = preprocess(img).unsqueeze(0).to(device)
        with torch.no_grad():
            embedding = model.encode_image(img_input)
            embedding /= embedding.norm(dim=-1, keepdim=True)
            frame_embeddings.append(embedding.cpu().numpy())
    video_embedding = np.mean(np.vstack(frame_embeddings), axis=0)
    return video_embedding

# --- Function to upload to Supabase Storage ---
def upload_to_supabase(file_path, bucket="videos"):
    file_name = os.path.basename(file_path)

    # Check if the file already exists
    # If it exists, just return the public URL
    try:
        url = supabase.storage.from_(bucket).get_public_url(file_name)
        if url:
            return url  # url is already a string
    except Exception:
        pass  # proceed to upload if check fails

    # Upload the file (overwrite if exists)
    with open(file_path, "rb") as f:
        res = supabase.storage.from_(bucket).upload(file_name, f, {"cacheControl": "3600"}, upsert=True)

    if res.error:
        print(f"Upload error: {res.error}")
        return None

    # Return the public URL (string)
    url = supabase.storage.from_(bucket).get_public_url(file_name)
    return url



# --- Main pipeline ---
data_folder = "data"
video_files = [os.path.join(data_folder, f) for f in os.listdir(data_folder) if f.endswith(".mp4")]

for vf in tqdm(video_files, desc="Processing videos"):
    print(f"\nProcessing {vf}")
    
    # 1. Extract frames
    frames = extract_frames(vf, fps=1)
    if not frames:
        print("No frames extracted, skipping.")
        continue
    
    # 2. Get embedding
    vector = get_video_embedding(frames).tolist()
    
    # 3. Upload video
    url = upload_to_supabase(vf)
    if not url:
        print("Failed to upload, skipping insert.")
        continue
    
    # 4. Insert into Supabase table
    res = supabase.table("videos").insert({
        "video_vector": vector,
        "url": url
    }).execute()
    
    print(f"Inserted video: {url}")