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
} from "react-native";
import { useFeed } from "../state";
import {
  fetchFeed,
  getTotalVideoCount,
  fetchRecommendedFeed,
} from "../lib/feed";
import { initializeML } from "../lib/ml";
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

          const recommendations = await fetchRecommendations(userVector, 5);
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

        setVideos(initialVideos);

        const totalCount = getTotalVideoCount();
        setHasMoreVideos(
          initialVideos.length > 0 &&
            (initialVideos.length < totalCount || initialVideos.length === 5)
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

      let moreVideos: Video[] = [];

      if (currentUserVector && currentUserVector.length > 0) {
        try {
          console.log("Loading more videos with updated user vector...");
          const recommendations = await fetchRecommendations(
            currentUserVector,
            10
          );

          console.log(
            "Recommendations from API for more videos:",
            recommendations.recommendations
          );

          if (recommendations.recommendations.length > 0) {
            const videoIds = recommendations.recommendations.map(
              (rec) => rec.id
            );
            console.log("[feed] Video IDs:", videoIds);

            const newVideoIds = videoIds.filter(
              (id) => !videos.find((v) => v.id === String(id))
            );
            console.log("[feed] New video IDs after filtering:", newVideoIds);

            if (newVideoIds.length > 0) {
              moreVideos = await fetchRecommendedFeed(newVideoIds);
              console.log(`Loaded ${moreVideos.length} new recommended videos`);
            } else {
              console.log(
                "All recommended videos already loaded, no new videos."
              );
            }
          } else {
            console.log("No recommendations found.");
          }
        } catch (recommendationError) {
          console.warn(
            "Failed to get more recommendations, falling back to default feed:",
            recommendationError
          );
        }
      } else {
        console.log("No user vector available, using fallback feed loading...");
      }

      if (moreVideos.length === 0) {
        console.log("Using fallback feed loading for more videos...");
        const startIndex = videos.length;
        moreVideos = await fetchFeed(startIndex, 10); // Fetch 10 videos from the default feed
      }

      const uniqueVideos = moreVideos.filter(
        (newVideo) =>
          !videos.some((existingVideo) => existingVideo.id === newVideo.id)
      );

      console.log(
        "Total videos after adding new ones:",
        [...videos, ...uniqueVideos].length
      );

      if (uniqueVideos.length > 0) {
        setVideos([...videos, ...uniqueVideos]);
      } else {
        console.log("No unique videos to add, stopping further fetch.");
        setHasMoreVideos(false);
      }
    } catch (error) {
      console.error("Failed to load more videos:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [videos, isLoadingMore, hasMoreVideos, currentUserVector, setVideos]);

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
        // Ensure we're not in the process of loading more videos
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
      <Text
        style={{
          color: "white",
          fontSize: 18,
          textAlign: "center",
          marginBottom: 20,
        }}
      >
        {error}
      </Text>
      <LoadingSpinner size="large" color="white" />
    </View>
  );

  const renderLoadingState = () => (
    <View
      style={[
        styles.container,
        { justifyContent: "center", alignItems: "center" },
      ]}
    >
      <LoadingSpinner size="large" color="white" style={{ marginBottom: 20 }} />
      <Text style={{ color: "white", fontSize: 16 }}>Loading videos...</Text>
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
      <TouchableOpacity
        style={styles.analyticsButton}
        onPress={() => router.push("./analytics")}
      >
        <Text style={{ color: "#fff", fontWeight: "bold" }}>Analytics</Text>
      </TouchableOpacity>
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
  analyticsButton: {
    position: "absolute",
    top: 50,
    right: 30,
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 25,
    elevation: 5,
  },
});
