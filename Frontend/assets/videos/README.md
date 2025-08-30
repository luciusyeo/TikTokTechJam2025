# Video Assets

For production, add short MP4 clips here and update `src/lib/feed.ts` to use:

```javascript
src: require("../../assets/videos/clip1.mp4")
```

Currently using remote test videos from Google Cloud Storage for Expo Go compatibility.

Recommended video specs:
- Duration: 5-30 seconds
- Resolution: 720p or 1080p vertical (9:16 aspect ratio)
- Format: MP4 (H.264/AAC)
- File size: < 10MB each for best performance