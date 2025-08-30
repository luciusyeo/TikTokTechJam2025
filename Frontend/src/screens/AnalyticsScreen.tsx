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
import { supabase } from "../lib/supabase";

const { width } = Dimensions.get("window");
const COVER_WIDTH = (width - 48) / 2; // 2 columns with spacing
const COVER_HEIGHT = COVER_WIDTH * 0.75; // shorter videos
const TIMER = 10 * 1000;

const USER_VECTOR_URL = "http://localhost:8000/user_vector";
const RECOMMEND_URL = "http://localhost:8000/recommend";

export default function AnalyticsScreen() {
  const router = useRouter();
  const [clientVectors, setClientVectors] = useState<Record<string, number[]>>(
    {}
  );
  const [videos, setVideos] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (Object.keys(clientVectors).length === 0) return;
      setLoading(true);
      const newVideos: Record<string, any[]> = {};

      try {
        for (const clientId of Object.keys(clientVectors)) {
          const userVector = clientVectors[clientId];
          if (!userVector) continue;

          // 1) Call /recommend endpoint
          const res = await fetch(RECOMMEND_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_vector: userVector, top_k: 6 }),
          });

          const data = await res.json();
          const topVideos = data.recommendations || [];

          // 2) Fetch gen_vector from Supabase
          const videoIds = topVideos.map((v: any) => v.id);
          const { data: vectorData, error } = await supabase
            .from("videos")
            .select("id, gen_vector, url")
            .in("id", videoIds);

          if (error) throw error;

          // 3) Map gen_vector back to videos
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

  const renderCover = (videoUrl: string, rank: number) => (
    <View style={styles.videoCard}>
      {/* Rank label */}
      <View style={styles.rankLabel}>
        <Text style={styles.rankText}>{rank + 1}</Text>
      </View>

      <Video
        source={{ uri: videoUrl }}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        shouldPlay={true}
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
      <Text style={styles.title}>Federated Learning Analytics</Text>

      <FlatList
        data={Object.keys(clientVectors)}
        keyExtractor={(clientId) => clientId}
        contentContainerStyle={{ paddingTop: 80, paddingHorizontal: 16 }}
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
                scrollEnabled={false} // keep vertical scroll in outer FlatList
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
  backText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  clientContainer: {
    marginBottom: 24,
  },
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
  video: {
    width: "100%",
    height: "100%",
  },
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
  rankText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
});
