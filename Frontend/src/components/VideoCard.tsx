/// <reference path="../types/lynx.d.ts" />
import type { Video } from '../types.js';
import HUD from './HUD.js';

interface VideoCardProps {
  video: Video;
  isActive: boolean;
  onLike: () => void;
  onComment: () => void;
}

export default function VideoCard({ video, isActive, onLike, onComment }: VideoCardProps) {
  return (
    <view className="video-card" style={{ width: '100%', height: '100%', position: 'relative' }}>
      <view style={{ 
        width: '100%', 
        height: '100%', 
        backgroundColor: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <text style={{ color: '#fff', fontSize: '24px' }}>video</text>
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