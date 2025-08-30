import React, { useEffect, useRef, useState } from "react";
import { View, Text, useWindowDimensions, TouchableOpacity } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
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
import { recordLike, recordViewed } from "../lib/ml";

interface VideoCardProps {
  video: Video;
  isActive: boolean;
}

export default function VideoCard({ video, isActive }: VideoCardProps) {
  const { width, height } = useWindowDimensions();
  const { toggleLike, openComments, updateUserVectorAfterLike } = useFeed();
  const isMountedRef = useRef(true);
  const [isPaused, setIsPaused] = useState(false);
  
  // Create video player with configuration
  const player = useVideoPlayer(video.src, (player) => {
    player.loop = true;
    player.muted = true;
  });
  
  // Enhanced animation values for heart burst
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);
  const heartRotation = useSharedValue(0);
  
  // Multi-heart particle effects
  const heart1Scale = useSharedValue(0);
  const heart1Opacity = useSharedValue(0);
  const heart1TranslateY = useSharedValue(0);
  const heart2Scale = useSharedValue(0);
  const heart2Opacity = useSharedValue(0);  
  const heart2TranslateY = useSharedValue(0);
  const heart3Scale = useSharedValue(0);
  const heart3Opacity = useSharedValue(0);
  const heart3TranslateY = useSharedValue(0);
  
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
      // Record that this video was viewed when it becomes active
      recordViewed(video.id);
    } else {
      player.pause();
    }
  }, [isActive, isPaused, player, video.id]);
  
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

  // Enhanced heart burst animation with multiple particles
  const triggerHeartBurst = () => {
    if (!isMountedRef.current) return;
    
    // Main heart animation
    heartScale.value = 0;
    heartOpacity.value = 1;
    heartRotation.value = 0;
    
    // Scale animation
    heartScale.value = withSequence(
      withSpring(1.8, { damping: 8, stiffness: 400 }),
      withSpring(0, { damping: 10, stiffness: 250 })
    );
    
    // Opacity animation
    heartOpacity.value = withSequence(
      withTiming(1, { duration: 150 }),
      withTiming(0, { duration: 400 }, () => {
        if (isMountedRef.current) {
          heartScale.value = 0;
          heartOpacity.value = 0;
          heartRotation.value = 0;
        }
      })
    );
    
    // Enhanced rotation with bounce
    heartRotation.value = withSequence(
      withTiming(20, { duration: 200 }),
      withTiming(-10, { duration: 150 }),
      withTiming(0, { duration: 100 })
    );

    // Particle heart animations
    const animateParticleHeart = (
      scale: Animated.SharedValue<number>, 
      opacity: Animated.SharedValue<number>, 
      translateY: Animated.SharedValue<number>,
      delay: number
    ) => {
      setTimeout(() => {
        if (!isMountedRef.current) return;
        
        scale.value = 0;
        opacity.value = 1;
        translateY.value = 0;
        
        scale.value = withSequence(
          withSpring(0.8, { damping: 8, stiffness: 300 }),
          withSpring(0, { damping: 6, stiffness: 200 })
        );
        
        opacity.value = withSequence(
          withTiming(1, { duration: 100 }),
          withTiming(0, { duration: 500 })
        );
        
        translateY.value = withTiming(-80, { duration: 600 });
      }, delay);
    };

    // Trigger particle animations with staggered timing
    animateParticleHeart(heart1Scale, heart1Opacity, heart1TranslateY, 100);
    animateParticleHeart(heart2Scale, heart2Opacity, heart2TranslateY, 200);
    animateParticleHeart(heart3Scale, heart3Opacity, heart3TranslateY, 150);
  };

  const handleDoubleTap = async () => {
    try {
      // Haptic feedback on double tap
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      recordLike(video.id, !video.meLiked);
      toggleLike(video.id);
      triggerHeartBurst();
      
      // Update user vector after like/dislike
      updateUserVectorAfterLike();
    } catch (error) {
      console.warn("Error handling double tap:", error);
    }
  };

  const handleSingleTapLike = async () => {
    try {
      // Haptic feedback on like button tap
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Simple button press animation
      likeButtonScale.value = withSequence(
        withTiming(0.9, { duration: 100 }),
        withTiming(1, { duration: 100 })
      );
      
      recordLike(video.id, !video.meLiked);
      toggleLike(video.id);
      
      // Update user vector after like/dislike
      updateUserVectorAfterLike();
    } catch (error) {
      console.warn("Error handling like tap:", error);
    }
  };

  const handleCommentsPress = async () => {
    try {
      // Haptic feedback on comments button tap
      await Haptics.selectionAsync();
      
      // Simple button press animation
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

  // Particle heart styles
  const animatedHeart1Style = useAnimatedStyle(() => ({
    transform: [
      { scale: heart1Scale.value },
      { translateY: heart1TranslateY.value },
      { translateX: -30 }
    ],
    opacity: heart1Opacity.value,
  }));

  const animatedHeart2Style = useAnimatedStyle(() => ({
    transform: [
      { scale: heart2Scale.value },
      { translateY: heart2TranslateY.value },
      { translateX: 30 }
    ],
    opacity: heart2Opacity.value,
  }));

  const animatedHeart3Style = useAnimatedStyle(() => ({
    transform: [
      { scale: heart3Scale.value },
      { translateY: heart3TranslateY.value },
      { translateX: 0 }
    ],
    opacity: heart3Opacity.value,
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
              {/* Enhanced Heart burst animation overlay with particles */}
              <Animated.View
                className="absolute inset-0 items-center justify-center pointer-events-none"
                style={animatedHeartStyle}
              >
                <Text className="text-red-500 text-8xl" style={{
                  textShadowColor: 'rgba(255, 0, 0, 0.8)',
                  textShadowOffset: {width: 0, height: 0},
                  textShadowRadius: 20
                }}>❤️</Text>
              </Animated.View>

              {/* Particle Hearts */}
              <Animated.View
                className="absolute inset-0 items-center justify-center pointer-events-none"
                style={animatedHeart1Style}
              >
                <Text className="text-red-400 text-4xl">💖</Text>
              </Animated.View>

              <Animated.View
                className="absolute inset-0 items-center justify-center pointer-events-none"
                style={animatedHeart2Style}
              >
                <Text className="text-pink-400 text-3xl">💕</Text>
              </Animated.View>

              <Animated.View
                className="absolute inset-0 items-center justify-center pointer-events-none"
                style={animatedHeart3Style}
              >
                <Text className="text-red-300 text-5xl">💗</Text>
              </Animated.View>
              
              {/* Enhanced Pause indicator overlay */}
              <Animated.View
                className="absolute inset-0 items-center justify-center pointer-events-none"
                style={animatedPauseIconStyle}
              >
                <BlurView intensity={80} style={{
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  borderRadius: 50,
                  padding: 20,
                }}>
                  <Text className="text-white text-6xl">⏸️</Text>
                </BlurView>
              </Animated.View>
            </View>
          </GestureDetector>
          
          {/* Action Rail - Clean and minimal */}
          <View className="absolute right-4 bottom-52 gap-6" style={{
            borderRadius: 12,
            padding: 8,
            marginRight: -8
          }}>
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
                          textShadowColor: 'rgba(0, 0, 0, 0.9)',
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
          
          {/* Enhanced Caption and Author Info with sophisticated gradient overlay */}
          <View className="absolute bottom-0 left-0 right-0">
            {/* Multi-layered gradient overlay for superior text readability */}
            <LinearGradient
              colors={[
                'transparent',
                'rgba(0,0,0,0.2)',
                'rgba(0,0,0,0.6)',
                'rgba(0,0,0,0.9)'
              ]}
              locations={[0, 0.3, 0.7, 1]}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 180,
              }}
            />
            
            <BlurView intensity={5} style={{
              paddingHorizontal: 16,
              paddingBottom: 32,
              paddingTop: 60,
            }}>
              <View style={{
                backgroundColor: 'rgba(0,0,0,0.3)',
                borderRadius: 15,
                padding: 16,
                marginBottom: 8,
              }}>
                <Text className="text-white text-xl font-bold mb-3" 
                      style={{ 
                        textShadowColor: 'rgba(0, 0, 0, 1)', 
                        textShadowOffset: {width: 0, height: 2}, 
                        textShadowRadius: 6,
                        letterSpacing: 0.8,
                        lineHeight: 24
                      }}>
                  @{video.author.name}
                </Text>
                <Text className="text-white text-base leading-7"
                      style={{ 
                        textShadowColor: 'rgba(0, 0, 0, 1)', 
                        textShadowOffset: {width: 0, height: 1}, 
                        textShadowRadius: 4,
                        opacity: 0.95,
                        letterSpacing: 0.3
                      }}>
                  {video.caption}
                </Text>
              </View>
            </BlurView>
          </View>
        </View>
      </View>
    </ErrorBoundary>
  );
}