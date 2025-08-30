import React, { useEffect, useCallback, useRef } from "react";
import { View, StyleSheet, FlatList, Dimensions, NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { useFeed } from "../state";
import { fetchFeed } from "../lib/feed";
import { Video } from "../types";
import VideoCard from "../components/VideoCard";

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function FeedScreen() {
  const { videos, index, setVideos, setIndex } = useFeed();
  const flatListRef = useRef<FlatList<Video>>(null);

  useEffect(() => {
    const loadFeed = async () => {
      try {
        const feedData = await fetchFeed(0);
        setVideos(feedData);
      } catch (error) {
        console.error("Failed to load feed:", error);
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
        index={itemIndex} 
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
        maxToRenderPerBatch={3}
        windowSize={5}
        initialNumToRender={2}
        style={styles.flatList}
      />
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