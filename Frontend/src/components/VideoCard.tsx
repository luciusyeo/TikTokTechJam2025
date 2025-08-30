import React, { useEffect, useRef } from "react";
import { View, Text, useWindowDimensions, TouchableOpacity } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  cancelAnimation,
} from "react-native-reanimated";
import { useFeed } from "../state";
import { Video } from "../types";
import { ErrorBoundary } from "./ErrorBoundary";

interface VideoCardProps {
  video: Video;
  isActive: boolean;
}

export default function VideoCard({ video, isActive }: VideoCardProps) {
  const { width, height } = useWindowDimensions();
  const { toggleLike } = useFeed();
  const isMountedRef = useRef(true);
  
  // Create video player with configuration
  const player = useVideoPlayer(video.src, (player) => {
    player.loop = true;
    player.muted = true;
  });
  
  // Animation values for heart burst
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);

  // Auto-play control
  useEffect(() => {
    if (isActive) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, player]);

  // Cleanup animations on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      cancelAnimation(heartScale);
      cancelAnimation(heartOpacity);
    };
  }, [heartScale, heartOpacity]);

  // Heart burst animation
  const triggerHeartBurst = () => {
    if (!isMountedRef.current) return;
    
    heartScale.value = 0;
    heartOpacity.value = 1;
    
    heartScale.value = withSequence(
      withSpring(1.5, { damping: 8, stiffness: 200 }),
      withSpring(0, { damping: 8, stiffness: 200 })
    );
    
    heartOpacity.value = withSequence(
      withSpring(1, { duration: 200 }),
      withSpring(0, { duration: 300 }, () => {
        if (isMountedRef.current) {
          heartScale.value = 0;
          heartOpacity.value = 0;
        }
      })
    );
  };

  const handleDoubleTap = () => {
    try {
      toggleLike(video.id);
      triggerHeartBurst();
    } catch (error) {
      console.warn("Error handling double tap:", error);
    }
  };

  const handleSingleTapLike = () => {
    toggleLike(video.id);
  };

  const animatedHeartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
    opacity: heartOpacity.value,
  }));

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      try {
        handleDoubleTap();
      } catch (error) {
        console.warn("Gesture handler error:", error);
      }
    });

  return (
    <ErrorBoundary>
      <View className="flex-1" style={{ width, height }}>
        <View className="flex-1">
          <VideoView
            player={player}
            style={{ 
              width, 
              height,
              backgroundColor: 'black'
            }}
            contentFit="cover"
            nativeControls={false}
          />
          
          <GestureDetector gesture={doubleTapGesture}>
            <View className="absolute inset-0">
              {/* Heart burst animation overlay */}
              <Animated.View
                className="absolute inset-0 items-center justify-center pointer-events-none"
                style={animatedHeartStyle}
              >
                <Text className="text-red-500 text-8xl">❤️</Text>
              </Animated.View>
            </View>
          </GestureDetector>
          
          {/* Action Rail */}
          <View className="absolute right-4 bottom-32 gap-6">
            <TouchableOpacity
              onPress={handleSingleTapLike}
              className="items-center"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text className={`text-4xl ${video.meLiked ? "text-red-500" : "text-white"}`}>
                {video.meLiked ? "❤️" : "🤍"}
              </Text>
              <Text className="text-white text-sm font-semibold mt-1">
                {video.stats.likes}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              className="items-center"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text className="text-white text-4xl">💬</Text>
              <Text className="text-white text-sm font-semibold mt-1">
                {video.stats.comments}
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Caption and Author Info */}
          <View className="absolute bottom-8 left-4 right-20">
            <Text className="text-white text-base font-semibold mb-2" 
                  style={{ textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 3 }}>
              @{video.author.name}
            </Text>
            <Text className="text-white text-sm leading-5"
                  style={{ textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 3 }}>
              {video.caption}
            </Text>
          </View>
        </View>
      </View>
    </ErrorBoundary>
  );
}