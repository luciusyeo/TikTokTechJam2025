This is a lean MVP plan for a TikTok-style feed using **Lynx + ReactLynx** (lynx-js/react). It focuses on exactly three things: **auto-playing vertical feed**, **swipe up/down to switch videos**, and **like/comment**.

---

# 0) Scope + UX rules

* **Home = Feed** (no tabs).
* **One video per screen** (full-bleed).
* **Auto-play current item**, **pause neighbors**.
* **Swipe up/down** to change item (snap to page).
* **Double-tap like** or tap ❤️; tap 💬 opens an inline comments sheet.
* Local in-memory store is fine; wire to real API later.

---

# 1) Project shape

```
src/
  App.tsx                // Router-free; renders <FeedScreen />
  screens/FeedScreen.tsx
  components/
    VideoCard.tsx        // video + overlay controls + like/comment buttons
    CommentsSheet.tsx    // modal/sheet w/ list + input
    HUD.tsx              // simple overlay: likes/comments counters
  lib/
    feed.ts              // feed service (mock for now)
    player.ts            // simple player helpers (play/pause, visibility)
    gestures.ts          // swipe handlers / snap logic
  types.ts               // Video, Comment types
  state.ts               // simple feed + likes store (Context or jotai/zustand)
assets/
  mock/                  // mp4/webm placeholders, thumbnails, avatars
```

---

# 2) Data model (MVP)

```ts
// types.ts
export type Video = {
  id: string;
  src: string;           // URL to mp4/webm (local or CDN)
  caption: string;
  author: { id: string; name: string; avatar?: string };
  stats: { likes: number; comments: number };
  meLiked?: boolean;
};

export type Comment = {
  id: string;
  user: { id: string; name: string; avatar?: string };
  text: string;
  ts: number;
};
```

**Mock service** (swap with real later):

```ts
// lib/feed.ts
export async function fetchFeed(page=0): Promise<Video[]> { /* return 5–10 */ }
export async function fetchComments(videoId: string): Promise<Comment[]> { /* ... */ }
export async function sendLike(videoId: string, like: boolean): Promise<void> { /* optimistic */ }
export async function sendComment(videoId: string, text: string): Promise<Comment> { /* optimistic */ }
```

---

# 3) State management (simple + optimistic)

* **currentIndex**: which card is on screen.
* **videos\[]**: loaded pages.
* **likes/comments**: optimistically mutate local state; fire API in background (if you add a backend later).

```ts
// state.ts
import { create } from "zustand";

type FeedState = {
  videos: Video[];
  index: number;
  setVideos(v: Video[]): void;
  setIndex(i: number): void;
  toggleLike(id: string): void;
  bumpCommentCount(id: string): void;
};

export const useFeed = create<FeedState>((set, get) => ({
  videos: [],
  index: 0,
  setVideos: (videos) => set({ videos }),
  setIndex: (i) => set({ index: i }),
  toggleLike: (id) => set(s => ({
    videos: s.videos.map(v =>
      v.id === id ? {
        ...v,
        meLiked: !v.meLiked,
        stats: {
          ...v.stats,
          likes: v.stats.likes + (v.meLiked ? -1 : 1)
        }
      } : v
    )
  })),
  bumpCommentCount: (id) => set(s => ({
    videos: s.videos.map(v =>
      v.id === id ? { ...v, stats: { ...v.stats, comments: v.stats.comments + 1 } } : v
    )
  }))
}));
```

---

# 4) Feed layout & gestures

Use a **vertical pager** pattern: a `Scroll` with **snap per page** (one item = viewport height). Only keep **3 cards mounted** (prev, current, next) for perf; prefetch next video URL.

**Key behaviors**

* On scroll end, compute `newIndex = round(scrollY / screenH)`, clamp, setIndex.
* Auto-play `currentIndex`, pause others.
* When `index` nears end (e.g., last-2), `fetchFeed(page+1)` and append.

---

# 5) VideoCard component (auto-play + overlay)

