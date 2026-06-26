import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Song, RepeatMode } from '../types/music';
import { shuffleArray } from '../lib/utils';
import { PLAYER_CONFIG } from '../config/constants';

interface QueueState {
  queue: Song[];
  history: Song[];
  currentIndex: number;
  repeatMode: RepeatMode;
  isShuffled: boolean;
  originalQueue: Song[];
  needsRecommendations: boolean;

  setQueue: (songs: Song[], startIndex?: number) => void;
  addToQueue: (song: Song) => void;
  addToQueueMultiple: (songs: Song[]) => void;
  addNext: (song: Song) => void;
  addNextMultiple: (songs: Song[]) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  clearQueue: () => void;
  playNext: () => Song | null;
  playPrevious: () => Song | null;
  toggleShuffle: () => void;
  setRepeatMode: (mode: RepeatMode) => void;
  cycleRepeatMode: () => void;
  getCurrentSong: () => Song | null;
  hasNext: () => boolean;
  hasPrevious: () => boolean;
  addRecommendations: (songs: Song[]) => void;
  getUpcoming: () => Song[];
  setNeedsRecommendations: (needs: boolean) => void;
  jumpToIndex: (index: number) => Song | null;
}

export const useQueueStore = create<QueueState>()(
  persist(
    (set, get) => ({
      queue: [],
      history: [],
      currentIndex: -1,
      repeatMode: 'off' as RepeatMode,
      isShuffled: false,
      originalQueue: [],
      needsRecommendations: false,

      setQueue: (songs: Song[], startIndex = 0) => {
        set({
          queue: songs,
          originalQueue: songs,
          currentIndex: startIndex,
          isShuffled: false,
          needsRecommendations: songs.length <= PLAYER_CONFIG.MIN_QUEUE_SIZE,
        });
      },

      addToQueue: (song: Song) => {
        const { queue, originalQueue } = get();
        // Avoid duplicates in sequence
        const exists = queue.some(s => s.id === song.id);
        if (exists) return;
        set({
          queue: [...queue, song],
          originalQueue: [...originalQueue, song],
        });
      },

      addToQueueMultiple: (songs: Song[]) => {
        const { queue, originalQueue } = get();
        const existingIds = new Set(queue.map(s => s.id));
        const newSongs = songs.filter(s => !existingIds.has(s.id));
        if (newSongs.length === 0) return;
        set({
          queue: [...queue, ...newSongs],
          originalQueue: [...originalQueue, ...newSongs],
        });
      },

      addNext: (song: Song) => {
        const { queue, currentIndex, originalQueue } = get();
        const newQueue = [...queue];
        newQueue.splice(currentIndex + 1, 0, song);
        set({
          queue: newQueue,
          originalQueue: [...originalQueue, song],
        });
      },

      addNextMultiple: (songs: Song[]) => {
        const { queue, currentIndex, originalQueue } = get();
        const newQueue = [...queue];
        newQueue.splice(currentIndex + 1, 0, ...songs);
        set({
          queue: newQueue,
          originalQueue: [...originalQueue, ...songs],
        });
      },

      removeFromQueue: (index: number) => {
        const { queue, currentIndex } = get();
        if (index < 0 || index >= queue.length) return;
        const newQueue = queue.filter((_, i) => i !== index);
        let newIndex = currentIndex;
        if (index < currentIndex) newIndex--;
        else if (index === currentIndex) newIndex = Math.min(newIndex, newQueue.length - 1);
        set({ queue: newQueue, currentIndex: newIndex });
      },

      reorderQueue: (fromIndex: number, toIndex: number) => {
        const { queue, currentIndex } = get();
        const newQueue = [...queue];
        const [moved] = newQueue.splice(fromIndex, 1);
        newQueue.splice(toIndex, 0, moved);

        let newIndex = currentIndex;
        if (fromIndex === currentIndex) {
          newIndex = toIndex;
        } else {
          if (fromIndex < currentIndex && toIndex >= currentIndex) newIndex--;
          if (fromIndex > currentIndex && toIndex <= currentIndex) newIndex++;
        }
        set({ queue: newQueue, currentIndex: newIndex });
      },

      clearQueue: () => {
        set({ queue: [], originalQueue: [], currentIndex: -1, history: [] });
      },

      playNext: () => {
        const { queue, currentIndex, repeatMode, history } = get();
        const currentSong = queue[currentIndex];

        if (repeatMode === 'one') {
          return currentSong || null;
        }

        let nextIndex = currentIndex + 1;

        if (nextIndex >= queue.length) {
          if (repeatMode === 'all') {
            nextIndex = 0;
          } else {
            // Queue exhausted - flag for recommendations
            set({ needsRecommendations: true });
            return null;
          }
        }

        const newHistory = currentSong ? [...history, currentSong].slice(-50) : history;
        const needsRecs = nextIndex >= queue.length - 3;

        set({
          currentIndex: nextIndex,
          history: newHistory,
          needsRecommendations: needsRecs,
        });

        return queue[nextIndex] || null;
      },

      playPrevious: () => {
        const { queue, currentIndex, history } = get();

        if (currentIndex > 0) {
          set({ currentIndex: currentIndex - 1 });
          return queue[currentIndex - 1] || null;
        }

        // Go to last history item
        if (history.length > 0) {
          const prevSong = history[history.length - 1];
          const newHistory = history.slice(0, -1);
          const newQueue = [prevSong, ...queue];
          set({
            queue: newQueue,
            history: newHistory,
            currentIndex: 0,
          });
          return prevSong;
        }

        return null;
      },

      toggleShuffle: () => {
        const { queue, currentIndex, isShuffled, originalQueue } = get();
        const currentSong = queue[currentIndex];

        if (isShuffled) {
          // Restore original order
          const newIndex = currentSong
            ? originalQueue.findIndex(s => s.id === currentSong.id)
            : 0;
          set({
            queue: originalQueue,
            currentIndex: Math.max(0, newIndex),
            isShuffled: false,
          });
        } else {
          // Shuffle, keeping current song at current position
          const remaining = queue.filter((_, i) => i !== currentIndex);
          const shuffled = shuffleArray(remaining);
          const newQueue = currentSong
            ? [currentSong, ...shuffled]
            : shuffled;
          set({
            originalQueue: queue,
            queue: newQueue,
            currentIndex: 0,
            isShuffled: true,
          });
        }
      },

      setRepeatMode: (mode: RepeatMode) => set({ repeatMode: mode }),

      cycleRepeatMode: () => {
        const modes: RepeatMode[] = ['off', 'all', 'one'];
        const { repeatMode } = get();
        const currentIdx = modes.indexOf(repeatMode);
        set({ repeatMode: modes[(currentIdx + 1) % modes.length] });
      },

      getCurrentSong: () => {
        const { queue, currentIndex } = get();
        return queue[currentIndex] || null;
      },

      hasNext: () => {
        const { queue, currentIndex, repeatMode } = get();
        return repeatMode !== 'off' || currentIndex < queue.length - 1;
      },

      hasPrevious: () => {
        const { currentIndex, history } = get();
        return currentIndex > 0 || history.length > 0;
      },

      addRecommendations: (songs: Song[]) => {
        const { queue } = get();
        const existingIds = new Set(queue.map(s => s.id));
        const newSongs = songs.filter(s => !existingIds.has(s.id));
        if (newSongs.length > 0) {
          set({
            queue: [...queue, ...newSongs],
            originalQueue: [...get().originalQueue, ...newSongs],
            needsRecommendations: false,
          });
        }
      },

      getUpcoming: () => {
        const { queue, currentIndex } = get();
        return queue.slice(currentIndex + 1);
      },

      setNeedsRecommendations: (needs: boolean) => set({ needsRecommendations: needs }),

      jumpToIndex: (index: number) => {
        const { queue, currentIndex, history } = get();
        if (index < 0 || index >= queue.length) return null;
        const currentSong = queue[currentIndex];
        const newHistory = currentSong ? [...history, currentSong].slice(-50) : history;
        set({ currentIndex: index, history: newHistory });
        return queue[index];
      },
    }),
    {
      name: 'tunehina-queue',
      partialize: (state) => ({
        queue: state.queue.slice(0, 100),
        currentIndex: state.currentIndex,
        repeatMode: state.repeatMode,
        isShuffled: state.isShuffled,
      }),
    },
  ),
);
