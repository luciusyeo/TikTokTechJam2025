import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Video, ResizeMode } from "expo-av";
import EmbeddingGraph from "../components/EmbeddingGraph";
import TrustGraph from "../components/TrustGraph";
import { supabase } from "../lib/supabase";

const { width } = Dimensions.get("window");
const COVER_WIDTH = (width - 48) / 2;
const COVER_HEIGHT = COVER_WIDTH * 0.75;
const TIMER = 10 * 1000;

const USER_VECTOR_URL = "http://localhost:8000/user_vector";
const RECOMMEND_URL = "http://localhost:8000/recommend";
const TRUST_GRAPH_URL = "http://localhost:8000/trust_graph";

export default function AnalyticsScreen() {
  const router = useRouter();
  const [clientVectors, setClientVectors] = useState<Record<string, number[]>>(
    {}
  );
  const [videos, setVideos] = useState<Record<string, any[]>>({});
  const [trustGraphData, setTrustGraphData] = useState<{
    nodes: any[];
    edges: any[];
  }>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(false);

  // Fetch client vectors periodically
  useEffect(() => {
    const fetchClientVectors = async () => {
      try {
        const res = await fetch(USER_VECTOR_URL);
        const data = await res.json();
        setClientVectors(data.client_vectors || {});
      } catch (err) {
        console.warn("Error fetching client vectors:", err);
      }
    };
    fetchClientVectors();
    const interval = setInterval(fetchClientVectors, TIMER);
    return () => clearInterval(interval);
  }, []);

  // Fetch recommendations per client vector
  useEffect(() => {
    const fetchRecommendations = async () => {
      if (Object.keys(clientVectors).length === 0) return;
      setLoading(true);
      const newVideos: Record<string, any[]> = {};

      try {
        for (const clientId of Object.keys(clientVectors)) {
          const userVector = clientVectors[clientId];
          if (!userVector) continue;

          const res = await fetch(RECOMMEND_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_vector: userVector, top_k: 6 }),
          });
          const data = await res.json();
          const topVideos = data.recommendations || [];

          const videoIds = topVideos.map((v: any) => v.id);
          const { data: vectorData, error } = await supabase
            .from("videos")
            .select("id, gen_vector, url")
            .in("id", videoIds);
          if (error) throw error;

          const enrichedVideos = topVideos.map((v: any) => {
            const match = vectorData?.find((d: any) => d.id === v.id);
            return { ...v, vector: match?.gen_vector || userVector };
          });

          newVideos[clientId] = enrichedVideos;
        }
        setVideos(newVideos);
      } catch (err) {
        console.warn("Error fetching recommendations or vectors:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecommendations();
  }, [clientVectors]);

  // Fetch trust graph once
  useEffect(() => {
    const fetchTrustGraph = async () => {
      try {
        const res = await fetch(TRUST_GRAPH_URL);
        const data = await res.json();
        setTrustGraphData(data);
        console.log("trust graph: ", data);
      } catch (err) {
        console.warn("Error fetching trust graph:", err);
      }
    };

    fetchTrustGraph();
    const interval = setInterval(fetchTrustGraph, TIMER);
    return () => clearInterval(interval);
  }, []);

  const renderCover = (videoUrl: string, rank: number) => (
    <View style={styles.videoCard}>
      <View style={styles.rankLabel}>
        <Text style={styles.rankText}>{rank + 1}</Text>
      </View>
      <Video
        source={{ uri: videoUrl }}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping
        isMuted
        useNativeControls={false}
        posterSource={{ uri: videoUrl }}
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#121212" }}>
      <TouchableOpacity
        style={[styles.backButton, { backgroundColor: "#2563EB" }]}
        onPress={() => router.back()}
      >
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator color="#fff" />}
      <View style={{ paddingHorizontal: 16, marginTop: 30 }}>
        {/* Title */}
        <Text
          style={{
            fontSize: 26,
            fontWeight: "700",
            color: "#fff",
            textAlign: "center",
            marginBottom: 24,
          }}
        >
          Federated Learning Analytics
        </Text>

        {/* TrustGraph with label */}
        <View style={{ alignItems: "center" }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: "#fff",
              marginBottom: 12,
            }}
          >
            Trust Graph
          </Text>
          <TrustGraph data={trustGraphData} canvasSize={300} />
        </View>
      </View>

      <FlatList
        data={Object.keys(clientVectors)}
        keyExtractor={(clientId) => clientId}
        contentContainerStyle={{ paddingTop: 2, paddingHorizontal: 16 }}
        renderItem={({ item: clientId }) => {
          const clientVideos = videos[clientId] || [];
          const userVec = clientVectors[clientId] || [];
          return (
            <View style={styles.clientContainer}>
              <Text style={styles.deviceLabel}>Device {clientId}</Text>

              <EmbeddingGraph
                videoEmbeddings={clientVideos.map((v) => v.vector || userVec)}
                userEmbedding={userVec}
              />

              <FlatList
                data={clientVideos}
                renderItem={({ item, index }) => renderCover(item.url, index)}
                keyExtractor={(item, idx) => `${clientId}-video-${idx}`}
                numColumns={2}
                scrollEnabled={false}
                columnWrapperStyle={{
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
                contentContainerStyle={{ paddingBottom: 16 }}
              />
            </View>
          );
        }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    position: "absolute",
    top: 40,
    left: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    zIndex: 9999,
  },
  backText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  clientContainer: { marginBottom: 24 },
  deviceLabel: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    color: "#E5E7EB",
    textAlign: "center",
  },
  videoCard: {
    width: COVER_WIDTH,
    height: COVER_HEIGHT,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#1f1f1f",
  },
  video: { width: "100%", height: "100%" },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#fff",
    paddingTop: 30,
    marginBottom: 16,
    textAlign: "center",
  },
  rankLabel: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 10,
  },
  rankText: { color: "#fff", fontWeight: "700", fontSize: 12 },
});
