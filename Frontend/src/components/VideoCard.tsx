import { useEffect, useRef } from '@lynx-js/react';
import type { Video } from '../types.js';
import HUD from './HUD.js';

interface VideoCardProps {
  video: Video;
  isActive: boolean;
  onLike: () => void;
  onComment: () => void;
}

export default function VideoCard({ video, isActive, onLike, onComment }: VideoCardProps) {
  const videoRef = useRef<any>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    
    if (isActive) {
      videoRef.current.play?.();
    } else {
      videoRef.current.pause?.();
    }
  }, [isActive]);

  return (
    <view className="video-card" style={{ width: '100%', height: '100%', position: 'relative' }}>
      <view className="video-player" style={{ width: '100%', height: '100%', backgroundColor: '#000' }}>
        {/* TODO: Replace with proper Lynx video element when available */}
        <text style={{ color: '#fff', fontSize: '14px', margin: '10px' }}>
          Playing: {video.author.name}
        </text>
        <text style={{ color: '#ccc', fontSize: '12px', margin: '10px' }}>
          {video.src}
        </text>
      </view>
      
      <HUD 
        stats={video.stats}
        meLiked={video.meLiked}
        onLike={onLike}
        onComment={onComment}
      />
      
      <view className="video-caption" style={{
        position: 'absolute',
        bottom: '20px',
        left: '15px',
        right: '80px',
        maxHeight: '120px'
      }}>
        <text style={{ 
          color: '#fff', 
          fontSize: '16px', 
          fontWeight: 'bold',
          marginBottom: '8px',
          textShadow: '0 0 4px rgba(0,0,0,0.8)'
        }}>@{video.author.name}</text>
        <text style={{ 
          color: '#fff', 
          fontSize: '14px',
          lineHeight: '1.3',
          textShadow: '0 0 2px rgba(0,0,0,0.8)'
        }}>{video.caption}</text>
      </view>
    </view>
  );
}