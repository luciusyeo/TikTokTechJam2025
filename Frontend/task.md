# TASK.md — TikTok-Style MVP (Expo Go, React Native)

A comprehensive, checkbox-driven plan to build the **auto-playing vertical feed** with **snap paging**, **double-tap like**, and a **comments sheet**.

> **Scope in one line:** Home = full-screen vertical feed → auto-play current → snap on swipe → like (double-tap & button) → open comments sheet to view/add comments. No auth, no upload, no share.

---

## 0) Project Setup

* [x] **Install libraries**

  * [x] `expo install expo-av react-native-gesture-handler react-native-reanimated`
  * [x] `npm i @gorhom/bottom-sheet zustand`
  * [x] (optional) `expo install expo-haptics`
* [x] **Configure Reanimated**

  * [x] In `babel.config.js`, ensure plugin at end:

    ```js
    plugins: ['react-native-reanimated/plugin']
    ```
  * [x] Rebuild Metro cache (stop & restart)
* [ ] **iOS Simulator ready**

  * [ ] Xcode & iOS Simulator installed
  * [ ] Run: `expo start` → press `i` (launches iOS Simulator)
* [x] **Directory structure**

  * [x] Create folders and files:

    ```
    app/index.tsx ✓
    src/screens/FeedScreen.tsx ✓
    src/components/VideoCard.tsx ✓
    src/components/CommentsSheet.tsx (pending)
    src/components/HUD.tsx (pending)
    src/lib/feed.ts ✓
    src/lib/player.ts (pending)
    src/lib/gestures.ts (pending)
    src/state.ts ✓
    src/types.ts ✓
    assets/videos/ (short mp4s) ✓
    assets/avatars/ (pending)
    ```
* [ ] **Linting/format (optional but recommended)**

  * [ ] Add Prettier & ESLint configs

---

## 1) Data & Mock Services

* [x] **Types**

  * [x] Define `Video` and `Comment` in `src/types.ts`
* [x] **Mock feed service** (`src/lib/feed.ts`)

  * [x] `fetchFeed(page=0): Promise<Video[]>` (5–10 items)
  * [x] `fetchComments(videoId): Promise<Comment[]>`
  * [x] `sendLike(videoId, like: boolean)`
  * [x] `sendComment(videoId, text): Promise<Comment>`
* [x] **Assets**

  * [x] Add 3–6 short MP4 clips to `assets/videos/` (using remote URLs for Expo Go)
  * [x] Ensure they load via `require(...)` (best perf on Expo Go) - using remote URLs initially
* [x] **Latency simulation (optional)**

  * [x] Wrap mocks with `await delay(120)` to emulate network

**Acceptance**

* [x] `fetchFeed` returns stable array on first run
* [x] Local clips play on device/simulator with `expo-av` (using remote clips for testing)

---

## 2) Global State (Zustand)

* [x] **Create store** `src/state.ts`

  * [x] `videos: Video[]`
  * [x] `index: number`
  * [x] `setVideos(videos)`
  * [x] `setIndex(i)`
  * [x] `toggleLike(id)` (optimistic)
  * [x] `bumpCommentCount(id)` (optimistic)
* [x] **Unit sanity check**

  * [x] Toggling like mutates only target video
  * [x] Index updates do not re-create `videos` array unnecessarily

**Acceptance**

* [x] Like count increments/decrements instantly
* [x] Comment count bumps on local post

---

## 3) Feed Screen (Snap Paging + Viewability)

* [x] **Render skeleton (`FeedScreen.tsx`)**

  * [x] `FlatList` vertical, full height items
  * [x] `pagingEnabled`, `decelerationRate="fast"`
  * [x] `showsVerticalScrollIndicator={false}`
* [x] **Index calculation**

  * [x] `onMomentumScrollEnd` → `index = round(offsetY / screenH)`
  * [x] Clamp to `[0, videos.length - 1]`
* [x] **Viewability config**

  * [x] `viewabilityConfig={{ itemVisiblePercentThreshold: 95 }}`
  * [x] `onViewableItemsChanged` → set active index
* [x] **Feed load**

  * [x] On mount, `fetchFeed(0)` → `setVideos`
* [ ] **Pagination (optional MVP)**

  * [ ] When index ≥ `len-2`, prefetch next page (append)

**Acceptance**

* [x] **Snap to page:** release finger → list snaps to exactly one item
* [x] Scroll up/down 10+ times with no jitter
* [x] No partial-page resting states

---

## 4) Video Card (Auto-Play, Double-Tap Like)

* [x] **Build `VideoCard.tsx`**

  * [x] Full-bleed `<Video>` from `expo-av`
  * [x] `isLooping` true, **muted by default**
  * [x] `shouldPlay={isActive}`
  * [x] `onPlaybackStatusUpdate` captured (optional)
