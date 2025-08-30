import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from "react-native";
import BottomSheet, { 
  BottomSheetBackdrop, 
  BottomSheetFlatList, 
  BottomSheetTextInput 
} from "@gorhom/bottom-sheet";
import { useFeed } from "../state";
import { fetchComments, sendComment } from "../lib/feed";
import { Comment } from "../types";

interface CommentsSheetProps {}

export default function CommentsSheet({}: CommentsSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { 
    isCommentsOpen, 
    currentVideoId, 
    commentsCache, 
    closeComments, 
    setComments, 
    addComment, 
    bumpCommentCount 
  } = useFeed();

  const snapPoints = useMemo(() => ["40%", "80%"], []);

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
    if (!inputText.trim() || !currentVideoId) return;
    
    const commentText = inputText.trim();
    setInputText("");

    try {
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
      Alert.alert("Error", "Failed to send comment. Please try again.");
      // Could implement retry logic here
    }
  };

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      closeComments();
    }
  }, [closeComments]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.5}
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

  const renderComment = useCallback(({ item }: { item: Comment }) => (
    <View className="flex-row py-3 px-4">
      <View className="w-8 h-8 rounded-full bg-gray-600 mr-3 items-center justify-center">
        <Text className="text-white text-sm font-semibold">
          {item.user.name[0].toUpperCase()}
        </Text>
      </View>
      <View className="flex-1">
        <View className="flex-row items-center mb-1">
          <Text className="text-white font-semibold mr-2">
            {item.user.name}
          </Text>
          <Text className="text-gray-400 text-xs">
            {formatTimeAgo(item.ts)}
          </Text>
        </View>
        <Text className="text-white text-sm leading-5">
          {item.text}
        </Text>
      </View>
    </View>
  ), []);

  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center py-8">
      <Text className="text-gray-400 text-base">No comments yet</Text>
      <Text className="text-gray-500 text-sm mt-1">Be the first to comment!</Text>
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
      backgroundStyle={{ backgroundColor: "#1a1a1a" }}
      handleIndicatorStyle={{ backgroundColor: "#666" }}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
    >
      <View className="flex-1">
        {/* Header */}
        <View className="px-4 py-3 border-b border-gray-700">
          <Text className="text-white text-lg font-semibold text-center">
            Comments
          </Text>
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
              disabled={!inputText.trim()}
              className={`px-4 py-2 rounded-full ${
                inputText.trim() ? "bg-blue-600" : "bg-gray-600"
              }`}
            >
              <Text className={`font-semibold ${
                inputText.trim() ? "text-white" : "text-gray-400"
              }`}>
                Send
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </BottomSheet>
  );
}