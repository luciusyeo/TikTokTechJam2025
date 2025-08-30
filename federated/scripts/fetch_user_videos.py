import csv
from collections import defaultdict
import sys

csv.field_size_limit(sys.maxsize)

# ---- Specify user_id here ----
target_user = "1765"   # replace with actual user_id you want to inspect

# Path to your CSV file
csv_file = "data/interaction_filtered.csv"  # replace with your CSV path

# Dictionary to store unique videos per user
user_videos = set()
user_videos_effective = set()

# Read CSV line by line
with open(csv_file, newline='', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    
    if reader.fieldnames is None or not {'user_id', 'pid'}.issubset(reader.fieldnames):
        raise ValueError("CSV must contain 'user_id' and 'pid' columns")
    
    for row in reader:
        if row['user_id'] == target_user:
            user_videos.add(row['pid'])
            if int(row['watch_time']) >= 3:
                user_videos_effective.add(row['pid'])


print("User:", target_user)
print("Videos watched:", len(user_videos))
print("Effective videos (watch_time >= 3):", len(user_videos_effective))
