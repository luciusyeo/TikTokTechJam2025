import { useEffect, useState } from '@lynx-js/react';
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
  
  // Viewport height for paging - using a reasonable mobile height
  const viewportHeight = 800; // This would ideally come from a hook or device measurement

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

  // Handle scroll end to update current video index
  const handleScrollEnd = (scrollY: number) => {
    const newIndex = Math.max(0, Math.min(videos.length - 1, Math.round(scrollY / viewportHeight)));
    
    if (newIndex !== index) {
      setIndex(newIndex);
    }
    
    // Prefetch next page when approaching end
    if (newIndex >= videos.length - 2 && hasNextPage) {
      loadNextPage();
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
      <scroll-view
        style={{
          width: '100%',
          height: '100%'
        }}
        scroll-y={true}
        scroll-x={false}
        bindscrollend={(e: any) => {
          // Handle scroll end event - extracting scrollTop from event
          const scrollY = e.detail?.scrollTop || 0;
          handleScrollEnd(scrollY);
        }}
      >
        {videos.map((video, videoIndex) => (
          <view 
            key={video.id} 
            style={{ 
              height: `${viewportHeight}px`,
              width: '100%'
            }}
          >
            <VideoCard
              video={video}
              isActive={videoIndex === index}
              onLike={() => handleLike(video.id)}
              onComment={() => handleOpenComments(video.id)}
            />
          </view>
        ))}
        
        {/* Loading indicator for next page */}
        {loading && videos.length > 0 && (
          <view style={{
            height: '100px',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <text style={{ color: '#fff', fontSize: '14px' }}>Loading more...</text>
          </view>
        )}
      </scroll-view>

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