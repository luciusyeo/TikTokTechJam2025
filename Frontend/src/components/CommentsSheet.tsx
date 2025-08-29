import { useState, useEffect } from '@lynx-js/react';
import type { Comment } from '../types.js';
import { fetchComments, sendComment } from '../lib/feed.js';

interface CommentsSheetProps {
  videoId: string;
  visible: boolean;
  onClose: () => void;
  onAddComment: (text: string) => void;
}

export default function CommentsSheet({ videoId, visible, onClose, onAddComment }: CommentsSheetProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && videoId) {
      setLoading(true);
      fetchComments(videoId)
        .then(setComments)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [visible, videoId]);

  const handleSend = async () => {
    // For MVP: send a default comment since we don't have proper input handling
    const defaultComment = 'Nice video! 👍';
    
    try {
      const newComment = await sendComment(videoId, defaultComment);
      setComments(prev => [...prev, newComment]);
      onAddComment(defaultComment);
      setInputText(''); // Reset for visual feedback
    } catch (error) {
      console.error('Failed to send comment:', error);
    }
  };

  if (!visible) return null;

  return (
    <view className="comments-sheet" style={{
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      zIndex: '1000'
    }}>
      <view className="comments-backdrop" bindtap={onClose} style={{
        position: 'absolute',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        backgroundColor: 'rgba(0,0,0,0.5)'
      }} />
      
      <view className="comments-content" style={{
        position: 'absolute',
        bottom: '0',
        left: '0',
        right: '0',
        height: '60%',
        backgroundColor: 'rgba(0,0,0,0.9)',
        borderTopLeftRadius: '20px',
        borderTopRightRadius: '20px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <view className="comments-header" style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <text style={{ 
            color: '#fff', 
            fontSize: '18px', 
            fontWeight: 'bold' 
          }}>Comments</text>
          <text bindtap={onClose} style={{ 
            color: '#fff', 
            fontSize: '24px',
            cursor: 'pointer',
            width: '40px',
            height: '40px',
            textAlign: 'center',
            lineHeight: '40px'
          }}>×</text>
        </view>
        
        <view className="comments-list" style={{
          flex: '1',
          padding: '20px',
          overflow: 'auto'
        }}>
          {loading ? (
            <text style={{ color: '#ccc', textAlign: 'center', padding: '20px' }}>
              Loading comments...
            </text>
          ) : comments.length === 0 ? (
            <text style={{ color: '#ccc', textAlign: 'center', padding: '20px' }}>
              No comments yet
            </text>
          ) : (
            comments.slice(0, 5).map((comment) => (
              <view key={comment.id} className="comment-item" style={{
                marginBottom: '15px',
                paddingBottom: '15px',
                borderBottom: '1px solid rgba(255,255,255,0.1)'
              }}>
                <text style={{ 
                  color: '#fff', 
                  fontSize: '14px', 
                  fontWeight: 'bold',
                  marginBottom: '5px'
                }}>{comment.user.name}</text>
                <text style={{ 
                  color: '#ccc', 
                  fontSize: '14px',
                  lineHeight: '1.4'
                }}>{comment.text}</text>
              </view>
            ))
          )}
        </view>
        
        <view className="comments-input-row" style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          padding: '20px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          gap: '10px'
        }}>
          <view style={{
            flex: '1',
            backgroundColor: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '20px',
            padding: '10px 15px',
            minHeight: '40px',
            display: 'flex',
            alignItems: 'center'
          }}>
            <text style={{
              color: inputText ? '#fff' : '#999',
              fontSize: '14px'
            }}>
              {inputText || 'Add a comment...'}
            </text>
          </view>
          <text className="comments-send" bindtap={handleSend} style={{
            backgroundColor: '#ff0040',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}>Send</text>
        </view>
      </view>
    </view>
  );
}