```tsx
// components/VideoCard.tsx
import { useEffect, useRef } from "react";
import { View, Text, Image, Pressable, Video } from "@lynx-js/react"; // names illustrative

export default function VideoCard({
  video,
  isActive,
  onLike,
  onOpenComments,
}: {
  video: Video;
  isActive: boolean;
  onLike: () => void;
  onOpenComments: () => void;
}) {
  const ref = useRef<any>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (isActive) ref.current.play?.();
    else ref.current.pause?.();
  }, [isActive]);

  const onDoubleTap = () => onLike();

  return (
    <View className="w-full h-full bg-black relative">
      <Video
        ref={ref}
        src={video.src}
        loop
        muted={false}
        resizeMode="cover"
        className="absolute inset-0"
      />
      {/* Touch capture for double-tap like */}
      <Pressable className="absolute inset-0" onDoubleClick={onDoubleTap} />

      {/* Right-side HUD */}
      <View className="absolute right-3 bottom-16 items-center gap-4">
        <Pressable onClick={onLike}>
          <View className="items-center">
            <Text className={`text-3xl ${video.meLiked ? "text-red-500" : "text-white"}`}>♥</Text>
            <Text className="text-white text-sm">{video.stats.likes}</Text>
          </View>
        </Pressable>
        <Pressable onClick={onOpenComments}>
          <View className="items-center">
            <Text className="text-3xl text-white">💬</Text>
            <Text className="text-white text-sm">{video.stats.comments}</Text>
          </View>
        </Pressable>
      </View>

      {/* Caption + author (left-bottom) */}
      <View className="absolute left-3 bottom-6 right-24">
        <Text className="text-white font-bold">@{video.author.name}</Text>
        <Text className="text-white opacity-90 mt-1">{video.caption}</Text>
      </View>
    </View>
  );
}
```

*(API names are illustrative—adapt to Lynx/ReactLynx elements in your setup.)*

---

# 6) Feed screen (pager + autoplay control)

```tsx
// screens/FeedScreen.tsx
import { useEffect, useRef } from "react";
import { View, Scroll } from "@lynx-js/react";
import { useFeed } from "../state";
import { fetchFeed, sendLike } from "../lib/feed";
import VideoCard from "../components/VideoCard";
import CommentsSheet from "../components/CommentsSheet";

export default function FeedScreen() {
  const { videos, index, setVideos, setIndex, toggleLike } = useFeed();
  const pageH = /* read viewport height via hook */ 800;

  useEffect(() => {
    (async () => setVideos(await fetchFeed(0)))();
  }, []);

  const onScrollEnd = (offsetY: number) => {
    const i = Math.max(0, Math.min(videos.length - 1, Math.round(offsetY / pageH)));
    if (i !== index) setIndex(i);
    // prefetch next if near end
    if (i >= videos.length - 2) {/* fetch next page and append */}
  };

  const like = async (id: string) => {
    toggleLike(id);
    sendLike(id, true).catch(() => toggleLike(id)); // revert on fail
  };

  return (
    <View className="w-full h-full bg-black">
      <Scroll
        vertical
        snapToInterval={pageH}
        decelerationRate="fast"
        showsScrollIndicator={false}
        onMomentumScrollEnd={(e: any) => onScrollEnd(e.contentOffset.y)}
      >
        {videos.map((v, i) => (
          <View key={v.id} style={{ height: pageH }}>
            <VideoCard
              video={v}
              isActive={i === index}
              onLike={() => like(v.id)}
              onOpenComments={() => {/* open sheet for v.id */}}
            />
          </View>
        ))}
      </Scroll>

      {/* comments sheet (portal/modal) */}
      <CommentsSheet /* controlled by state */ />
    </View>
  );
}
```

---

# 7) Comments sheet (inline list + input)

* Fetch comments on first open; keep them cached per video ID.
* Optimistic append on send.

```tsx
// components/CommentsSheet.tsx (sketch)
export default function CommentsSheet({ videoId, open, onClose }) {
  const [comments, setComments] = useState<Comment[]>([]);
  useEffect(() => { if (open) fetchComments(videoId).then(setComments); }, [open, videoId]);

  return open ? (
    <View className="absolute inset-x-0 bottom-0 h-1/2 bg-[rgba(0,0,0,0.85)] rounded-t-2xl">
      {/* list + input */}
    </View>
  ) : null;
}
```

---

# 8) Performance & polish checklist

* **Only play current**: pause neighbors.
* **Snap paging**: avoids awkward partial frames.
* **Prefetch next video**: when index changes, create `<Video preload>` or warm the source.
* **Mount only ±1**: if performance dips, only render `[index-1, index, index+1]`.
* **Gesture priority**: ensure vertical scroll wins over nested components.
* **Fallback tap areas**: bigger hitboxes for ❤️/💬.

---

# 9) Testing script (for your demo video)

1. Launch → auto-plays the first video.
2. Swipe up twice (smooth snap + immediate auto-play).
3. Double-tap to like (counter increments, heart turns red).
4. Tap 💬 → sheet slides up → add a comment → counter +1.
5. Swipe down (previous video resumes playback).
6. End with “next video is preloaded—instant start”.

---

# 10) What to stub vs build

* **Stub now:** auth, profiles, upload, real backend.
* **Build now:** feed scroll, auto-play, like/comment UI, comments sheet, prefetch.
* **Optional extras (if time):**

  * **Long-press** to pause; **mute toggle**; **loading spinner** between sources.
  * **Error state** per card (“Tap to retry”).

---

If you want, I can adapt those components to the **exact Lynx/ReactLynx element names** you’re using (e.g., `LynxVideo`, `LynxScroll`, `LynxModal`) and hand you a copy-paste `App.tsx` with working mock data.
