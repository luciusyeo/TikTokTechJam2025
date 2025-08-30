import tensorflow as tf
from keras.models import Sequential
from keras.layers import Dense, Input
import keras

class BinaryMLP:
    def __init__(self, input_dim: int, hidden_dim):
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.model = Sequential([
            Input(shape=(input_dim,)),
            Dense(hidden_dim, activation='relu'), #each dense layer is arr of [weights], arr of bias
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

    
    def fit_with_dp(self, X, y, epochs=3, batch_size=16, noise_multiplier=0.5, clip_norm=1.0):
        """
        Train the model with simple custom differential privacy (gradient clipping + noise).
        
        Args:
            X: np.ndarray of shape (num_samples, input_dim)
            y: np.ndarray of shape (num_samples,)
            epochs: number of epochs
            batch_size: batch size
            noise_multiplier: standard deviation of Gaussian noise relative to clip_norm
            clip_norm: maximum L2 norm of per-sample gradients
        """
        dataset = tf.data.Dataset.from_tensor_slices((X, y)).shuffle(len(X)).batch(batch_size)
        optimizer = keras.optimizers.SGD(learning_rate=0.01)
        loss_fn = keras.losses.BinaryCrossentropy(from_logits=False)

        for epoch in range(epochs):
            for step, (x_batch, y_batch) in enumerate(dataset):
                with tf.GradientTape() as tape:
                    logits = self.model(x_batch, training=True)
                    loss = loss_fn(y_batch, logits)

                # Compute gradients
                grads = tape.gradient(loss, self.model.trainable_variables)

                # Clip gradients
                clipped_grads = []
                if grads is not None:
                    for g in grads:
                        norm = tf.norm(g)
                        clipped_grads.append(g * tf.minimum(1.0, clip_norm / (norm + 1e-6)))
                else:
                    continue  # Skip this batch if gradients are None

                # Add Gaussian noise
                noisy_grads = [
                    g + tf.random.normal(g.shape, stddev=noise_multiplier * clip_norm)
                    for g in clipped_grads
                ]

                # Apply gradients
                optimizer.apply_gradients(zip(noisy_grads, self.model.trainable_variables))

        return self  # optional: allows chaining like model.fit_with_dp(...).get_weights()

    def evaluate(self, X, y):
        return self.model.evaluate(X, y, verbose=0)
