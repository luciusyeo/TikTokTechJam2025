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
import ffmpeg
import json

import config

# --- Initialize Supabase ---
supabase = create_client(config.SUPABASE_URL, config.SUPABASE_KEY)
bucket_name = "videos"

# --- Initialize CLIP ---
device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)

# --- Video processing functions ---
def compress_video(input_path, output_path, target_width=1080, duration=5):
    """
    Compress and trim a video to a lower resolution and duration.
    """
    try:
        probe = ffmpeg.probe(input_path)
        video_stream = next((s for s in probe['streams'] if s['codec_type'] == 'video'), None)
        orig_width = int(video_stream['width'])
        orig_height = int(video_stream['height'])
        new_height = int(orig_height * target_width / orig_width)

        (
            ffmpeg
            .input(input_path, t=duration)  # trim to duration
            .output(
                output_path,
                vf=f'scale={target_width}:{new_height}',
                vcodec='libx264',
                crf=23,
                preset='fast',
                acodec='aac',
                audio_bitrate='128k'
            )
            .overwrite_output()
            .run(quiet=True)
        )
        return output_path
    except Exception as e:
        print(f"Error compressing {input_path}: {e}")
        return None

def extract_frames(video_path, fps=1):
    cap = cv2.VideoCapture(video_path)
    frames = []
    video_fps = cap.get(cv2.CAP_PROP_FPS) or 25
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

def upload_to_supabase(file_path, bucket="videos"):
    file_name = os.path.basename(file_path)
    try:
        supabase.storage.from_(bucket).remove([file_name])
    except Exception:
        pass
    with open(file_path, "rb") as f:
        supabase.storage.from_(bucket).upload(file_name, f, {"cacheControl": "3600"})
    url = supabase.storage.from_(bucket).get_public_url(file_name)
    return url

# --- Prepare folders for compressed videos and embeddings ---
compressed_folder = "compressed"
os.makedirs(compressed_folder, exist_ok=True)

embeddings_folder = "embeddings"
os.makedirs(embeddings_folder, exist_ok=True)

# Initialize embedding collectors
category_embeddings = {
    "animals": [],
    "nature": []
}

# --- Main pipeline ---
data_folder = "data"
video_files = []
for root, dirs, files in os.walk(data_folder):
    for f in files:
        if f.lower().endswith(".mp4"):
            full_path = os.path.join(root, f)
            category = "animals" if "animals" in full_path.lower() else "nature"
            video_files.append((full_path, category))

for vf, category in tqdm(video_files, desc="Processing videos"):
    print(f"\nProcessing {vf} (Category: {category})")
    
    # 0. Compress and trim to 5 seconds
    compressed_path = os.path.join(compressed_folder, os.path.basename(vf))
    compressed_result = compress_video(vf, compressed_path, target_width=1080, duration=5)
    if not compressed_result:
        print("Compression failed, skipping.")
        continue

    # 1. Extract frames
    frames = extract_frames(compressed_path, fps=1)
    if not frames:
        print("No frames extracted, skipping.")
        continue
    
    # 2. Get embedding
    vector = get_video_embedding(frames).tolist()
    
    # 3. Collect embedding in memory (instead of saving per file)
    category_embeddings[category].append(vector)
    
    # 4. Upload compressed video
    url = upload_to_supabase(compressed_path)
    if not url:
        print("Failed to upload, skipping insert.")
        continue
    
    # 5. Insert into Supabase table with category info
    is_animal = True if category == "animals" else False
    res = supabase.table("videos").insert({
        "video_vector": vector,
        "url": url,
        "is_animal": is_animal
    }).execute()
    
    print(f"Inserted video: {url} | is_animal={is_animal}")

# --- Save all embeddings to category JSON files ---
for category, vectors in category_embeddings.items():
    out_path = os.path.join(embeddings_folder, f"{category}.json")
    with open(out_path, "w") as f:
        json.dump(vectors, f)
    print(f"Saved {len(vectors)} embeddings to {out_path}")
