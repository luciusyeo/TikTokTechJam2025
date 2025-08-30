import React, { useEffect, useRef, useState } from "react";
import { View, Text, useWindowDimensions, TouchableOpacity } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  cancelAnimation,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useFeed } from "../state";
import { Video } from "../types";
import { ErrorBoundary } from "./ErrorBoundary";
import { recordInteraction } from "../lib/ml";

interface VideoCardProps {
  video: Video;
  isActive: boolean;
}

export default function VideoCard({ video, isActive }: VideoCardProps) {
  const { width, height } = useWindowDimensions();
  const { toggleLike, openComments } = useFeed();
  const isMountedRef = useRef(true);
  const [isPaused, setIsPaused] = useState(false);
  
  // Create video player with configuration
  const player = useVideoPlayer(video.src, (player) => {
    player.loop = true;
    player.muted = true;
  });
  
  // Animation values for heart burst
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);
  const heartRotation = useSharedValue(0);
  
  // Button press animations
  const likeButtonScale = useSharedValue(1);
  const commentButtonScale = useSharedValue(1);
  
  // Pause indicator animation
  const pauseIconOpacity = useSharedValue(0);
  const pauseIconScale = useSharedValue(0.8);

  // Auto-play control with manual pause respect
  useEffect(() => {
    if (isActive && !isPaused) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, isPaused, player]);
  
  // Reset pause state when video becomes inactive
  useEffect(() => {
    if (!isActive && isPaused) {
      setIsPaused(false);
      // Also reset pause icon animations
      pauseIconOpacity.value = 0;
      pauseIconScale.value = 0.8;
    }
  }, [isActive, isPaused, pauseIconOpacity, pauseIconScale]);

  // Cleanup animations on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      cancelAnimation(heartScale);
      cancelAnimation(heartOpacity);
      cancelAnimation(pauseIconOpacity);
      cancelAnimation(pauseIconScale);
    };
  }, [heartScale, heartOpacity, pauseIconOpacity, pauseIconScale]);

  // Enhanced heart burst animation with rotation
  const triggerHeartBurst = () => {
    if (!isMountedRef.current) return;
    
    // Reset values
    heartScale.value = 0;
    heartOpacity.value = 1;
    heartRotation.value = 0;
    
    // Scale animation
    heartScale.value = withSequence(
      withSpring(1.6, { damping: 10, stiffness: 300 }),
      withSpring(0, { damping: 8, stiffness: 200 })
    );
    
    // Opacity animation with precise 450ms timing
    heartOpacity.value = withSequence(
      withTiming(1, { duration: 150 }),
      withTiming(0, { duration: 300 }, () => {
        if (isMountedRef.current) {
          heartScale.value = 0;
          heartOpacity.value = 0;
          heartRotation.value = 0;
        }
      })
    );
    
    // Subtle rotation for dynamic effect
    heartRotation.value = withSequence(
      withTiming(15, { duration: 225 }),
      withTiming(-15, { duration: 225 })
    );
  };

  const handleDoubleTap = async () => {
    try {
      // Haptic feedback on double tap
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      recordInteraction({
        videoId: video.id,
        action: video.meLiked ? 'unlike' : 'like',
        value: 1,
        timestamp: Date.now(),
      });
      toggleLike(video.id);
      triggerHeartBurst();
    } catch (error) {
      console.warn("Error handling double tap:", error);
    }
  };

  const handleSingleTapLike = async () => {
    try {
      // Haptic feedback on like button tap
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Button press animation
      likeButtonScale.value = withSequence(
        withTiming(0.9, { duration: 100 }),
        withTiming(1, { duration: 100 })
      );
      
      recordInteraction({
        videoId: video.id,
        action: video.meLiked ? 'unlike' : 'like',
        value: 1,
        timestamp: Date.now(),
      });
      toggleLike(video.id);
    } catch (error) {
      console.warn("Error handling like tap:", error);
    }
  };

  const handleCommentsPress = async () => {
    try {
      // Haptic feedback on comments button tap
      await Haptics.selectionAsync();
      
      // Button press animation
      commentButtonScale.value = withSequence(
        withTiming(0.9, { duration: 100 }),
        withTiming(1, { duration: 100 })
      );
      
      openComments(video.id);
    } catch (error) {
      console.warn("Error handling comments press:", error);
    }
  };

  const handleSingleTap = async () => {
    try {
      // Toggle pause state
      setIsPaused(prev => !prev);
      
      // Trigger pause icon animation
      if (!isPaused) {
        // Show pause icon
        pauseIconOpacity.value = withSequence(
          withTiming(1, { duration: 150 }),
          withTiming(0, { duration: 800 })
        );
        pauseIconScale.value = withSequence(
          withTiming(1, { duration: 150 }),
          withTiming(0.8, { duration: 800 })
        );
      }
      
      // Light haptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.warn("Error handling single tap:", error);
    }
  };

  const animatedHeartStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: heartScale.value },
      { rotate: `${heartRotation.value}deg` }
    ],
    opacity: heartOpacity.value,
  }));
  
  const animatedLikeButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeButtonScale.value }],
  }));
  
  const animatedCommentButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: commentButtonScale.value }],
  }));
  
  const animatedPauseIconStyle = useAnimatedStyle(() => ({
    opacity: pauseIconOpacity.value,
    transform: [{ scale: pauseIconScale.value }],
  }));

  const singleTapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .maxDelay(250)
    .onEnd(() => {
      try {
        handleSingleTap();
      } catch (error) {
        console.warn("Single tap gesture error:", error);
      }
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      try {
        handleDoubleTap();
      } catch (error) {
        console.warn("Double tap gesture error:", error);
      }
    });

  // Combine gestures with double tap taking priority
  const tapGesture = Gesture.Exclusive(
    doubleTapGesture,
    singleTapGesture
  );

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
          
          <GestureDetector gesture={tapGesture}>
            <View className="absolute inset-0">
              {/* Heart burst animation overlay */}
              <Animated.View
                className="absolute inset-0 items-center justify-center pointer-events-none"
                style={animatedHeartStyle}
              >
                <Text className="text-red-500 text-8xl">❤️</Text>
              </Animated.View>
              
              {/* Pause indicator overlay */}
              <Animated.View
                className="absolute inset-0 items-center justify-center pointer-events-none"
                style={animatedPauseIconStyle}
              >
                <View className="bg-black bg-opacity-60 rounded-full p-4">
                  <Text className="text-white text-6xl">⏸️</Text>
                </View>
              </Animated.View>
            </View>
          </GestureDetector>
          
          {/* Action Rail - Enhanced with better spacing and styling */}
          <View className="absolute right-4 bottom-32 gap-6">
            <Animated.View style={animatedLikeButtonStyle}>
              <TouchableOpacity
                onPress={handleSingleTapLike}
                className="items-center p-3"
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              >
                <View className="items-center">
                  <Text className={`text-4xl ${video.meLiked ? "text-red-500" : "text-white"}`}
                        style={{
                          textShadowColor: 'rgba(0, 0, 0, 0.8)',
                          textShadowOffset: {width: 0, height: 2},
                          textShadowRadius: 4
                        }}>
                    {video.meLiked ? "❤️" : "🤍"}
                  </Text>
                  <Text className="text-white text-xs font-bold mt-1"
                        style={{
                          textShadowColor: 'rgba(0, 0, 0, 1)',
                          textShadowOffset: {width: 0, height: 1},
                          textShadowRadius: 2
                        }}>
                    {video.stats.likes > 999 ? `${(video.stats.likes / 1000).toFixed(1)}K` : video.stats.likes}
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
            
            <Animated.View style={animatedCommentButtonStyle}>
              <TouchableOpacity
                onPress={handleCommentsPress}
                className="items-center p-3"
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              >
                <View className="items-center">
                  <Text className="text-white text-4xl"
                        style={{
                          textShadowColor: 'rgba(0, 0, 0, 0.8)',
                          textShadowOffset: {width: 0, height: 2},
                          textShadowRadius: 4
                        }}>💬</Text>
                  <Text className="text-white text-xs font-bold mt-1"
                        style={{
                          textShadowColor: 'rgba(0, 0, 0, 1)',
                          textShadowOffset: {width: 0, height: 1},
                          textShadowRadius: 2
                        }}>
                    {video.stats.comments > 999 ? `${(video.stats.comments / 1000).toFixed(1)}K` : video.stats.comments}
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </View>
          
          {/* Caption and Author Info - Enhanced with gradient overlay */}
          <View className="absolute bottom-0 left-0 right-0">
            {/* Gradient overlay for better text readability */}
            <View 
              className="absolute bottom-0 left-0 right-0 h-32"
              style={{
                backgroundColor: 'rgba(0,0,0,0.6)',
              }}
            />
            <View className="px-4 pb-8 pt-16">
              <Text className="text-white text-lg font-bold mb-2" 
                    style={{ 
                      textShadowColor: 'rgba(0, 0, 0, 1)', 
                      textShadowOffset: {width: 0, height: 2}, 
                      textShadowRadius: 4,
                      letterSpacing: 0.5
                    }}>
                @{video.author.name}
              </Text>
              <Text className="text-white text-sm leading-6"
                    style={{ 
                      textShadowColor: 'rgba(0, 0, 0, 0.9)', 
                      textShadowOffset: {width: 0, height: 1}, 
                      textShadowRadius: 3,
                      opacity: 0.95
                    }}>
                {video.caption}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ErrorBoundary>
  );
}