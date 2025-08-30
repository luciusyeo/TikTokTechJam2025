Awesome—here’s a **lean Plan.md** adapted for **React Native on Expo Go**. It keeps your exact MVP scope (auto-play vertical feed, snap paging, like + comments), but swaps in Expo-friendly libs and setup.

---

# TikTok-Style MVP — **Expo Go (React Native)**

## 0) Scope + UX rules

* **Home = Feed** (no tabs).
* **One video per screen** (full-bleed).
* **Auto-play current item**, **pause neighbors**.
* **Swipe up/down** to change item (**snap to page**).
* **Double-tap like** or tap ❤️; tap 💬 opens a comments sheet.
* Local in-memory store now; API later.

---

## 1) Project shape

```
app/
  index.tsx              // router-free; renders <FeedScreen />
src/
  screens/FeedScreen.tsx
  components/
    VideoCard.tsx        // <Video> + overlay controls + like/comment buttons
    CommentsSheet.tsx    // bottom-sheet (list + input)
    HUD.tsx              // overlay counters/icons
  lib/
    feed.ts              // mock feed/comments/likes
    player.ts            // play/pause helpers
    gestures.ts          // (optional) tap/double-tap helpers
  state.ts               // zustand store (feed, index, likes)
  types.ts               // Video, Comment
assets/
  videos/                // short mp4 test clips
  avatars/
```

---

## 2) Libraries (Expo-compatible)

* **Video**: `expo-av` (`Video`)
* **Lists**: RN `FlatList` with `pagingEnabled`
* **Gestures**: `react-native-gesture-handler`
* **Animations**: `react-native-reanimated`
* **Bottom Sheet**: `@gorhom/bottom-sheet` (Reanimated v3)
* **State**: `zustand` (simple, lightweight)
* **Optional**: `expo-haptics` (like feedback)

### Install

```bash
npx create-expo-app tiktok-mvp --template
cd tiktok-mvp
expo install expo-av react-native-gesture-handler react-native-reanimated
npm i @gorhom/bottom-sheet zustand
# (optional)
expo install expo-haptics
```

> In `babel.config.js`, ensure Reanimated plugin is last:

```js
plugins: ['react-native-reanimated/plugin']
```

---

## 3) Data model (MVP)

```ts
// src/types.ts
export type Video = {
  id: string;
  src: string;  // file:/// local or https://
  caption: string;
  author: { id: string; name: string; avatar?: string };
  stats: { likes: number; comments: number };
  meLiked?: boolean;
};

export type Comment = {
  id: string;
  user: { id: string; name: string; avatar?: string };
  text: string;
  ts: number; // epoch ms
};
```

---

## 4) Mock service (swap later)

```ts
// src/lib/feed.ts
import { Video, Comment } from "../types";

export async function fetchFeed(page=0): Promise<Video[]> {
  // return 5–10 local/remote MP4s
  return [
    { id: "v1", src: require("../../assets/videos/clip1.mp4"),
      caption: "City walk", author:{id:"u1",name:"marcus"},
      stats:{likes:120,comments:18}, meLiked:false },
    // ...
  ];
}

export async function fetchComments(videoId: string): Promise<Comment[]> { return []; }

export async function sendLike(videoId: string, like: boolean) { /* no-op mock */ }

export async function sendComment(videoId: string, text: string): Promise<Comment> {
  return { id: String(Math.random()), user:{id:"me",name:"You"}, text, ts: Date.now() };
}
```

---

## 5) State (optimistic)

```ts
// src/state.ts
import { create } from "zustand";
import { Video } from "./types";

type FeedState = {
  videos: Video[];
  index: number;
  setVideos(v: Video[]): void;
  setIndex(i: number): void;
  toggleLike(id: string): void;
  bumpCommentCount(id: string): void;
};

export const useFeed = create<FeedState>((set) => ({
  videos: [],
  index: 0,
  setVideos: (videos) => set({ videos }),
  setIndex: (i) => set({ index: i }),
  toggleLike: (id) => set(s => ({
    videos: s.videos.map(v =>
      v.id === id
        ? { ...v, meLiked: !v.meLiked, stats:{...v.stats, likes: v.stats.likes + (v.meLiked ? -1 : 1)} }
        : v)
  })),
  bumpCommentCount: (id) => set(s => ({
    videos: s.videos.map(v => v.id === id ? { ...v, stats:{...v.stats, comments: v.stats.comments + 1}} : v)
  })),
}));
```

