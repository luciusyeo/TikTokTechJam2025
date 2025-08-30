import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
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
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      )}

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.mainTitle}>
          Federated Learning Analytics
        </Text>

        <View style={styles.trustGraphSection}>
          <Text style={styles.sectionTitle}>
            Trust Graph
          </Text>
          <View style={styles.trustGraphContainer}>
            <TrustGraph data={trustGraphData} canvasSize={280} />
          </View>
        </View>

        {Object.keys(clientVectors).map((clientId, index) => {
          const clientVideos = videos[clientId] || [];
          const userVec = clientVectors[clientId] || [];
          return (
            <View key={clientId}>
              {index > 0 && <View style={styles.deviceSeparator} />}
              <View style={styles.deviceCard}>
                <Text style={styles.deviceLabel}>Device {clientId}</Text>

                <View style={styles.embeddingGraphContainer}>
                  <EmbeddingGraph
                    videoEmbeddings={clientVideos.map((v) => v.vector || userVec)}
                    userEmbedding={userVec}
                  />
                </View>

                <View style={styles.videoGrid}>
                  {Array.from({ length: Math.ceil(clientVideos.length / 2) }).map((_, rowIndex) => (
                    <View key={`row-${rowIndex}`} style={styles.videoRow}>
                      {clientVideos.slice(rowIndex * 2, rowIndex * 2 + 2).map((item, colIndex) => (
                        <View key={`${clientId}-video-${rowIndex * 2 + colIndex}`}>
                          {renderCover(item.url, rowIndex * 2 + colIndex)}
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(18, 18, 18, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    zIndex: 9999,
  },
  backText: { 
    color: "#fff", 
    fontWeight: "700", 
    fontSize: 16 
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 100,
    paddingBottom: 32,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginBottom: 32,
  },
  trustGraphSection: {
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  trustGraphContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 16,
  },
  deviceCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 24,
  },
  deviceSeparator: {
    height: 16,
  },
  deviceLabel: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    color: "#E5E7EB",
    textAlign: "center",
  },
  embeddingGraphContainer: {
    marginBottom: 20,
    alignItems: "center",
  },
  videoGrid: {
    paddingTop: 8,
  },
  videoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  videoCard: {
    width: COVER_WIDTH - 8,
    height: COVER_HEIGHT,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#2a2a2a",
    borderWidth: 1,
    borderColor: "#333",
  },
  video: { 
    width: "100%", 
    height: "100%" 
  },
  rankLabel: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  rankText: { 
    color: "#fff", 
    fontWeight: "700", 
    fontSize: 12 
  },
});
