import React from "react";
import { View, Text, useWindowDimensions } from "react-native";
import { Video } from "../types";

interface VideoCardProps {
  video: Video;
  isActive: boolean;
  index: number;
}

export default function VideoCard({ video, isActive, index }: VideoCardProps) {
  const { width, height } = useWindowDimensions();
  
  return (
    <View className="flex-1 bg-black items-center justify-center" style={{ width, height }}>
      <Text className="text-white text-2xl font-bold mb-2">Video: {video.id}</Text>
      <Text className="text-white text-lg mb-1">{video.caption}</Text>
      <Text className="text-gray-400 mb-4">@{video.author.name}</Text>
      <View className="flex-row gap-4 mb-6">
        <Text className="text-white">❤️ {video.stats.likes}</Text>
        <Text className="text-white">💬 {video.stats.comments}</Text>
      </View>
      {isActive && (
        <Text className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium mb-4">
          ▶️ PLAYING
        </Text>
      )}
      
      {/* Placeholder for future video player */}
      <View className="bg-gray-800 p-6 rounded-lg items-center justify-center w-5/6">
        <Text className="text-white text-center text-lg">
          🎬 Video Player{"\n"}
          <Text className="text-gray-400 text-sm">(expo-av implementation pending)</Text>
        </Text>
      </View>
    </View>
  );
}