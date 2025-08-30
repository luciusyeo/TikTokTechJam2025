import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useFeed } from "../state";
import { fetchFeed } from "../lib/feed";

export default function FeedScreen() {
  const { videos, setVideos } = useFeed();

  useEffect(() => {
    const loadFeed = async () => {
      try {
        const feedData = await fetchFeed(0);
        setVideos(feedData);
      } catch (error) {
        console.error("Failed to load feed:", error);
      }
    };

    loadFeed();
  }, [setVideos]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>TikTok MVP Feed</Text>
      <Text style={styles.subtitle}>
        Loaded {videos.length} videos
      </Text>
      <Text style={styles.info}>
        Ready for Feed implementation (Section 3)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#ccc",
    marginBottom: 5,
  },
  info: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginTop: 20,
  },
});