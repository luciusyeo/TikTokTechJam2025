import React, { useEffect, useCallback, useRef, useState } from "react";
import { View, StyleSheet, FlatList, Dimensions, NativeScrollEvent, NativeSyntheticEvent, Text } from "react-native";
import { useFeed } from "../state";
import { fetchFeed, getTotalVideoCount, fetchRecommendedFeed } from "../lib/feed";
import { initializeML } from "../lib/ml";
import { Video } from "../types";
import { buildUserVector } from "../../utils/vectorUtils";
import { fetchRecommendations } from "../lib/api";
import VideoCard from "../components/VideoCard";
import CommentsSheet from "../components/CommentsSheet";
import LoadingSpinner from "../components/LoadingSpinner";

const { height: screenHeight } = Dimensions.get('window');

export default function FeedScreen() {
  const { videos, index, setVideos, setIndex, setCurrentUserVector, currentUserVector } = useFeed();
  const flatListRef = useRef<FlatList<Video>>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMoreVideos, setHasMoreVideos] = useState(true);

  // Initial load - initialize ML system, build user vector, then load recommendations
  useEffect(() => {
    const loadInitialFeed = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Initialize ML system first to load stored interactions
        console.log('Initializing ML system...');
        try {
          await initializeML();
          console.log('ML system initialized successfully');
        } catch (mlError) {
          console.warn('ML system initialization failed, continuing without stored interactions:', mlError);
          // Don't fail the entire app if ML system fails - just log and continue
        }

        // Build user vector and get recommendations
        let initialVideos: Video[] = [];
        try {
          console.log('Building user vector...');
          const userVector = await buildUserVector();
          console.log('User vector built, storing in state and fetching recommendations...');
          
          // Store user vector in state for later use
          setCurrentUserVector(userVector);
          
          const recommendations = await fetchRecommendations(userVector, 5);
          console.log('Recommendations received:', recommendations.recommendations.length);
          
          if (recommendations.recommendations.length > 0) {
            const videoIds = recommendations.recommendations.map(rec => rec.id);
            initialVideos = await fetchRecommendedFeed(videoIds);
            console.log('Loaded recommended videos:', initialVideos.length);
          }
        } catch (recommendationError) {
          console.warn('Failed to get recommendations, falling back to default feed:', recommendationError);
        }

        // Fallback to default feed if recommendations failed or empty
        if (initialVideos.length === 0) {
          console.log('Using fallback feed loading...');
          initialVideos = await fetchFeed(0, 2);
        }
        
        setVideos(initialVideos);
        
        // For recommended videos, we don't know total count, so assume more available
        // For fallback, check total count
        const totalCount = getTotalVideoCount();
        setHasMoreVideos(initialVideos.length > 0 && (initialVideos.length < totalCount || initialVideos.length === 5));
      } catch (error) {
        console.error("Failed to load initial feed:", error);
        setError('Failed to load videos. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialFeed();
  }, [setVideos]);

  // Progressive loading function - use recommendation API with current user vector
  const loadMoreVideos = useCallback(async () => {
    if (isLoadingMore || !hasMoreVideos) return;

    try {
      setIsLoadingMore(true);
      
      let moreVideos: Video[] = [];
      
      // Try to get more recommendations with current user vector
      if (currentUserVector && currentUserVector.length > 0) {
        try {
          console.log('Loading more videos with updated user vector...');
          const recommendations = await fetchRecommendations(currentUserVector, 5);
          
          if (recommendations.recommendations.length > 0) {
            const videoIds = recommendations.recommendations.map(rec => rec.id);
            // Filter out videos we already have
            const newVideoIds = videoIds.filter(id => !videos.find(v => v.id === id));
            
            if (newVideoIds.length > 0) {
              moreVideos = await fetchRecommendedFeed(newVideoIds);
              console.log(`Loaded ${moreVideos.length} new recommended videos`);
            } else {
              console.log('All recommended videos already loaded, trying more...');
              // If we got recommendations but they're all duplicates, consider fetching more
            }
          }
        } catch (recommendationError) {
          console.warn('Failed to get more recommendations, falling back to default feed:', recommendationError);
        }
      } else {
        console.log('No user vector available, using fallback feed loading...');
      }
      
      // Fallback to storage-based loading if recommendations failed or no user vector
      if (moreVideos.length === 0) {
        console.log('Using fallback feed loading for more videos...');
        const startIndex = videos.length;
        moreVideos = await fetchFeed(startIndex, 1); // Load 1 video at a time
        
        // Check if there are still more videos in storage
        const totalCount = getTotalVideoCount();
        if (videos.length + moreVideos.length >= totalCount) {
          setHasMoreVideos(false);
        }
      }
      
      if (moreVideos.length > 0) {
        setVideos([...videos, ...moreVideos]);
      } else {
        setHasMoreVideos(false);
      }
    } catch (error) {
      console.error("Failed to load more videos:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [videos, isLoadingMore, hasMoreVideos, currentUserVector, setVideos]);

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


        // Set new index
        setIndex(activeIndex);
        
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