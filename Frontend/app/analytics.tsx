import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

export default function AnalyticsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Back button */}
      <Text style={styles.title}>Analytics</Text>
      <Text>Views: 1234</Text>
      <Text>Likes: 567</Text>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 100,
    paddingHorizontal: 30,
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
});
