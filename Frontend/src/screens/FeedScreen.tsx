import React, { useEffect, useCallback, useRef, useState } from "react";
import { View, StyleSheet, FlatList, Dimensions, NativeScrollEvent, NativeSyntheticEvent, Text } from "react-native";
import { useFeed } from "../state";
import { fetchFeed } from "../lib/feed";
import { Video } from "../types";
import VideoCard from "../components/VideoCard";
import CommentsSheet from "../components/CommentsSheet";
import LoadingSpinner from "../components/LoadingSpinner";

const { height: screenHeight } = Dimensions.get('window');

export default function FeedScreen() {
  const { videos, index, setVideos, setIndex } = useFeed();
  const flatListRef = useRef<FlatList<Video>>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFeed = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const feedData = await fetchFeed(0);
        setVideos(feedData);
      } catch (error) {
        console.error("Failed to load feed:", error);
        setError('Failed to load videos. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadFeed();
  }, [setVideos]);

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
        setIndex(activeIndex);
      }
    }
  }, [index, setIndex]);

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