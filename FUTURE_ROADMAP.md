# Future Roadmap

This document outlines the planned future architecture and feature iterations for TuneHina beyond the V1 foundation.

## 1. Future Listen Together Architecture

A major planned feature is the ability for users to listen to music synchronously across multiple devices.

### Proposed Architecture:
- **WebSocket Server:** A lightweight Node.js/Socket.io backend service will manage "Rooms".
- **Leader Election:** One user creates a room and becomes the "Host".
- **State Synchronization:** The Host's `playerStore` (specifically the `currentTime` and `currentSong`) will periodically broadcast state over the WebSocket.
- **Latency Compensation:** The client will calculate network latency (ping/pong) and offset the `audio.currentTime` dynamically to ensure synchronized playback across devices.
- **Queue Management:** Any user in the room can search and append to a shared `queueStore`, utilizing CRDTs (Conflict-free Replicated Data Types) or standard WebSocket broadcasts to keep queues identical.

## 2. User Accounts & Cloud Syncing

Currently, TuneHina uses IndexedDB/localStorage for Library and History. To make this cross-device:
- **Authentication:** Integrate Supabase or Firebase Auth.
- **Cloud Database:** Migrate the Dexie schema to Postgres via Supabase. 
- **Offline-First Sync:** Keep IndexedDB as the primary read source for maximum speed, but implement a background sync process that pushes changes to the cloud when online (similar to Linear's architecture).

## 3. Advanced PWA Capabilities

- **File System API:** Instead of storing large Audio ArrayBuffers inside IndexedDB, use the Origin Private File System (OPFS) for much faster I/O operations and higher storage quotas.
- **Background Sync API:** Allow downloads to continue even if the user closes the PWA tab.
- **Share Target API:** Allow the user to "Share" links from other apps directly into the TuneHina PWA to queue songs.

## 4. UI/UX Refinements

- **Visualizer:** Implement the Web Audio API to create a live frequency visualizer that reacts to the beat of the music on the Now Playing screen.
- **Infinite Scroll:** Implement Intersection Observers on the Search and Library pages to paginate results dynamically rather than using strict limit/offset buttons.
- **Drag and Drop Queues:** Use `dnd-kit` to allow users to manually reorder the 'Up Next' queue.
