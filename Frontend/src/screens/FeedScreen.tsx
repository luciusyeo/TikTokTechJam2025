import React, { useEffect, useCallback, useRef, useState } from "react";
import { View, StyleSheet, FlatList, Dimensions, NativeScrollEvent, NativeSyntheticEvent, Text } from "react-native";
import { useFeed } from "../state";
import { fetchFeed, getTotalVideoCount } from "../lib/feed";
import { recordInteraction } from "../lib/ml";
import { Video } from "../types";
import VideoCard from "../components/VideoCard";
import CommentsSheet from "../components/CommentsSheet";
import LoadingSpinner from "../components/LoadingSpinner";

const { height: screenHeight } = Dimensions.get('window');

export default function FeedScreen() {
  const { videos, index, setVideos, setIndex } = useFeed();
  const flatListRef = useRef<FlatList<Video>>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMoreVideos, setHasMoreVideos] = useState(true);
  const watchTimeStartRef = useRef<number | null>(null);

  // Initial load - load first 2 videos
  useEffect(() => {
    const loadInitialFeed = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const initialVideos = await fetchFeed(0, 2);
        setVideos(initialVideos);
        watchTimeStartRef.current = Date.now();
        
        // Check if there are more videos to load
        const totalCount = getTotalVideoCount();
        setHasMoreVideos(initialVideos.length < totalCount);
      } catch (error) {
        console.error("Failed to load initial feed:", error);
        setError('Failed to load videos. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialFeed();
  }, [setVideos]);

  // Progressive loading function
  const loadMoreVideos = useCallback(async () => {
    if (isLoadingMore || !hasMoreVideos) return;

    try {
      setIsLoadingMore(true);
      const startIndex = videos.length;
      const moreVideos = await fetchFeed(startIndex, 1); // Load 1 video at a time
      
      if (moreVideos.length > 0) {
        setVideos([...videos, ...moreVideos]);
        
        // Check if there are still more videos
        const totalCount = getTotalVideoCount();
        setHasMoreVideos(videos.length + moreVideos.length < totalCount);
      } else {
        setHasMoreVideos(false);
      }
    } catch (error) {
      console.error("Failed to load more videos:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [videos, isLoadingMore, hasMoreVideos, setVideos]);

  const onMomentumScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset } = event.nativeEvent;
    const newIndex = Math.round(contentOffset.y / screenHeight);
    const clampedIndex = Math.max(0, Math.min(newIndex, videos.length - 1));
    setIndex(clampedIndex);
  }, [screenHeight, videos.length, setIndex]);

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const activeIndex = viewableItems[0].index;
      if (activeIndex !== null && activeIndex !== index) {
        // Record watch time for the previous video
        if (watchTimeStartRef.current && videos[index]) {
          const watchTime = (Date.now() - watchTimeStartRef.current) / 1000; // in seconds
          const videoId = videos[index].id;
          recordInteraction({ videoId, action: 'watch_time', value: watchTime, timestamp: Date.now() });
        }

        // Record swipe interaction
        if (videos[index]) {
          const videoId = videos[index].id;
          const action = activeIndex > index ? 'swipe_up' : 'swipe_down';
          recordInteraction({ videoId, action, value: 1, timestamp: Date.now() });
        }

        // Set new index and start time
        setIndex(activeIndex);
        watchTimeStartRef.current = Date.now();
        
        // Trigger progressive loading when user is near the end
        // Load more when user reaches the second-to-last video
        if (activeIndex >= videos.length - 2 && hasMoreVideos && !isLoadingMore) {
          console.log(`Preloading: User at video ${activeIndex}, total loaded: ${videos.length}`);
          loadMoreVideos();
        }
      }
    }
  }, [index, setIndex, videos, hasMoreVideos, isLoadingMore, loadMoreVideos]);

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 95,
  };

  const renderItem = useCallback(({ item, index: itemIndex }: { item: Video; index: number }) => {
    const isActive = itemIndex === index;
    
    return (
      <VideoCard 
        video={item} 
        isActive={isActive} 
      />
    );
  }, [index]);

  const getItemLayout = useCallback(
    (_data: any, index: number) => ({
      length: screenHeight,
      offset: screenHeight * index,
      index,
    }),
    [screenHeight]
  );
  
  // Error state component
  const renderErrorState = () => (
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={{ color: 'white', fontSize: 18, textAlign: 'center', marginBottom: 20 }}>
        {error}
      </Text>
      <LoadingSpinner size="large" color="white" />
    </View>
  );
  
  // Loading state component  
  const renderLoadingState = () => (
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <LoadingSpinner size="large" color="white" style={{ marginBottom: 20 }} />
      <Text style={{ color: 'white', fontSize: 16 }}>Loading videos...</Text>
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
        keyExtractor={(item) => item.id}
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
        // Performance optimizations
        disableIntervalMomentum={true}
        scrollEventThrottle={16}
        keyboardDismissMode="on-drag"
      />
      <CommentsSheet />
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
});