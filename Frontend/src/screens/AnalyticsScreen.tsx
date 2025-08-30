import React, { useState, useRef } from "react";
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
import { supabase } from "../lib/supabase";
import { Video, ResizeMode } from "expo-av";
import EmbeddingGraph3D from "../components/EmbeddingGraph";

const { width } = Dimensions.get("window");
const COVER_WIDTH = (width - 60) / 2;
const COVER_HEIGHT = COVER_WIDTH * 1.2;

export default function AnalyticsScreen() {
  const router = useRouter();
  const [device1Videos, setDevice1Videos] = useState<any[]>([]);
  const [device2Videos, setDevice2Videos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Track visible videos to only play them
  const [activeVideoIndexes1, setActiveVideoIndexes1] = useState<number[]>([]);
  const [activeVideoIndexes2, setActiveVideoIndexes2] = useState<number[]>([]);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      // Device 1: videos 70-80
      const { data: device1Data, error: err1 } = await supabase
        .from("videos")
        .select("url")
        .gte("id", 70)
        .lte("id", 80);
      if (err1) throw err1;
      setDevice1Videos(device1Data || []);

      // Device 2: videos 70-80
      const { data: device2Data, error: err2 } = await supabase
        .from("videos")
        .select("url")
        .gte("id", 70)
        .lte("id", 80);
      if (err2) throw err2;
      setDevice2Videos(device2Data || []);
    } catch (error) {
      console.warn("Error fetching videos:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderCover = (
    videoUrl: string,
    index: number,
    activeIndexes: number[]
  ) => {
    const isActive = activeIndexes.includes(index);
    return (
      <Video
        source={{ uri: videoUrl }}
        style={{
          width: COVER_WIDTH,
          height: COVER_HEIGHT,
          marginBottom: 8,
          borderRadius: 6,
          backgroundColor: "#000",
        }}
        resizeMode={ResizeMode.COVER}
        shouldPlay={isActive}
        isLooping
        isMuted
        useNativeControls={false}
        posterSource={{ uri: videoUrl }} // show thumbnail while loading
      />
    );
  };

  const viewabilityConfig = { itemVisiblePercentThreshold: 50 };

  const onViewableItemsChanged1 = useRef(({ viewableItems }: any) => {
    setActiveVideoIndexes1(viewableItems.map((item: any) => item.index));
  }).current;

  const onViewableItemsChanged2 = useRef(({ viewableItems }: any) => {
    setActiveVideoIndexes2(viewableItems.map((item: any) => item.index));
  }).current;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Federated Learning Videos</Text>

      <TouchableOpacity style={styles.fetchButton} onPress={fetchVideos}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.fetchText}>Fetch Videos 70-80</Text>
        )}
      </TouchableOpacity>

      <View style={styles.listsContainer}>
        <View style={styles.listColumn}>
          <Text style={styles.deviceLabel}>Device 1</Text>
          <EmbeddingGraph3D
            userEmbedding={[0.1, 0.2, 0.3]}
            videoEmbeddings={[
              [0, 0, 0],
              [0.5, 0.1, -0.2],
              [-0.3, 0.4, 0.1],
              [0.2, -0.5, 0.3],
            ]}
          />
          <FlatList
            data={device1Videos}
            renderItem={({ item, index }) =>
              renderCover(item.url, index, activeVideoIndexes1)
            }
            keyExtractor={(item, idx) => `d1-${idx}`}
            showsVerticalScrollIndicator={false}
            initialNumToRender={3}
            windowSize={5}
            onViewableItemsChanged={onViewableItemsChanged1}
            viewabilityConfig={viewabilityConfig}
          />
        </View>

        <View style={styles.listColumn}>
          <Text style={styles.deviceLabel}>Device 2</Text>
          <FlatList
            data={device2Videos}
            renderItem={({ item, index }) =>
              renderCover(item.url, index, activeVideoIndexes2)
            }
            keyExtractor={(item, idx) => `d2-${idx}`}
            showsVerticalScrollIndicator={false}
            initialNumToRender={3}
            windowSize={5}
            onViewableItemsChanged={onViewableItemsChanged2}
            viewabilityConfig={viewabilityConfig}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 100,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
  },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 16 },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    padding: 8,
    backgroundColor: "#007AFF",
    borderRadius: 8,
  },
  backText: { color: "#fff", fontWeight: "bold" },
  fetchButton: {
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  fetchText: { color: "#fff", fontWeight: "bold", textAlign: "center" },
  listsContainer: { flexDirection: "row", justifyContent: "space-between" },
  listColumn: { flex: 1, marginHorizontal: 5 },
  deviceLabel: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
});
