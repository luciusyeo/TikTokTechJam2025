from supabase import create_client, Client
import config

supabase_client: Client = create_client(config.SUPABASE_URL, config.SUPABASE_KEY)

new_video = {
    "gen_vector": [0.1, 0.2, 0.3],  # Example float8 array
    "url": "https://example.com/video1.mp4"
}

insert_response = supabase_client.table("videos").insert(new_video).execute()
print("Insert response:", insert_response)

# Fetch all videos
fetch_response = supabase_client.table("videos").select("*").execute()
print("Fetch response:", fetch_response)