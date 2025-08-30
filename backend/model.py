from keras.models import Sequential
from keras.layers import Dense, Input
import keras
import tensorflow as tf

class BinaryMLP:
    def __init__(self, input_dim: int, hidden_dim: int = 64):
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.model = Sequential([
            Input(shape=(input_dim,)),
            Dense(hidden_dim, activation='relu'),
            Dense(hidden_dim, activation='relu'),
            Dense(1, activation='sigmoid')
        ])
        self.model.compile(
            loss='binary_crossentropy',
            optimizer=keras.optimizers.SGD(learning_rate=0.01, momentum=0.9),
            metrics=['accuracy']
        )

    def forward(self, user_vec, video_vec):
        """Forward pass for prediction"""
        x = tf.concat([user_vec, video_vec], axis=-1)
        return self.model(x, training=False)

    def get_weights(self):
        """Return model weights as a list of numpy arrays"""
        return self.model.get_weights()

    def set_weights(self, weights):
        """Set model weights from a list of numpy arrays"""
        self.model.set_weights(weights)

    def fit(self, X, y, epochs=1, batch_size=None):
        """Train the model locally"""
        self.model.fit(X, y, epochs=epochs, batch_size=batch_size, verbose=0)

    def evaluate(self, X, y):
        return self.model.evaluate(X, y, verbose=0)