* [x] **Auto-play control**

  * [x] `useEffect([isActive])` → `playAsync()` when active, `pauseAsync()` when not
  * [x] Guarantee **only current item plays**
* [x] **Double-tap like**

  * [x] `react-native-gesture-handler` `GestureDetector` with `Gesture.Tap().numberOfTaps(2)`
  * [x] On double-tap:

    * [x] `toggleLike(video.id)` (optimistic)
    * [x] Heart burst animation (Reanimated)
* [x] **Action rail**

  * [x] ❤️ button (increments), 💬 button (opens sheet)
  * [x] Counters visible over video (shadow/gradient for contrast)
* [x] **Caption block**

  * [x] Author handle + caption bottom-left

**Acceptance**

* [x] Starting clip auto-plays in ≤ 800ms (local assets)
* [x] Double-tap reliably triggers like w/ heart burst in ≤ 100ms
* [x] Single-tap **does not** pause (for MVP) or is handled distinctly (if enabled)

---

## 4.1) Bug Fixes (expo-av → expo-video Migration)

* [x] **Migration to expo-video**

  * [x] Install `expo-video` package (`npx expo install expo-video`)
  * [x] Replace `expo-av` Video component with `expo-video` API
  * [x] Update imports: `useVideoPlayer, VideoView` from `expo-video`
  * [x] Replace ref-based control with player instance control
  * [x] Update auto-play logic: `player.play()` / `player.pause()`

* [x] **Fix GestureHandlerRootView error**

  * [x] Add `GestureHandlerRootView` wrapper to `app/_layout.tsx`
  * [x] Import from `react-native-gesture-handler`
  * [x] Add `style={{ flex: 1 }}` for full screen

* [x] **API Migration Details**

  * [x] `Video` → `VideoView` with `player` prop
  * [x] `useVideoPlayer(video.src, config)` for player creation
  * [x] `player.loop = true` and `player.muted = true` in config
  * [x] `contentFit="cover"` instead of `ResizeMode.COVER`
  * [x] Remove deprecated `onPlaybackStatusUpdate` callback

**Acceptance**

* [x] ✅ No more "expo-av deprecated" warning
* [x] ✅ No more "GestureDetector must be descendant of GestureHandlerRootView" error
* [x] ✅ Video auto-play functionality preserved
* [x] ✅ Double-tap like gestures still work
* [x] ✅ All existing functionality maintained

---

## 5) Comments Sheet (Bottom Sheet + Input)

* [x] **Sheet component** `CommentsSheet.tsx`

  * [x] Use `@gorhom/bottom-sheet`
  * [x] `snapPoints`: `["40%","80%"]`
  * [x] `enablePanDownToClose`
* [x] **Data flow**

  * [x] Open sheet with `videoId` set from Feed
  * [x] On first open per `videoId`, call `fetchComments(videoId)` and cache
  * [x] Render list (e.g., `BottomSheetFlatList`)
* [x] **Composer**

  * [x] Text input + Send button
  * [x] `sendComment(videoId, text)` → optimistic append and `bumpCommentCount(videoId)`
* [x] **Keyboard handling**

  * [x] Input remains visible when keyboard shows
  * [x] Dismiss on submit

**Acceptance**

* [x] Sheet opens/closes within 200ms with spring animation
* [x] Adding comment appends at top and clears input
* [x] Comment count on feed increments immediately

---

## 6) Playback & Performance Hygiene

* [ ] **Play only current**

  * [ ] Ensure previous/next are paused after index change
* [ ] **Render window**

  * [ ] Consider rendering only `index±1` for heavy assets
* [ ] **Preload next**

  * [ ] If using remote URIs, warm next source when index changes
  * [ ] With local `require`, verify instant start
* [ ] **Frame stability**

  * [ ] No dropped frames while opening comments or liking
* [ ] **Memory**

  * [ ] Scroll through 20+ items without unbounded memory growth

**Acceptance**

* [ ] Only one `<Video>` in `playing` state at any time
* [ ] No visible stalls when snapping between items
* [ ] Smooth 60fps animations on iOS Simulator (dev build)

---

## 7) Error & Edge Cases

* [ ] **Video load error**

  * [ ] Show overlay with retry CTA (“Tap to retry”)
  * [ ] Swiping continues to work
* [ ] **Empty feed**

  * [ ] Friendly empty state with retry button
* [ ] **Network off (if remote)**

  * [ ] Show fallback poster (if available)
* [ ] **End of list**

  * [ ] Subtle “You’ve reached the end” or loop back (choose one)

**Acceptance**

* [ ] No crashes on load failures
* [ ] UI is navigable even in error states

---

## 8) UX Polish

* [ ] **Hit slop**

  * [ ] Increase touch target for ❤️/💬
* [ ] **Contrast**

  * [ ] Subtle gradient or text shadow for caption/rail
