import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { Video } from "../types";

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface VideoCardProps {
  video: Video;
  isActive: boolean;
  index: number;
}

export default function VideoCard({ video, isActive, index }: VideoCardProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Video: {video.id}</Text>
      <Text style={styles.caption}>{video.caption}</Text>
      <Text style={styles.author}>@{video.author.name}</Text>
      <Text style={styles.stats}>
        ❤️ {video.stats.likes} 💬 {video.stats.comments}
      </Text>
      {isActive && <Text style={styles.activeIndicator}>▶️ PLAYING</Text>}
      
      {/* Placeholder for future video player */}
      <View style={styles.videoPlaceholder}>
        <Text style={styles.videoText}>
          🎬 Video Player{"\n"}
          (expo-av implementation pending)
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: screenWidth,
    height: screenHeight,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  placeholder: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20,
  },
  caption: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
    marginHorizontal: 20,
    marginBottom: 10,
  },
  author: {
    fontSize: 14,
    color: "#ccc",
    marginBottom: 10,
  },
  stats: {
    fontSize: 14,
    color: "#fff",
    marginBottom: 10,
  },
  activeIndicator: {
    position: "absolute",
    top: 60,
    right: 20,
    fontSize: 16,
    color: "#ff0040",
    fontWeight: "bold",
  },
  videoPlaceholder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  videoText: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
  },
});