import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import BottomSheet, { 
  BottomSheetBackdrop, 
  BottomSheetFlatList, 
  BottomSheetTextInput 
} from "@gorhom/bottom-sheet";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useFeed } from "../state";
import { fetchComments, sendComment } from "../lib/feed";
import { Comment } from "../types";

interface CommentsSheetProps {}

export default function CommentsSheet({}: CommentsSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // Animation values
  const animatedIndex = useSharedValue(-1);
  
  const { 
    isCommentsOpen, 
    currentVideoId, 
    commentsCache, 
    closeComments, 
    setComments, 
    addComment, 
    bumpCommentCount 
  } = useFeed();

  const snapPoints = useMemo(() => ["42%", "85%"], []);

  const currentComments = useMemo(() => {
    return currentVideoId ? commentsCache[currentVideoId] || [] : [];
  }, [currentVideoId, commentsCache]);

  // Handle sheet open/close
  useEffect(() => {
    if (isCommentsOpen) {
      bottomSheetRef.current?.expand();
      // Load comments if not cached
      if (currentVideoId && !commentsCache[currentVideoId]) {
        loadComments();
      }
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isCommentsOpen, currentVideoId]);

  const loadComments = async () => {
    if (!currentVideoId) return;
    
    try {
      setIsLoading(true);
      const comments = await fetchComments(currentVideoId);
      setComments(currentVideoId, comments);
    } catch (error) {
      console.error("Failed to load comments:", error);
      Alert.alert("Error", "Failed to load comments. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendComment = async () => {
    if (!inputText.trim() || !currentVideoId || isSending) return;
    
    const commentText = inputText.trim();
    setInputText("");
    setIsSending(true);

    try {
      // Haptic feedback on send
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Optimistic update
      const optimisticComment: Comment = {
        id: `temp_${Date.now()}`,
        user: { id: "me", name: "You" },
        text: commentText,
        ts: Date.now()
      };
      
      addComment(currentVideoId, optimisticComment);
      bumpCommentCount(currentVideoId);


      // Send to API
      const newComment = await sendComment(currentVideoId, commentText);
      
      // Replace optimistic comment with real one
      const updatedComments = currentComments.map(comment =>
        comment.id === optimisticComment.id ? newComment : comment
      );
      setComments(currentVideoId, updatedComments);

    } catch (error) {
      console.error("Failed to send comment:", error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Failed to send comment. Please try again.");
      // Could implement retry logic here
    } finally {
      setIsSending(false);
    }
  };

  const handleSheetChanges = useCallback(async (index: number) => {
    animatedIndex.value = index;
    if (index === -1) {
      await Haptics.selectionAsync();
      closeComments();
    } else if (index >= 0) {
      await Haptics.selectionAsync();
    }
  }, [closeComments]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.7}
        enableTouchThrough={false}
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
        }}
      />
    ),
    []
  );

  const formatTimeAgo = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "now";
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  const renderComment = useCallback(({ item, index }: { item: Comment; index: number }) => (
    <View className="flex-row py-4 px-4 border-b border-gray-800/50">
      <View className="w-10 h-10 rounded-full bg-blue-500 mr-3 items-center justify-center shadow-lg">
        <Text className="text-white text-sm font-bold">
          {item.user.name[0].toUpperCase()}
        </Text>
      </View>
      <View className="flex-1">
        <View className="flex-row items-center mb-2">
          <Text className="text-white font-bold mr-2 text-sm">
            {item.user.name}
          </Text>
          <Text className="text-gray-400 text-xs">
            {formatTimeAgo(item.ts)}
          </Text>
        </View>
        <Text className="text-white text-sm leading-6 opacity-90">
          {item.text}
        </Text>
      </View>
    </View>
  ), []);

  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center py-12">
      <View className="w-16 h-16 rounded-full bg-gray-700 items-center justify-center mb-4">
        <Text className="text-4xl">💬</Text>
      </View>
      <Text className="text-gray-300 text-lg font-semibold mb-2">No comments yet</Text>
      <Text className="text-gray-400 text-sm text-center px-8">Be the first to share what you think!</Text>
    </View>
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      backgroundStyle={{ 
        backgroundColor: "#111111",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: -4,
        },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 12,
      }}
      handleIndicatorStyle={{ 
        backgroundColor: "#666",
        width: 50,
        height: 4,
      }}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      animateOnMount={true}
    >
      <View className="flex-1">
        {/* Header - Enhanced */}
        <View className="px-4 py-4 border-b border-gray-700/50">
          <View className="flex-row items-center justify-center">
            <Text className="text-white text-xl font-bold text-center">
              Comments
            </Text>
            <View className="ml-2 px-2 py-1 bg-gray-700 rounded-full">
              <Text className="text-white text-xs font-semibold">
                {currentComments.length}
              </Text>
            </View>
          </View>
        </View>

        {/* Comments List */}
        <View className="flex-1">
          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <Text className="text-gray-400">Loading comments...</Text>
            </View>
          ) : (
            <BottomSheetFlatList
              data={currentComments}
              keyExtractor={(item) => item.id}
              renderItem={renderComment}
              ListEmptyComponent={renderEmptyState}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ flexGrow: 1 }}
            />
          )}
        </View>

        {/* Comment Input */}
        <KeyboardAvoidingView
          behavior="padding"
        >
          <View className="flex-row items-center px-4 py-3 border-t border-gray-700 bg-gray-900">
            <BottomSheetTextInput
              className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-full mr-3"
              placeholder="Add a comment..."
              placeholderTextColor="#666"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              style={{ maxHeight: 100 }}
            />
            <TouchableOpacity
              onPress={handleSendComment}
              disabled={!inputText.trim() || isSending}
              className={`px-6 py-3 rounded-full min-w-[80px] items-center ${
                inputText.trim() && !isSending ? "bg-blue-500" : "bg-gray-600"
              }`}
              style={{
                shadowColor: inputText.trim() ? '#3B82F6' : 'transparent',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 4,
              }}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className={`font-bold text-sm ${
                  inputText.trim() ? "text-white" : "text-gray-400"
                }`}>
                  Send
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </BottomSheet>
  );
}