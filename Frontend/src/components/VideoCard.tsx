/// <reference path="../types/lynx.d.ts" />
import { useState } from '@lynx-js/react';
import type { Video } from '../types.js';
import HUD from './HUD.js';

interface VideoCardProps {
  video: Video;
  isActive: boolean;
  onLike: () => void;
  onComment: () => void;
  style?: any;
  'item-key'?: string;
}

export default function VideoCard({ video, isActive, onLike, onComment, style, 'item-key': itemKey }: VideoCardProps) {
  const [lastTapTime, setLastTapTime] = useState(0);
  const doubleTapDelay = 300; // ms

  const handleTap = () => {
    const currentTime = Date.now();
    if (currentTime - lastTapTime < doubleTapDelay) {
      // Double tap detected
      onLike();
    }
    setLastTapTime(currentTime);
  };

  return (
    <view 
      item-key={itemKey}
      className="video-card" 
      style={{ 
        width: '100%', 
        height: '100%', 
        position: 'relative',
        ...style 
      }}
    >
      {/* Video placeholder with touch handling */}
      <view 
        bindtap={handleTap}
        style={{ 
          width: '100%', 
          height: '100%', 
          backgroundColor: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer'
        }}
      >
        <view style={{ position: 'relative', width: '100%', height: '100%' }}>
          <text style={{ 
            color: '#fff', 
            fontSize: '24px',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          }}>
            📹 Video {video.id}
          </text>
          <text style={{ 
            color: '#999', 
            fontSize: '12px', 
            position: 'absolute', 
            top: '20px', 
            left: '20px' 
          }}>
            {isActive ? '▶️ Playing' : '⏸️ Paused'}
          </text>
        </view>
      </view>

      <HUD
        stats={video.stats}
        meLiked={video.meLiked}
        onLike={onLike}
        onComment={onComment}
      />

      <view
        className="video-caption"
        style={{ position: 'absolute', bottom: '20px', left: '15px', right: '80px', maxHeight: '120px' }}
      >
        <text style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold', marginBottom: '8px', textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>
          @{video.author.name}
        </text>
        <text style={{ color: '#fff', fontSize: '14px', lineHeight: '1.3', textShadow: '0 0 2px rgba(0,0,0,0.8)' }}>
          {video.caption}
        </text>
      </view>
    </view>
  );
}