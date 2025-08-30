import torch
import torch.nn as nn

class Recommender(nn.Module):
    def __init__(self, user_dim=16, video_dim=16, hidden_dim=32):
        super().__init__()
        self.fc1 = nn.Linear(user_dim + video_dim, hidden_dim)
        self.fc2 = nn.Linear(hidden_dim, 1)
        self.sigmoid = nn.Sigmoid()

    def forward(self, user_vec, video_vec):
        x = torch.cat([user_vec, video_vec], dim=-1)
        return self.sigmoid(self.fc2(torch.relu(self.fc1(x))))