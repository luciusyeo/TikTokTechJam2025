import { useEffect, useState, useRef } from '@lynx-js/react';
import { useFeed } from '../state.js';
import { fetchFeed } from '../lib/feed.js';
import VideoCard from '../components/VideoCard.js';
import CommentsSheet from '../components/CommentsSheet.js';

export default function FeedScreen() {
  const { 
    videos, 
    index, 
    loading, 
    error,
    setVideos, 
    appendVideos,
    setIndex, 
    setLoading,
    setError,
    toggleLike, 
    bumpCommentCount 
  } = useFeed();
  
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(true);
  const listRef = useRef<any>(null);
  
  // Use screen height for full video pages
  const viewportHeight = 800;

  // Load initial feed data
  useEffect(() => {
    loadInitialFeed();
  }, []);

  const loadInitialFeed = async () => {
    try {
      setLoading(true);
      setError(null);
      const initialVideos = await fetchFeed(0);
      setVideos(initialVideos);
      setCurrentPage(0);
      setHasNextPage(initialVideos.length > 0);
    } catch (err) {
      setError('Failed to load feed');
      console.error('Feed loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load next page of videos
  const loadNextPage = async () => {
    if (!hasNextPage || loading) return;
    
    try {
      const nextPage = currentPage + 1;
      const newVideos = await fetchFeed(nextPage);
      
      if (newVideos.length > 0) {
        appendVideos(newVideos);
        setCurrentPage(nextPage);
      } else {
        setHasNextPage(false);
      }
    } catch (err) {
      console.error('Failed to load next page:', err);
    }
  };

  // Handle scroll events from list component
  const handleScroll = (event: any) => {
    const scrollY = event.detail?.scrollTop || 0;
    const newIndex = Math.max(0, Math.min(videos.length - 1, Math.round(scrollY / viewportHeight)));
    
    if (newIndex !== index) {
      setIndex(newIndex);
      
      // Prefetch next page when approaching end
      if (newIndex >= videos.length - 2 && hasNextPage) {
        loadNextPage();
      }
    }
  };

  // Handle like action with optimistic updates
  const handleLike = (videoId: string) => {
    toggleLike(videoId);
  };

  // Handle comment button tap
  const handleOpenComments = (videoId: string) => {
    setCurrentVideoId(videoId);
    setCommentsVisible(true);
  };

  // Handle closing comments
  const handleCloseComments = () => {
    setCommentsVisible(false);
    setCurrentVideoId('');
  };

  // Handle adding a comment
  const handleAddComment = () => {
    if (currentVideoId) {
      bumpCommentCount(currentVideoId);
    }
  };

  // Loading state
  if (loading && videos.length === 0) {
    return (
      <view style={{
        width: '100%',
        height: '100vh',
        backgroundColor: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <text style={{ color: '#fff', fontSize: '18px' }}>Loading feed...</text>
      </view>
    );
  }

  // Error state
  if (error && videos.length === 0) {
    return (
      <view style={{
        width: '100%',
        height: '100vh',
        backgroundColor: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px'
      }}>
        <text style={{ color: '#fff', fontSize: '18px' }}>Failed to load feed</text>
        <text 
          bindtap={loadInitialFeed}
          style={{ 
            color: '#ff0040', 
            fontSize: '16px',
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
        >
          Tap to retry
        </text>
      </view>
    );
  }

  return (
    <view style={{
      width: '100%',
      height: '100vh',
      backgroundColor: '#000',
      position: 'relative'
    }}>
      <list
        ref={listRef}
        style={{
          width: '100%',
          height: '100%'
        }}
        scroll-orientation="vertical"
        item-snap={{ factor: 0, offset: 0 }}
        lower-threshold-item-count={2}
        bindscroll={handleScroll}
        bindscrolltolower={loadNextPage}
      >
        {videos.map((video, videoIndex) => (
          <VideoCard
            key={`video-${video.id}`}
            item-key={`video-${video.id}`}
            style={{ 
              height: `${viewportHeight}px`,
              width: '100%'
            }}
            video={video}
            isActive={videoIndex === index}
            onLike={() => handleLike(video.id)}
            onComment={() => handleOpenComments(video.id)}
          />
        ))}
        
        {/* Loading indicator for next page */}
        {loading && videos.length > 0 && (
          <view
            key="loading"
            item-key="loading"
            style={{
              height: '100px',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <text style={{ color: '#fff', fontSize: '14px' }}>Loading more...</text>
          </view>
        )}
      </list>

      {/* Comments Sheet */}
      <CommentsSheet
        videoId={currentVideoId}
        visible={commentsVisible}
        onClose={handleCloseComments}
        onAddComment={handleAddComment}
      />
    </view>
  );
}