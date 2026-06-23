# Architecture Overview

This document details the internal systems, abstractions, and data flows of TuneHina.

## Folder Structure

```text
src/
├── components/          # Reusable UI components (AppLayout, Sidebar, MiniPlayer)
├── config/              # Global constants (API urls, cache limits)
├── lib/                 # Utility functions (time formatting, styling wrappers)
├── pages/               # Primary Views (Home, NowPlaying, Search, Library, Downloads, Settings)
├── providers/           # API Abstractions
│   ├── lyrics/          # LyricsManager, LrcLibProvider, BoiduLyricsProvider, Parsers
│   └── music/           # JioSaavnProvider
├── services/            # Core business logic
│   ├── audioEngine.ts   # Robust HTML5 Audio wrapper
│   ├── db.ts            # Dexie DB schema
│   ├── downloadManager.ts
│   ├── offlineDetector.ts
│   └── themeEngine.ts   # Dynamic ColorThief extraction
├── stores/              # Zustand global state modules
├── types/               # Strict TypeScript interfaces
├── App.tsx              # Root wrapper
├── index.css            # Tailwind directives + Dynamic CSS Variables
├── main.tsx             # React DOM entry
└── router.tsx           # React Router DOM configuration
```

## Data Flow

TuneHina employs a unidirectional data flow popularized by React and Zustand. 

1. **User Action:** A user clicks a song.
2. **State Mutation:** The component calls `usePlayerStore.getState().playSong(song)`.
3. **Service Interaction:** The `playerStore` passes the song to the `AudioEngine`.
4. **Data Retrieval:** If the song is downloaded, `AudioEngine` requests the blob from Dexie (`db.ts`). Otherwise, it streams the URL.
5. **UI Update:** As `AudioEngine` plays, it emits events (`timeupdate`). The `playerStore` updates its `currentTime` state, triggering a reactive re-render of the `ProgressBar` and `Lyrics` components.

## Core Engines

### 1. Audio Engine
The `audioEngine.ts` service wraps a singleton `HTMLAudioElement`. 
- **Offline Fallback:** It detects `Blob` ArrayBuffers from IndexedDB and converts them to `URL.createObjectURL(blob)` for playback.
- **Crossfading:** Implements a custom volume fading interval to smoothly transition between tracks.
- **Media Session API:** Exposes lock-screen controls via `navigator.mediaSession.metadata` and action handlers.

### 2. Recommendation Engine
Located inside `queueStore.ts`, the recommendation engine ensures continuous playback.
- When `currentIndex` is within 3 tracks of the end of the queue, it triggers the `addRecommendations` method.
- It leverages the `JioSaavnProvider` to fetch "Similar Songs" to the currently playing track.
- It aggressively filters out songs already present in the queue to prevent looping.

### 3. Theme Engine
Located inside `themeEngine.ts`, this service dynamically re-themes the application per song.
- Uses `colorthief` to draw the current artwork onto a hidden canvas and extract dominant RGB values.
- Converts RGB into HSL to safely generate darker/lighter text and background variants.
- Injects these values directly into the document root via `document.documentElement.style.setProperty`, updating Tailwind CSS `var(--theme-primary)` classes instantaneously without React re-renders.

## Offline Strategy

Offline functionality is a core pillar of TuneHina:
- **DownloadManager:** Streams HTTP responses using `ReadableStream` chunks, calculating progress, and concatenating into a `Blob`.
- **IndexedDB (Dexie):** The ArrayBuffer of the Blob is stored inside the `downloadedSongs` table alongside track metadata.
- **OfflineDetector:** Listens to `window.addEventListener('offline')` and updates a global flag.
- **AudioEngine:** Intercepts playback requests. If offline, it queries Dexie for the song ID before attempting to stream the URL.

## PWA Strategy

The `vite-plugin-pwa` configuration manages Workbox caching.
- **`generateSW`**: Automatically caches the bundled HTML/CSS/JS shell.
- **API Cache**: `StaleWhileRevalidate` strategy for JioSaavn API responses.
- **Media Cache**: `CacheFirst` strategies with specific maximum entry limits for `c.saavncdn.com` (artwork) and `aac.saavncdn.com` (audio streams).
- **Web Manifest**: Declares standalone display, theme colors, and icons for native-like installation.