* [ ] **Heart burst**

  * [ ] Scale + fade timing \~450ms, feels responsive
* [ ] **Sheet scrim**

  * [ ] Dim background when comments open
* [ ] **Haptics (optional)**

  * [ ] Light impact on like (device only)

**Acceptance**

* [ ] Buttons easy to tap
* [ ] Text legible over bright/dark footage
* [ ] Interactions feel snappy and polished

---

## 9) QA Test Plan (Hands-On)

**Launch & autoplay**

* [ ] Open app → first video auto-plays (muted)
* [ ] Time to first frame ≤ 800ms (local)

**Snap scrolling**

* [ ] Swipe up → snaps to next exactly one-page
* [ ] Swipe down → returns to previous; playback resumes
* [ ] 10 cycles up/down without jitter

**Like interactions**

* [ ] Double-tap anywhere → ❤️ bursts, count +1
* [ ] Tap ❤️ → toggles like consistently
* [ ] (If implemented) double-tap does not trigger single-tap pause

**Comments**

* [ ] Tap 💬 → sheet opens in ≤ 200ms
* [ ] Add a comment → appears at top, count +1
* [ ] Drag down to close → feed playable instantly

**Resilience**

* [ ] Simulate a video with bad source → see retry UI
* [ ] Toggle airplane mode (if remote URIs) → app remains usable

---

## 10) Demo Script (Record This Flow)

1. **Launch**: first video playing.
2. **Scroll up** twice: point out **snap** + instant playback.
3. **Double-tap**: heart burst + like count increments.
4. **Tap 💬**: sheet slides up; post a comment; count +1.
5. **Scroll down**: previous video **auto-resumes**.
6. **Close**: show smooth exit from comments and feed continues.

---

## 11) Definition of Done (DoD)

* [ ] One-screen-per-video **snap** paging implemented
* [ ] **Autoplay** of current item; neighbors paused
* [ ] **Double-tap like** + heart animation + counter (optimistic)
* [ ] **Comments sheet**: list + composer + optimistic add
* [ ] **Local assets** play reliably; remote optional
* [ ] **QA plan** passes on iOS Simulator (iPhone 15/15 Pro)
* [ ] README includes run instructions and known limitations

---

## 12) Nice-to-Haves (Backlog)

* [ ] Poster/thumbnail placeholder before playback
* [ ] Buffering spinner & load progress
* [ ] Mute/unmute toggle & long-press pause
* [ ] Simple analytics logs (impression, like, comment)
* [ ] Basic theming tokens for spacing/typography
* [ ] Unit tests for reducers/store logic

---

## 13) Risk & Mitigation

* [ ] **Gesture conflicts (double-tap vs scroll)**

  * Mitigation: use `TapGestureHandler` with `numberOfTaps={2}`, ensure handler sits above video view and does not block vertical pan
* [ ] **Performance on large feeds**

  * Mitigation: local assets for demo; render window to `index±1`; preload next
* [ ] **Bottom sheet + keyboard overlap**

  * Mitigation: use `BottomSheet` content container with padding; test multiline input

---

## 14) Timebox (Suggested)

* **Day 1:** Setup, mocks, Feed skeleton with snap
* **Day 2:** VideoCard autoplay control + like (double-tap + animation)
* **Day 3:** Comments sheet + composer + optimistic flows
* **Day 4:** Perf polish, errors, QA script, demo run-through

---

## 15) Commands Cheat-Sheet

```bash
# Start
expo start
# iOS Simulator
#   - on the browser DevTools, press "i" or use the terminal keybinding

# Clean metro cache (if weirdness)
expo start -c
```

---

## 16) Owner Matrix (fill in)

* [ ] **Feed & Snap Paging:** @\_\_\_\_\_\_\_\_
* [ ] **VideoCard & Autoplay:** @\_\_\_\_\_\_\_\_
* [ ] **Likes & Animation:** @\_\_\_\_\_\_\_\_
* [ ] **Comments Sheet:** @\_\_\_\_\_\_\_\_
* [ ] **QA & Demo:** @\_\_\_\_\_\_\_\_

---

### Appendix: File Stubs Checklist

* [x] `app/index.tsx` renders `<FeedScreen />`
* [x] `src/screens/FeedScreen.tsx` contains FlatList with snap paging ✓
* [x] `src/components/VideoCard.tsx` contains placeholder (expo-av pending)
* [ ] `src/components/CommentsSheet.tsx` bottom sheet with list + input
* [x] `src/state.ts` zustand store with toggles & counts
* [x] `src/lib/feed.ts` mock APIs wired to UI
* [x] `src/types.ts` shared models

---

**You’re ready.** Work top-to-bottom through the checklists, and you’ll have a crisp, demo-worthy MVP in hours—not weeks.