---

## 6) Feed screen (snap paging + autoplay control)

**Key config**

* `FlatList` + `pagingEnabled`
* `decelerationRate="fast"`
* `onMomentumScrollEnd` → compute page index
* `onViewableItemsChanged` + `viewabilityConfig={{ itemVisiblePercentThreshold: 95 }}` to decide which video plays

```tsx
// src/screens/FeedScreen.tsx
import { useEffect, useRef } from "react";
import { Dimensions, View, FlatList, NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { useFeed } from "../state";
import { fetchFeed, sendLike } from "../lib/feed";
import VideoCard from "../components/VideoCard";
const H = Dimensions.get("window").height;

export default function FeedScreen() {
  const { videos, index, setVideos, setIndex, toggleLike } = useFeed();
  const viewConfig = useRef({ itemVisiblePercentThreshold: 95 }).current;

  useEffect(() => { (async () => setVideos(await fetchFeed(0)))(); }, []);

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const i = Math.max(0, Math.min(videos.length - 1, Math.round(y / H)));
    if (i !== index) setIndex(i);
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems?.[0]) setIndex(viewableItems[0].index);
  }).current;

  const like = async (id: string) => {
    toggleLike(id);
    try { await sendLike(id, true); } catch { toggleLike(id); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
      <FlatList
        data={videos}
        keyExtractor={(v) => v.id}
        renderItem={({ item, index: i }) => (
          <View style={{ height: H }}>
            <VideoCard
              video={item}
              isActive={i === index}
              onLike={() => like(item.id)}
            />
          </View>
        )}
        pagingEnabled
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewConfig}
      />
    </View>
  );
}
```

---

## 7) Video card (expo-av + double-tap like)

```tsx
// src/components/VideoCard.tsx
import { useEffect, useRef, useState } from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { Video } from "expo-av";
import { TapGestureHandler, State } from "react-native-gesture-handler";
import Animated, { useSharedValue, withTiming, useAnimatedStyle } from "react-native-reanimated";
import type { Video as V } from "../types";

export default function VideoCard({ video, isActive, onLike }: { video: V; isActive: boolean; onLike: () => void; }) {
  const ref = useRef<Video>(null);
  const [status, setStatus] = useState<any>(null);
  const heart = useSharedValue(0);

  useEffect(() => {
    (async () => {
      if (!ref.current) return;
      if (isActive) await ref.current.playAsync();
      else await ref.current.pauseAsync();
    })();
  }, [isActive]);

  const showHeart = () => {
    heart.value = 1;
    heart.value = withTiming(0, { duration: 450 });
  };

  const onDoubleTap = ({ nativeEvent }: any) => {
    if (nativeEvent.state === State.ACTIVE) {
      onLike();
      showHeart();
    }
  };

  const heartStyle = useAnimatedStyle(() => ({
    opacity: heart.value,
    transform: [{ scale: heart.value ? 1.6 : 0.8 }],
  }));

  return (
    <View style={StyleSheet.absoluteFill}>
      <Video
        ref={ref}
        style={StyleSheet.absoluteFill}
        source={typeof video.src === "string" ? { uri: video.src } : video.src}
        resizeMode="COVER"
        isLooping
        isMuted
        shouldPlay={isActive}
        onPlaybackStatusUpdate={setStatus}
      />
      <TapGestureHandler numberOfTaps={2} onHandlerStateChange={onDoubleTap}>
        <Pressable style={StyleSheet.absoluteFill} />
      </TapGestureHandler>

      {/* Right rail */}
      <View style={{ position: "absolute", right: 16, bottom: 120, alignItems: "center", gap: 16 }}>
        <Pressable onPress={onLike} hitSlop={10}>
          <Text style={{ fontSize: 28, color: video.meLiked ? "red" : "white" }}>♥</Text>
          <Text style={{ color: "white", textAlign: "center" }}>{video.stats.likes}</Text>
        </Pressable>
        {/* Comments button wired in Feed with a sheet */}
      </View>

      {/* Heart burst */}
      <Animated.View style={[{ position: "absolute", left: "45%", top: "45%" }, heartStyle]}>
        <Text style={{ fontSize: 64, color: "white" }}>♥</Text>
      </Animated.View>

      {/* Caption */}
      <View style={{ position: "absolute", left: 12, right: 80, bottom: 32 }}>
        <Text style={{ color: "white", fontWeight: "700" }}>@{video.author.name}</Text>
        <Text style={{ color: "white" }}>{video.caption}</Text>
      </View>
    </View>
  );
}
```

