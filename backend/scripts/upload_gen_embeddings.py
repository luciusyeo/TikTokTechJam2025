import numpy as np
from supabase import create_client, Client
import config

supabase: Client = create_client(config.SUPABASE_URL, config.SUPABASE_KEY)

embedding_dim = 16
num_scenery = 33  # ids 69-101
num_animal = 35   # ids 101-135
np.random.seed(42)

# -----------------------------
# Generate "weighted" embeddings like training
# -----------------------------
# Scenery: first 8 dims low, next 8 dims higher
video_vectors_scenery_new = np.random.rand(num_scenery, 8)*0.2  # animal dims low
video_vectors_scenery_new = np.hstack([video_vectors_scenery_new, np.random.rand(num_scenery, 8)*0.8])  # scenery dims high

# Animal: first 8 dims high, next 8 dims low
video_vectors_animal_new = np.random.rand(num_animal, 8)*0.8  # animal dims high
video_vectors_animal_new = np.hstack([video_vectors_animal_new, np.random.rand(num_animal, 8)*0.2])  # scenery dims low

# -----------------------------
# Update Supabase
# -----------------------------
for i, vec in enumerate(video_vectors_scenery_new, start=69):
    supabase.table("videos").update({
        "gen_vector": vec.tolist()
    }).eq("id", i).execute()

for i, vec in enumerate(video_vectors_animal_new, start=101):
    supabase.table("videos").update({
        "gen_vector": vec.tolist()
    }).eq("id", i).execute()

print("✅ Uploaded weighted 'gen_vector' embeddings to Supabase")
