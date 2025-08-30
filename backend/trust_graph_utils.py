import networkx as nx
import numpy as np
import matplotlib
matplotlib.use("Agg")  # non-GUI backend
import matplotlib.pyplot as plt
import os

def create_trust_graph(num_devices):
    G = nx.DiGraph()
    for i in range(num_devices):
        G.add_node(i, trust=1.0)  # start fully trusted
    return G

def update_trust(trust_graph, device_id, val_acc, alpha=0.9):
    """Smooth trust update per device based on validation accuracy"""
    old_trust = trust_graph.nodes[device_id]['trust']
    new_trust = alpha * old_trust + (1 - alpha) * val_acc
    trust_graph.nodes[device_id]['trust'] = np.clip(new_trust, 0.0, 1.0)

def add_device_to_trust_graph(trust_graph, device_id, initial_trust=1.0):
    # Add node if not present
    if device_id not in trust_graph.nodes:
        trust_graph.add_node(device_id, trust=initial_trust)

    # Add edges between this node and all existing nodes
    for other in trust_graph.nodes():
        if other != device_id:
            # From new node to existing nodes
            if not trust_graph.has_edge(device_id, other):
                trust_graph.add_edge(device_id, other, trust=initial_trust)
            # From existing nodes to new node
            if not trust_graph.has_edge(other, device_id):
                trust_graph.add_edge(other, device_id, trust=initial_trust)

def trust_graph_to_json(trust_graph):
    nodes = [
        {"id": str(n), "trust": float(trust_graph.nodes[n]["trust"])}
        for n in trust_graph.nodes()
    ]
    edges = [
        {"source": str(u), "target": str(v), "trust": float(trust_graph.edges[u, v]["trust"])}
        for u, v in trust_graph.edges()
    ]
    return {"nodes": nodes, "edges": edges}
