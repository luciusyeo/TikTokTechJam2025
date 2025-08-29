# TikTok-Style Feed App - Task Checklist

## Project Overview
**Goal**: Build a lean MVP TikTok-style feed with auto-playing vertical videos, swipe navigation, and like/comment functionality using Lynx + ReactLynx.

## Phase 1: Foundation
- [x] Add Zustand dependency for state management
- [x] Create project folder structure (components/, screens/, lib/, types.ts, state.ts)
- [x] Define Video and Comment types in types.ts

## Phase 2: Data & State Layer
- [x] Create mock feed service in lib/feed.ts with fetchFeed, fetchComments, sendLike, sendComment functions
- [x] Set up Zustand store in state.ts with feed state management (videos, index, toggleLike, etc)

## Phase 3: Core Components
- [ ] Create VideoCard component with auto-play video, overlay controls, and like/comment buttons
- [ ] Create HUD component for displaying likes and comments counters
- [ ] Create CommentsSheet modal component with comments list and input

## Phase 4: Main Screen & UX
- [ ] Create FeedScreen with vertical paging scroll, snap-to-page behavior, and auto-play control
- [ ] Add swipe gesture handling with proper index management and video play/pause logic

## Phase 5: Integration & Testing
- [ ] Replace current App.tsx to render FeedScreen instead of demo content
- [ ] Create mock video assets and sample data for testing
- [ ] Test complete user flow: swipe up/down, double-tap like, comment functionality

## Phase 6: Optimization & Polish
- [ ] Add performance optimizations (only mount ±1 videos, prefetch next video)
- [ ] Polish UI and ensure proper styling matches TikTok-style layout

## Key Technical Decisions
- **State Management**: Zustand for simple optimistic updates
- **Navigation**: Scroll with snapToInterval (no complex gestures)
- **Performance**: Mount only ±1 videos, prefetch next
- **UX Patterns**: Double-tap like, inline comment sheet
- **Architecture**: Vertical pager pattern with auto-play index tracking

## Testing Script (Final Demo)
1. Launch → auto-plays the first video
2. Swipe up twice (smooth snap + immediate auto-play)
3. Double-tap to like (counter increments, heart turns red)
4. Tap 💬 → sheet slides up → add a comment → counter +1
5. Swipe down (previous video resumes playback)
6. End with "next video is preloaded—instant start"

---

*Generated from plan.md analysis*