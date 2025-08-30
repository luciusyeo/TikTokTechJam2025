import numpy as np
from data_layer import create_clients, load, prepare_test_set
from trainer import federated_training, standard_sgd_training
from utils import batch_data
from mock_local_env import local_trainer

def get_global_weights():
    #TODO: to fix the weight arr, expects actually 6 layers
    rng = np.random.default_rng(42)
    return rng.random(512)

def train_locally():
    global_model = get_global_weights()
    X_train, X_test, y_train, y_test = load()

    user_dim = 64
    video_dim = X_train.shape[1]
    input_dim = video_dim + user_dim
    user_embedding = np.random.rand(X_train.shape[0], input_dim - X_train.shape[1]).astype(np.float32)

    new_weights = local_trainer(global_model, user_embedding, X_train, y_train, input_dim)
    print("Standard SGD training finished!")
    return new_weights # to send to server for aggregation


if __name__ == "__main__":
    X_train, X_test, y_train, y_test = load()

    num_clients = 2
    user_dim = 64
    video_dim = X_train.shape[1] # gets embedding size
    input_dim = video_dim + user_dim

    clients = create_clients(X_train, y_train, num_clients=num_clients, user_dim=user_dim)
    clients_batched = {name: batch_data(data, bs=len(data)) for name, data in clients.items()}
    test_batched = prepare_test_set(X_test, y_test, user_dim=user_dim)

    print("Starting federated training...")
    global_model = federated_training(clients_batched, test_batched, input_dim)
    print("Federated training finished!")

    print("Starting standard SGD training...")
    standard_sgd_model = standard_sgd_training(X_train, y_train, test_batched, input_dim)
    print("Standard SGD training finished!")


'''
if __name__ == "__main__":
    embedding_path = '/Users/luciusyeojunjie/Desktop/TikTokTechJam2025/federated/data'
    X_train, X_test, y_train, y_test = load(embedding_path)

    num_clients = 3
    user_dim = 64
    video_dim = X_train.shape[1] # embedding size
    input_dim = video_dim + user_dim

    clients = create_clients(X_train, y_train, num_clients=num_clients, user_dim=user_dim)
    clients_batched = {name: batch_data(data, bs=len(data)) for name, data in clients.items()}
    test_batched = prepare_test_set(X_test, y_test, user_dim=user_dim)

    print("Starting federated training...")
    global_model = federated_training(clients_batched, test_batched, input_dim)
    print("Federated training finished!")

    print("Starting standard SGD training...")
    standard_sgd_model = standard_sgd_training(X_train, y_train, test_batched, input_dim)
    print("Standard SGD training finished!")
'''