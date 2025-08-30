# import numpy as np
# import os

# feat_dir = "/Users/luciusyeojunjie/Desktop/TikTokTechJam2025/federated/data"  # folder with .npy files
# files = [f for f in os.listdir(feat_dir) if f.endswith(".npy")]

# print("Total files:", len(files))

# for i, file_name in enumerate(files[:2]):  # first 5 files
#     file_path = os.path.join(feat_dir, file_name)
#     data = np.load(file_path)
#     print(f"\nFile {i+1}: {file_name}")
#     print("Shape:", data.shape)
#     print("Length col:", len(data[0]))
#     print("Length rows:", len(data))
#     print("First 5 values:", data.flatten()[:5])

from federated.utils import load_embeddings_and_labels
embedding_path = '/Users/luciusyeojunjie/Desktop/TikTokTechJam2025/federated/data'
X, y = load_embeddings_and_labels(embedding_path)
print(X.shape, y.shape)
