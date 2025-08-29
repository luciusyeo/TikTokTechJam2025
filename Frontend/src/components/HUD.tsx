interface HUDProps {
  stats: { likes: number; comments: number };
  meLiked?: boolean;
  onLike: () => void;
  onComment: () => void;
}

export default function HUD({ stats, meLiked, onLike, onComment }: HUDProps) {
  return (
    <view className="hud" style={{ 
      position: 'absolute', 
      right: '15px', 
      bottom: '100px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '20px'
    }}>
      <view className="hud-button" bindtap={onLike} style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: 'pointer'
      }}>
        <text style={{ 
          fontSize: '32px', 
          color: meLiked ? '#ff0040' : '#fff',
          textShadow: '0 0 4px rgba(0,0,0,0.8)'
        }}>♥</text>
        <text style={{ 
          color: '#fff', 
          fontSize: '12px',
          marginTop: '4px',
          textShadow: '0 0 2px rgba(0,0,0,0.8)'
        }}>{stats.likes}</text>
      </view>
      
      <view className="hud-button" bindtap={onComment} style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: 'pointer'
      }}>
        <text style={{ 
          fontSize: '32px', 
          color: '#fff',
          textShadow: '0 0 4px rgba(0,0,0,0.8)'
        }}>💬</text>
        <text style={{ 
          color: '#fff', 
          fontSize: '12px',
          marginTop: '4px',
          textShadow: '0 0 2px rgba(0,0,0,0.8)'
        }}>{stats.comments}</text>
      </view>
    </view>
  );
}