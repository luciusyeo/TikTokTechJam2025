import React, { useEffect, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import Svg, {
  Circle,
  Line,
  Defs,
  RadialGradient,
  Stop,
} from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withSpring,
} from "react-native-reanimated";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  videoEmbeddings: number[][]; // [[x1, x2, ..., xn], ...]
  userEmbedding: number[]; // [x1, x2, ..., xn]
  k?: number;
  canvasSize?: number;
}

// PCA (approximate) to project to 2D: subtract mean, take first 2 dims
function pca2D(vectors: number[][]): number[][] {
  const dim = Math.max(...vectors.map((v) => v.length));
  const n = vectors.length;

  // Fill missing dimensions with 0
  const data = vectors.map((v) =>
    Array.from({ length: dim }, (_, i) => v[i] ?? 0)
  );

  // Center the data
  const mean = Array(dim).fill(0);
  data.forEach((v) => v.forEach((val, i) => (mean[i] += val)));
  for (let i = 0; i < dim; i++) mean[i] /= n;
  const centered = data.map((v) => v.map((val, i) => val - mean[i]));

  // Compute covariance matrix
  const cov: number[][] = Array.from({ length: dim }, () => Array(dim).fill(0));
  centered.forEach((v) => {
    for (let i = 0; i < dim; i++)
      for (let j = 0; j < dim; j++) cov[i][j] += (v[i] * v[j]) / (n - 1);
  });

  // Power iteration to get top 2 eigenvectors (simplified)
  function powerIteration(mat: number[][], numIter = 50) {
    let vec = Array(mat.length).fill(1);
    for (let k = 0; k < numIter; k++) {
      const next = mat.map((row, i) =>
        row.reduce((sum, val, j) => sum + val * vec[j], 0)
      );
      const norm = Math.sqrt(next.reduce((sum, x) => sum + x * x, 0));
      vec = next.map((x) => x / norm);
    }
    return vec;
  }

  const top1 = powerIteration(cov);

  // Remove top1 component to get second eigenvector (Gram-Schmidt)
  function projectOut(v: number[], onto: number[]) {
    const dot = v.reduce((sum, x, i) => sum + x * onto[i], 0);
    return v.map((x, i) => x - dot * onto[i]);
  }

  const residuals = centered.map((v) => projectOut(v, top1));
  const cov2: number[][] = Array.from({ length: dim }, () =>
    Array(dim).fill(0)
  );
  residuals.forEach((v) => {
    for (let i = 0; i < dim; i++)
      for (let j = 0; j < dim; j++) cov2[i][j] += (v[i] * v[j]) / (n - 1);
  });
  const top2 = powerIteration(cov2);

  // Project all points onto top1 and top2
  return centered.map((v) => [
    v.reduce((sum, x, i) => sum + x * top1[i], 0),
    v.reduce((sum, x, i) => sum + x * top2[i], 0),
  ]);
}

// Normalize 2D vectors to [0,1]
function normalize2DWithPadding(
  vectors: number[][],
  padding = 0.1
): number[][] {
  const xs = vectors.map((v) => v[0]);
  const ys = vectors.map((v) => v[1]);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs);
  const minY = Math.min(...ys),
    maxY = Math.max(...ys);

  const scaleX = maxX - minX === 0 ? 1 : maxX - minX;
  const scaleY = maxY - minY === 0 ? 1 : maxY - minY;

  return vectors.map((v) => [
    padding + ((v[0] - minX) / scaleX) * (1 - 2 * padding),
    padding + ((v[1] - minY) / scaleY) * (1 - 2 * padding),
  ]);
}

export default function EmbeddingGraph({
  videoEmbeddings,
  userEmbedding,
  k = 5,
  canvasSize = 300,
}: Props) {
  const size = canvasSize;

  // Project all vectors to 2D and normalize
  const { video2D, user2D } = useMemo(() => {
    const allVectors = [...videoEmbeddings, userEmbedding];
    const projected = pca2D(allVectors);
    const normalized = normalize2DWithPadding(projected, 0.1);
    return {
      video2D: normalized.slice(0, videoEmbeddings.length),
      user2D: normalized[normalized.length - 1],
    };
  }, [videoEmbeddings, userEmbedding]);

  const userX = useSharedValue(user2D[0] * size);
  const userY = useSharedValue(user2D[1] * size);
  const userPulse = useSharedValue(1);
  const videoPulse = useSharedValue(1);

  useEffect(() => {
    userX.value = user2D[0] * size;
    userY.value = user2D[1] * size;
  }, [user2D]);

  useEffect(() => {
    userPulse.value = withRepeat(
      withSequence(
        withSpring(1.1, { damping: 6, stiffness: 10 }),
        withSpring(1, { damping: 6, stiffness: 10 })
      ),
      -1,
      true
    );

    videoPulse.value = withRepeat(
      withSequence(
        withSpring(1.15, { damping: 6, stiffness: 30 }),
        withSpring(1, { damping: 6, stiffness: 30 })
      ),
      -1,
      true
    );
  }, []);

  const userProps = useAnimatedProps(() => ({
    cx: userX.value,
    cy: userY.value,
    r: 12 * userPulse.value,
  }));

  // Drifting video embeddings
  const driftingEmbeddings = video2D.map((v, i) => ({
    x: v[0] * size + Math.sin(Date.now() / 1500 + i) * 3,
    y: v[1] * size + Math.cos(Date.now() / 1800 + i) * 3,
    fullVector: videoEmbeddings[i],
  }));

  // k nearest neighbors using full vector space
  const neighbors = driftingEmbeddings
    .map((v) => {
      const dist = Math.sqrt(
        v.fullVector.reduce((sum, val, idx) => {
          const diff = val - (userEmbedding[idx] ?? 0);
          return sum + diff * diff;
        }, 0)
      );
      return { ...v, dist };
    })
    .sort((a, b) => a.dist - b.dist)
    .slice(0, k);

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <Defs>
          {/* User dot gradient: neon pink → purple */}
          <RadialGradient id="gradUser" cx="40%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#ff6aff" stopOpacity="1" />
            <Stop offset="50%" stopColor="#c400ff" stopOpacity="0.8" />
            <Stop offset="100%" stopColor="#6a00ff" stopOpacity="0.6" />
          </RadialGradient>

          {/* Video dots gradient: cyan → electric blue */}
          <RadialGradient id="gradVideo" cx="0%" cy="20%" r="70%">
            <Stop offset="0%" stopColor="#00fff6" stopOpacity="1" />
            <Stop offset="50%" stopColor="#00bfff" stopOpacity="0.8" />
            <Stop offset="100%" stopColor="#0055ff" stopOpacity="0.6" />
          </RadialGradient>
        </Defs>

        {driftingEmbeddings.map((v, i) => (
          <AnimatedCircle
            key={i}
            cx={v.x}
            cy={v.y}
            r={6 * videoPulse.value}
            fill="url(#gradVideo)"
            opacity={0.85}
          />
        ))}

        {neighbors.map((v, i) => (
          <Line
            key={`line-${i}`}
            x1={user2D[0] * size}
            y1={user2D[1] * size}
            x2={v.x + Math.sin(Date.now() / 1000 + i) * 2}
            y2={v.y + Math.cos(Date.now() / 1000 + i) * 2}
            stroke="url(#gradVideo)"
            strokeWidth={1.5}
            opacity={0.7}
          />
        ))}

        <AnimatedCircle fill="url(#gradUser)" animatedProps={userProps} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
});
