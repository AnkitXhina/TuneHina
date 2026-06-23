# TuneHina V1

TuneHina is a modern, production-ready music streaming Progressive Web App (PWA). It is designed with a relentless focus on aesthetics, featuring a centerpiece "Now Playing" experience with dynamic color extraction, synchronized karaoke-style lyrics, robust offline playback, and an intelligent recommendation engine.

## Project Overview

TuneHina aggregates music metadata, audio streams, and lyrics from public APIs (JioSaavn, LRCLIB, Boidu) into a unified, lightning-fast React application. It operates natively in the browser with no required backend infrastructure, utilizing aggressive Workbox caching and IndexedDB for seamless offline experiences.

### Key Features
- **Immersive "Now Playing" Experience:** Dynamic artwork blurring, fluid transitions, and synchronized auto-scrolling lyrics.
- **Continuous Playback:** The queue intelligently auto-extends itself with related songs before it runs out.
- **Offline Mode:** Full support for caching streaming responses and explicitly downloading songs into a local binary store.
- **PWA Ready:** Installable on desktop and mobile, mimicking a native application.
- **Zero Backend:** Runs entirely on the edge/client.

## Technology Stack

### Frontend Core
- **Framework:** React 19 + TypeScript
- **Build Tool:** Vite
- **Routing:** React Router DOM
- **State Management:** Zustand (Modular stores for Player, Queue, Library, Theme, UI)

### UI & Styling
- **CSS Framework:** TailwindCSS v3
- **Animations:** Framer Motion
- **Components:** Radix UI (Headless primitives) + Lucide React (Icons)
- **Theming:** ColorThief (Canvas-based dynamic RGB extraction)

### Data & Caching
- **Local Storage:** Dexie.js (IndexedDB wrapper for audio blobs and library data)
- **PWA:** `vite-plugin-pwa` + Workbox Strategies

## Quick Start

### Prerequisites
- Node.js >= 18
- npm

### Installation
```bash
# Clone the repository and install dependencies
npm install

# Start the development server with HMR
npm run dev

# Build the project for production
npm run build
```

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).
For a deep dive into the architecture, see [ARCHITECTURE.md](./ARCHITECTURE.md).