---

## 8) Comments sheet (bottom-sheet)

* Open on 💬; fetch on first open; optimistic append.

```tsx
// src/components/CommentsSheet.tsx (sketch)
import BottomSheet, { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { useEffect, useMemo, useRef, useState } from "react";
import { View, TextInput, Button, Text } from "react-native";
import { fetchComments, sendComment } from "../lib/feed";
import { Comment } from "../types";

export default function CommentsSheet({ videoId, open, onClose }: { videoId?: string; open: boolean; onClose: () => void; }) {
  const ref = useRef<BottomSheet>(null);
  const [items, setItems] = useState<Comment[]>([]);
  const snaps = useMemo(() => ["40%", "80%"], []);

  useEffect(() => {
    if (open && videoId) { fetchComments(videoId).then(setItems); ref.current?.expand(); }
    else ref.current?.close();
  }, [open, videoId]);

  const [text, setText] = useState("");
  const submit = async () => {
    if (!videoId || !text.trim()) return;
    const newC = await sendComment(videoId, text.trim());
    setItems((s) => [newC, ...s]);
    setText("");
  };

  return (
    <BottomSheet ref={ref} snapPoints={snaps} enablePanDownToClose onClose={onClose}>
      <BottomSheetFlatList
        data={items}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => <Text style={{ padding: 12 }}>{item.user.name}: {item.text}</Text>}
      />
      <View style={{ flexDirection: "row", padding: 12, gap: 8 }}>
        <TextInput style={{ flex: 1, borderWidth: 1, borderColor: "#444", padding: 10, borderRadius: 10 }} value={text} onChangeText={setText} placeholder="Add a comment…" />
        <Button title="Send" onPress={submit} />
      </View>
    </BottomSheet>
  );
}
```

---

## 9) Performance & snap checklist

* **Snap paging**: `FlatList` + `pagingEnabled` + `decelerationRate="fast"`.
* **Autoplay**: only `shouldPlay` on the current index; pause/unload others.
* **Preload**: keep short clips local (`require(...)`) for instant start on Expo Go.
* **Render window**: if needed, restrict to `index±1` using `getItemLayout` + conditional rendering.
* **Gestures**: double-tap must not conflict with single-tap pause (double-tap handler consumes the gesture).

---

## 10) QA script (for demo)

1. Launch → first video auto-plays (muted).
2. Swipe up (snap) → next video starts instantly.
3. Double-tap → like count + heart burst.
4. Tap 💬 → sheet slides up → add a comment → counter +1.
5. Swipe down → previous video resumes.

---

## 11) Run (Expo Go)

```bash
expo start
# Press "i" for iOS Simulator, or scan with Expo Go on device
```

---

## 12) What’s in / out

**Build now:** snap feed, auto-play, like (double-tap + button), comments sheet, prefetch/local assets.
**Stub now:** auth, upload, profiles, share/duet, notifications, recommendations.

---

## 13) Nice-to-have (still MVP-safe)

* Poster/thumbnail before playback.
* Buffer spinner.
* Haptics on like (`expo-haptics`).

---

If you want, I can zip this into a **starter repo structure** with the files above and working mock assets so you can `expo start` immediately.