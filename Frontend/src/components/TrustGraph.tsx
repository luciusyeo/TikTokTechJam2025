import React, { useEffect, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import Svg, {
  Line,
  Defs,
  RadialGradient,
  Stop,
  Circle,
} from "react-native-svg";
import Animated, {
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
} from "react-native-reanimated";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const MIN_TRUST = 0.4;

interface TrustNode {
  id: string;
  trust: number;
}
interface TrustEdge {
  source: string;
  target: string;
  trust: number;
}
interface Props {
  data: { nodes: TrustNode[]; edges: TrustEdge[] };
  canvasSize?: number;
}

export default function TrustGraph({ data, canvasSize = 300 }: Props) {
  const size = canvasSize;
  const center = size / 2;

  // Single shared pulse
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withSpring(1.1, { damping: 6, stiffness: 10 }),
        withSpring(1, { damping: 6, stiffness: 10 })
      ),
      -1,
      true
    );
  }, []);

  // Node positions
  const nodePositions = useMemo(() => {
    const n = data.nodes.length;
    return data.nodes.map((node, i) => {
      const angle = (i / n) * 2 * Math.PI;
      const connectedEdges = data.edges.filter(
        (e) => e.source === node.id || e.target === node.id
      );
      const avgTrust =
        connectedEdges.reduce((sum, e) => sum + e.trust, 0) /
        Math.max(connectedEdges.length, 1);
      const distance = (1 - avgTrust) * size * 0.35 + size * 0.1;
      return {
        ...node,
        x: center + Math.cos(angle) * distance,
        y: center + Math.sin(angle) * distance,
      };
    });
  }, [data, size]);

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="gradNodeTrust" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#00f0ff" stopOpacity="1" />
            <Stop offset="100%" stopColor="#0066ff" stopOpacity="0.8" />
          </RadialGradient>
          <RadialGradient id="gradNodeLowTrust" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#ff80c0" stopOpacity="1" />
            <Stop offset="100%" stopColor="#ff0000" stopOpacity="0.8" />
          </RadialGradient>
        </Defs>

        {/* Edges */}
        {data.edges.map((edge, i) => {
          const source = nodePositions.find((n) => n.id === edge.source)!;
          const target = nodePositions.find((n) => n.id === edge.target)!;
          const edgeColor = edge.trust > MIN_TRUST ? "#00f0ff" : "#ff4d4d";
          return (
            <Line
              key={i}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke={edgeColor}
              strokeWidth={Math.max(edge.trust * 6, 1.5)}
              opacity={0.5 + edge.trust * 0.5}
            />
          );
        })}

        {/* Nodes */}
        {nodePositions.map((node) => {
          const radius = Math.max(node.trust * 18, 6) * pulse.value;
          return (
            <AnimatedCircle
              key={node.id}
              cx={node.x}
              cy={node.y}
              r={radius}
              fill={
                node.trust > MIN_TRUST
                  ? "url(#gradNodeTrust)"
                  : "url(#gradNodeLowTrust)"
              }
              opacity={0.9}
            />
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center", padding: 20 },
});
