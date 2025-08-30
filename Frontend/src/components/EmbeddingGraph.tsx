import React, { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Line } from "@react-three/drei";

// Compute Euclidean distance between two vectors
const distance = (a: number[], b: number[]) =>
  Math.sqrt(a.reduce((sum, val, i) => sum + (val - b[i]) ** 2, 0));

interface EmbeddingGraph3DProps {
  videoEmbeddings: number[][]; // e.g., [[x, y, z], ...]
  userEmbedding: number[]; // [x, y, z]
  topK?: number; // number of nearest neighbors to draw lines to
}

export default function EmbeddingGraph3D({
  videoEmbeddings,
  userEmbedding,
  topK = 3,
}: EmbeddingGraph3DProps) {
  // Find top-K nearest video embeddings to the user
  const nearest = useMemo(() => {
    return videoEmbeddings
      .map((v, idx) => ({ idx, dist: distance(v, userEmbedding) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, topK)
      .map((d) => d.idx);
  }, [videoEmbeddings, userEmbedding, topK]);

  return (
    <Canvas camera={{ position: [0, 0, 10], fov: 75 }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />

      {/* Video embeddings as small blue spheres */}
      {videoEmbeddings.map((vec, idx) => (
        <mesh key={idx} position={[vec[0], vec[1], vec[2]]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial color="blue" />
        </mesh>
      ))}

      {/* User embedding as big red sphere */}
      <mesh position={[userEmbedding[0], userEmbedding[1], userEmbedding[2]]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="red" />
      </mesh>

      {/* Lines from user to top-K nearest video embeddings */}
      {nearest.map((idx) => (
        <Line
          key={idx}
          points={[
            [userEmbedding[0], userEmbedding[1], userEmbedding[2]],
            [
              videoEmbeddings[idx][0],
              videoEmbeddings[idx][1],
              videoEmbeddings[idx][2],
            ],
          ]}
          color="yellow"
          lineWidth={2}
          dashed={false}
        />
      ))}

      <OrbitControls enablePan enableZoom enableRotate />
    </Canvas>
  );
}
