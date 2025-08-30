import React, { useEffect, useCallback, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Text,
  TouchableOpacity,
  Alert,
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFeed } from "../state";
import {
  fetchFeed,
  getTotalVideoCount,
  fetchRecommendedFeed,
} from "../lib/feed";
import { initializeML, resetMLData } from "../lib/ml";
import { Video } from "../types";
import { buildUserVector } from "../../utils/vectorUtils";
import { fetchRecommendations } from "../lib/api";
import VideoCard from "../components/VideoCard";
import CommentsSheet from "../components/CommentsSheet";
import LoadingSpinner from "../components/LoadingSpinner";
import { useRouter } from "expo-router";

const { height: screenHeight } = Dimensions.get("window");

export default function FeedScreen() {
  const router = useRouter();
  const {
    videos,
    index,
    setVideos,
    setIndex,
    setCurrentUserVector,
    currentUserVector,
  } = useFeed();
  const flatListRef = useRef<FlatList<Video>>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMoreVideos, setHasMoreVideos] = useState(true);

  const feedLoadedRef = useRef(false);

  // Animation values for enhanced UI
  const loadingShimmer = useSharedValue(0);
  const analyticsButtonScale = useSharedValue(1);
  const clearButtonScale = useSharedValue(1);
  const buttonGlow = useSharedValue(0);

  // Initialize animations
  useEffect(() => {
    // Continuous loading shimmer
    loadingShimmer.value = withRepeat(
      withTiming(1, { duration: 1500 }),
      -1,
      true
    );
    
    // Subtle button glow effect
    buttonGlow.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 2000 }),
        withTiming(1, { duration: 2000 })
      ),
      -1,
      true
    );
  }, []);

  // Enhanced button handlers with animations
  const handleAnalyticsPress = useCallback(() => {
    analyticsButtonScale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );
    setTimeout(() => router.push("./analytics"), 50);
  }, [router, analyticsButtonScale]);

  const clearAllStorage = useCallback(async () => {
    Alert.alert(
      "Clear All Data",
      "This will clear all stored data including your video preferences, interactions, and ML recommendations. This action cannot be undone.\n\nAre you sure you want to continue?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              // Clear all AsyncStorage keys used by the app
              await AsyncStorage.multiRemove([
                'video_interactions',
                'count', 
                'vector_arrays'
              ]);
              
              // Reset ML data and cache
              await resetMLData();
              
              setCurrentUserVector([]);
              
              Alert.alert("Success", "All local data has been cleared.");
              console.log("All local storage data cleared successfully");
            } catch (error) {
              console.error("Failed to clear storage:", error);
              Alert.alert("Error", "Failed to clear some data. Please try again.");
            }
          },
        },
      ]
    );
  }, [setCurrentUserVector]);

  const handleClearStoragePress = useCallback(() => {
    clearButtonScale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );
    setTimeout(clearAllStorage, 50);
  }, [clearButtonScale, clearAllStorage]);

  useEffect(() => {
    const loadInitialFeed = async () => {
      if (feedLoadedRef.current) return;

      try {
        setIsLoading(true);
        setError(null);

        // Initialize ML system first to load stored interactions
        console.log("Initializing ML system...");
        try {
          await initializeML();
          console.log("ML system initialized successfully");
        } catch (mlError) {
          console.warn(
            "ML system initialization failed, continuing without stored interactions:",
            mlError
          );
        }

        let initialVideos: Video[] = [];
        try {
          console.log("Building user vector...");
          const userVector = await buildUserVector();
          setCurrentUserVector(userVector);

          const recommendations = await fetchRecommendations(userVector, 10);
          console.log(
            "Recommendations received:",
            recommendations.recommendations.length
          );

          if (recommendations.recommendations.length > 0) {
            const videoIds = recommendations.recommendations.map(
              (rec) => rec.id
            );
            initialVideos = await fetchRecommendedFeed(videoIds);
            console.log("Loaded recommended videos:", initialVideos.length);
            console.log("Video IDs returned:", initialVideos.map((v) => v.id)); // Log video IDs
          }
        } catch (recommendationError) {
          console.warn(
            "Failed to get recommendations, falling back to default feed:",
            recommendationError
          );
        }

        if (initialVideos.length === 0) {
          initialVideos = await fetchFeed(0, 10);
        }

        console.log("Video IDs returned after fallback:", initialVideos.map((v) => v.id)); // Log video IDs from fallback

        setVideos(initialVideos);

        const totalCount = getTotalVideoCount();
        setHasMoreVideos(
          initialVideos.length > 0 &&
            (initialVideos.length < totalCount || initialVideos.length === 10)
        );

        feedLoadedRef.current = true;
      } catch (error) {
        console.error("Failed to load initial feed:", error);
        setError("Failed to load videos. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialFeed();
  }, [setVideos]);

  const loadMoreVideos = useCallback(async () => {
    if (isLoadingMore) return;

    try {
      setIsLoadingMore(true);

      // BEFORE STATE LOGGING
      console.log("🔄 [LOAD MORE] Starting to load more videos...");
      console.log("📊 [BEFORE] Current video count:", videos.length);
      console.log("📋 [BEFORE] Current video IDs:", videos.map(v => v.id));
      console.log("🎯 [BEFORE] User vector length:", currentUserVector?.length || 0);
      console.log("📈 [BEFORE] Has more videos flag:", hasMoreVideos);

      let moreVideos: Video[] = [];

      if (currentUserVector && currentUserVector.length > 0) {
        try {
          console.log("🧠 [ML] Loading more videos with updated user vector...");
          const recommendations = await fetchRecommendations(
            currentUserVector,
            10
          );

          console.log("🎯 [ML] Recommendations from API:", {
            count: recommendations.recommendations.length,
            videoIds: recommendations.recommendations.map(r => r.id)
          });

          if (recommendations.recommendations.length > 0) {
            const videoIds = recommendations.recommendations.map(
              (rec) => rec.id
            );
            console.log("🔍 [ML] Recommended video IDs:", videoIds);

            const newVideoIds = videoIds.filter(
              (id) => !videos.find((v) => v.id === String(id))
            );
            console.log("✨ [ML] New video IDs after filtering duplicates:", newVideoIds);

            if (newVideoIds.length > 0) {
              moreVideos = await fetchRecommendedFeed(newVideoIds);
              console.log(`✅ [ML] Successfully loaded ${moreVideos.length} new recommended videos`);
              console.log("📝 [ML] New video IDs fetched:", moreVideos.map((v) => v.id));
            } else {
              console.log("⚠️ [ML] All recommended videos already loaded, no new videos.");
            }
          } else {
            console.log("❌ [ML] No recommendations found from API.");
          }
        } catch (recommendationError) {
          console.warn(
            "🚨 [ML] Failed to get more recommendations, falling back to default feed:",
            recommendationError
          );
        }
      } else {
        console.log("📭 [FALLBACK] No user vector available, using fallback feed loading...");
      }

      // Fallback to loading more videos from the default feed
      if (moreVideos.length === 0) {
        console.log("🔄 [FALLBACK] Using default feed loading for more videos...");
        const startIndex = videos.length;
        console.log("📍 [FALLBACK] Starting from index:", startIndex);
        moreVideos = await fetchFeed(startIndex, 10);
        console.log("📝 [FALLBACK] Video IDs fetched from default feed:", moreVideos.map((v) => v.id));
      }

      const uniqueVideos = moreVideos.filter(
        (newVideo) =>
          !videos.some((existingVideo) => existingVideo.id === newVideo.id)
      );

      // AFTER STATE LOGGING
      console.log("📊 [AFTER] Videos fetched from API/fallback:", moreVideos.length);
      console.log("🔄 [AFTER] Unique videos after deduplication:", uniqueVideos.length);
      console.log("📝 [AFTER] Unique video IDs to be added:", uniqueVideos.map(v => v.id));

      if (uniqueVideos.length > 0) {
        const newTotalVideos = [...videos, ...uniqueVideos];
        console.log("✅ [SUCCESS] Adding videos to feed...");
        console.log("📈 [SUCCESS] Total videos before update:", videos.length);
        console.log("📈 [SUCCESS] Total videos after update:", newTotalVideos.length);
        console.log("➕ [SUCCESS] Videos added:", uniqueVideos.length);
        console.log("🎯 [SUCCESS] New video range:", `${videos.length + 1}-${newTotalVideos.length}`);
        
        setVideos(newTotalVideos);
      } else {
        console.log("⚠️ [COMPLETE] No unique videos to add, stopping further fetch.");
        console.log("🛑 [COMPLETE] Setting hasMoreVideos to false");
        setHasMoreVideos(false);
      }

      console.log("🏁 [LOAD MORE] Completed loading more videos");
      console.log("=" .repeat(60));

    } catch (error) {
      console.error("❌ [ERROR] Failed to load more videos:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [videos, isLoadingMore, hasMoreVideos, currentUserVector, setVideos]);

  // Animated styles for enhanced UI
  const shimmerAnimatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      loadingShimmer.value,
      [0, 1],
      [-100, 100],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ translateX }],
    };
  });

  const analyticsButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: analyticsButtonScale.value }],
    shadowOpacity: buttonGlow.value * 0.3,
  }));

  const clearButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: clearButtonScale.value }],
    shadowOpacity: buttonGlow.value * 0.3,
  }));

  const onMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset } = event.nativeEvent;
      const newIndex = Math.round(contentOffset.y / screenHeight);
      const clampedIndex = Math.max(0, Math.min(newIndex, videos.length - 1));
      setIndex(clampedIndex);
    },
    [screenHeight, videos.length, setIndex]
  );

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: any) => {
      if (viewableItems.length > 0) {
        const activeIndex = viewableItems[0].index;
        // console.log(`Active video index: ${activeIndex}, Total videos loaded: ${videos.length}`);

        // Load more videos only when the last item is viewed
        if (activeIndex === videos.length - 1 && !isLoadingMore) {
          console.log(
            `User reached the last video: ${activeIndex}, loading more...`
          );
          loadMoreVideos();
        } else {
          // console.log("Not at the last video or still loading, skipping fetch");
        }
      }
    },
    [videos, hasMoreVideos, isLoadingMore, loadMoreVideos]
  );

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 95,
  };

  const renderItem = useCallback(
    ({ item, index: itemIndex }: { item: Video; index: number }) => {
      const isActive = itemIndex === index;

      return <VideoCard video={item} isActive={isActive} />;
    },
    [index]
  );

  const getItemLayout = useCallback(
    (_data: any, index: number) => ({
      length: screenHeight,
      offset: screenHeight * index,
      index,
    }),
    [screenHeight]
  );

  const renderErrorState = () => (
    <View
      style={[
        styles.container,
        { justifyContent: "center", alignItems: "center" },
      ]}
    >
      <LinearGradient
        colors={['#FF3B30', '#FF6B6B', '#FF3B30']}
        style={{
          padding: 20,
          borderRadius: 20,
          marginBottom: 30,
          shadowColor: '#FF3B30',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.3,
          shadowRadius: 20,
        }}
      >
        <Text
          style={{
            color: "white",
            fontSize: 18,
            textAlign: "center",
            fontWeight: "600",
          }}
        >
          {error}
        </Text>
      </LinearGradient>
      <LoadingSpinner size="large" color="#FF3B30" />
    </View>
  );

  const renderLoadingState = () => (
    <View
      style={[
        styles.container,
        { justifyContent: "center", alignItems: "center" },
      ]}
    >
      <Animated.View style={[styles.loadingContainer, shimmerAnimatedStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.1)', 'transparent']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}
          style={styles.shimmerGradient}
        />
      </Animated.View>
      <LoadingSpinner size="large" color="#007AFF" style={{ marginBottom: 20 }} />
      <Text style={{ color: "white", fontSize: 16, fontWeight: "500" }}>
        Loading your feed...
      </Text>
      <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, marginTop: 8 }}>
        Personalizing content for you ✨
      </Text>
    </View>
  );

  if (isLoading) {
    return renderLoadingState();
  }

  if (error) {
    return renderErrorState();
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={videos}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        pagingEnabled
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        snapToInterval={screenHeight}
        snapToAlignment="start"
        onMomentumScrollEnd={onMomentumScrollEnd}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={getItemLayout}
        removeClippedSubviews={true}
        maxToRenderPerBatch={2}
        windowSize={3}
        initialNumToRender={1}
        updateCellsBatchingPeriod={50}
        style={styles.flatList}
        disableIntervalMomentum={true}
        scrollEventThrottle={16}
        keyboardDismissMode="on-drag"
      />
      <CommentsSheet />
      
      {/* Enhanced Analytics Button - Top Left */}
      <Animated.View style={[styles.analyticsButtonContainer, analyticsButtonAnimatedStyle]}>
        <TouchableOpacity
          style={styles.analyticsButton}
          onPress={handleAnalyticsPress}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#007AFF', '#0056CC', '#003D99']}
            style={styles.buttonGradient}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
          >
            <Text style={styles.buttonText}>📊 Analytics</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Enhanced Clear Data Button - Top Right */}
      <Animated.View style={[styles.clearStorageButtonContainer, clearButtonAnimatedStyle]}>
        <TouchableOpacity
          style={styles.clearStorageButton}
          onPress={handleClearStoragePress}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#FF3B30', '#CC2E24', '#992218']}
            style={styles.buttonGradient}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
          >
            <Text style={styles.buttonText}>🗑️ Clear Data</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  flatList: {
    flex: 1,
  },
  // Loading shimmer container
  loadingContainer: {
    width: 200,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 30,
  },
  shimmerGradient: {
    flex: 1,
    width: 100,
  },
  // Enhanced button containers with positioning
  analyticsButtonContainer: {
    position: "absolute",
    top: 60,
    left: 20,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 15,
    elevation: 10,
  },
  clearStorageButtonContainer: {
    position: "absolute",
    top: 60,
    right: 20,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 15,
    elevation: 10,
  },
  // Enhanced button styles
  analyticsButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  clearStorageButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
