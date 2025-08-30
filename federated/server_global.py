import numpy as np
from mock_api import get_client_update, load_global_model

shape = (512,)

def fedavg(client_weights):
    """
    Federated averaging: average client weight updates.
    client_weights: list of np.ndarrays
    """
    # return 1D weighted array
    new_global_weights = np.mean(np.stack(client_weights, axis=0), axis=0)
    return new_global_weights

def server_round(num_clients=5, shape=shape):
    """
    Simulate one round of federated aggregation.
    """
    client_updates = []
    
    for _ in range(num_clients):
        update = get_client_update(shape)
        client_updates.append(update)
    
    new_global = fedavg(client_updates)
    
    del client_updates
    
    return new_global

def federated_learning(rounds):
    global_model = load_global_model()
    for round in range(rounds):
        print(f"\n--- Round {round+1} ---")
        global_model = server_round(num_clients=5, shape=shape)
        print("New global model:", global_model)
