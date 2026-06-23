import { create } from 'zustand';
import type { Song } from '../types/music';
import { downloadManager, type DownloadProgress } from '../services/downloadManager';
import { db } from '../services/db';

interface DownloadState {
  downloads: Record<string, DownloadProgress>;
  downloadedIds: string[];

  startDownload: (song: Song) => Promise<void>;
  cancelDownload: (songId: string) => void;
  removeDownload: (songId: string) => Promise<void>;
  isDownloaded: (songId: string) => boolean;
  getProgress: (songId: string) => DownloadProgress | undefined;
  loadDownloadedSongs: () => Promise<void>;
  getDownloadedSongs: () => Promise<Song[]>;
}

export const useDownloadStore = create<DownloadState>()((set, get) => ({
  downloads: {},
  downloadedIds: [],

  startDownload: async (song: Song) => {
    const unsubscribe = downloadManager.onProgress(song.id, (progress) => {
      set((state) => ({
        downloads: { ...state.downloads, [song.id]: progress },
      }));

      if (progress.status === 'complete') {
        set((state) => ({
          downloadedIds: [...state.downloadedIds, song.id],
        }));
        unsubscribe();
      }
    });

    set((state) => ({
      downloads: {
        ...state.downloads,
        [song.id]: { songId: song.id, progress: 0, status: 'pending' },
      },
    }));

    try {
      await downloadManager.downloadSong(song);
    } catch {
      unsubscribe();
    }
  },

  cancelDownload: (songId: string) => {
    downloadManager.cancelDownload(songId);
    set((state) => {
      const { [songId]: _, ...rest } = state.downloads;
      return { downloads: rest };
    });
  },

  removeDownload: async (songId: string) => {
    await downloadManager.deleteDownload(songId);
    set((state) => {
      const { [songId]: _, ...rest } = state.downloads;
      return {
        downloads: rest,
        downloadedIds: state.downloadedIds.filter(id => id !== songId),
      };
    });
  },

  isDownloaded: (songId: string) => {
    return get().downloadedIds.includes(songId);
  },

  getProgress: (songId: string) => {
    return get().downloads[songId];
  },

  loadDownloadedSongs: async () => {
    try {
      const cached = await db.cachedSongs.filter(s => !!s.audioBlob).toArray();
      set({ downloadedIds: cached.map(s => s.id) });
    } catch (error) {
      console.error('[Downloads] loadDownloadedSongs failed:', error);
    }
  },

  getDownloadedSongs: async () => {
    const cached = await db.cachedSongs.filter(s => !!s.audioBlob).toArray();
    return cached.map(s => s.song);
  },
}));
