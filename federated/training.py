import numpy as np
from keras.models import Sequential
from keras.layers import Dense, Input

# ----------------------------
# Parameters
# ----------------------------
num_videos = 100
embedding_dim = 16  # 8 animal + 8 scenery
hidden_dim = 128  # increased hidden dimension
np.random.seed(42)

# ----------------------------
# Video embeddings
# ----------------------------
video_embeddings = np.random.rand(num_videos, embedding_dim)

# ----------------------------
# User embeddings
# ----------------------------
animal_lover = np.array([0.8]*8 + [0.2]*8)
scenery_lover = np.array([0.2]*8 + [0.8]*8)

# Add smaller noise
animal_lover_noisy = animal_lover + np.random.normal(0, 0.005, size=animal_lover.shape)
scenery_lover_noisy = scenery_lover + np.random.normal(0, 0.005, size=scenery_lover.shape)

# ----------------------------
# Labels with small discrepancy
# ----------------------------
labels_animal_lover = np.array([1]*50 + [0]*50)
labels_scenery_lover = np.array([0]*50 + [1]*50)

# Introduce small discrepancy (5% of videos mislabeled)
discrepancy_idx = np.random.choice(num_videos, size=5, replace=False)
labels_animal_lover[discrepancy_idx] = 0
labels_scenery_lover[discrepancy_idx] = 1

# ----------------------------
# Construct training data
# ----------------------------
X_animal_lover = np.hstack([np.tile(animal_lover_noisy, (num_videos,1)), video_embeddings])
X_scenery_lover = np.hstack([np.tile(scenery_lover_noisy, (num_videos,1)), video_embeddings])
X_train = np.vstack([X_animal_lover, X_scenery_lover])
y_train = np.hstack([labels_animal_lover, labels_scenery_lover])

# ----------------------------
# Build MLP model
# ----------------------------
def build_binary_mlp(input_dim):
    model = Sequential()
    model.add(Input(shape=(input_dim,)))
    model.add(Dense(hidden_dim, activation='relu'))
    model.add(Dense(hidden_dim, activation='relu'))
    model.add(Dense(1, activation='sigmoid'))
    model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
    return model

model = build_binary_mlp(X_train.shape[1])

# ----------------------------
# Train
# ----------------------------
model.fit(X_train, y_train, epochs=50, batch_size=16, verbose=1)

# ----------------------------
# Evaluate
# ----------------------------
preds = model.predict(X_train[:10])
print("Preds (first 10):", preds.ravel())
print("True labels (first 10):", y_train[:10])

# Show user embeddings for reference
print("Animal lover embedding:", animal_lover_noisy)
print("Scenery lover embedding:", scenery_lover_noisy)
