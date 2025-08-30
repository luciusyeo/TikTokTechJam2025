import csv
import sys

csv.field_size_limit(sys.maxsize)

csv_file = "data/interaction_filtered.csv"  # replace with your CSV path
output_file = "data/category_videos.txt"

target_category = "1168"  # <-- change this to any category_id

unique_videos = set()

with open(csv_file, newline='', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if row['category_id'] == target_category:
            unique_videos.add(row['pid'])

# Convert to JS array format
videos_list = list(unique_videos)
js_array = "[\n  " + ",\n  ".join(f'"{vid}"' for vid in videos_list) + "\n]"

# Write to file
with open(output_file, "w", encoding="utf-8") as f:
    f.write(js_array)

print(f"Category {target_category} has {len(unique_videos)} unique videos")
print(f"Saved list to {output_file}")
