import { create } from 'zustand';
import type { Song } from '../types/music';
import type { UserPlaylist } from '../services/db';
import { db } from '../services/db';
import { generateId } from '../lib/utils';
import { CACHE_CONFIG } from '../config/constants';

interface LibraryState {
  likedSongIds: string[];
  recentlyPlayedIds: string[];
  isInitialized: boolean;

  toggleLike: (song: Song) => Promise<void>;
  isLiked: (songId: string) => boolean;
  addToRecentlyPlayed: (song: Song) => Promise<void>;
  getLikedSongs: () => Promise<Song[]>;
  getRecentlyPlayed: () => Promise<Song[]>;
  createPlaylist: (name: string, description?: string) => Promise<string>;
  deletePlaylist: (id: string) => Promise<void>;
  renamePlaylist: (id: string, name: string) => Promise<void>;
  addToPlaylist: (playlistId: string, song: Song) => Promise<void>;
  removeFromPlaylist: (playlistId: string, songId: string) => Promise<void>;
  getPlaylists: () => Promise<UserPlaylist[]>;
  getPlaylist: (id: string) => Promise<UserPlaylist | undefined>;
  initFromDB: () => Promise<void>;
}

export const useLibraryStore = create<LibraryState>()((set, get) => ({
  likedSongIds: [],
  recentlyPlayedIds: [],
  isInitialized: false,

  initFromDB: async () => {
    try {
      const liked = await db.likedSongs.toArray();
      const recent = await db.recentlyPlayed.orderBy('playedAt').reverse().limit(CACHE_CONFIG.RECENTLY_PLAYED_MAX).toArray();
      set({
        likedSongIds: liked.map(l => l.id),
        recentlyPlayedIds: recent.map(r => r.id),
        isInitialized: true,
      });
    } catch (error) {
      console.error('[Library] initFromDB failed:', error);
      set({ isInitialized: true });
    }
  },

  toggleLike: async (song: Song) => {
    const { likedSongIds } = get();
    const isCurrentlyLiked = likedSongIds.includes(song.id);

    if (isCurrentlyLiked) {
      await db.likedSongs.delete(song.id);
      set({ likedSongIds: likedSongIds.filter(id => id !== song.id) });
    } else {
      await db.likedSongs.put({ id: song.id, song, likedAt: Date.now() });
      set({ likedSongIds: [...likedSongIds, song.id] });
    }
  },

  isLiked: (songId: string) => {
    return get().likedSongIds.includes(songId);
  },

  addToRecentlyPlayed: async (song: Song) => {
    try {
      await db.recentlyPlayed.put({ id: song.id, song, playedAt: Date.now() });
      const { recentlyPlayedIds } = get();
      const filtered = recentlyPlayedIds.filter(id => id !== song.id);
      const updated = [song.id, ...filtered].slice(0, CACHE_CONFIG.RECENTLY_PLAYED_MAX);
      set({ recentlyPlayedIds: updated });

      // Trim old entries
      const count = await db.recentlyPlayed.count();
      if (count > CACHE_CONFIG.RECENTLY_PLAYED_MAX) {
        const oldest = await db.recentlyPlayed.orderBy('playedAt').limit(count - CACHE_CONFIG.RECENTLY_PLAYED_MAX).toArray();
        await db.recentlyPlayed.bulkDelete(oldest.map(o => o.id));
      }
    } catch (error) {
      console.error('[Library] addToRecentlyPlayed failed:', error);
    }
  },

  getLikedSongs: async () => {
    const liked = await db.likedSongs.orderBy('likedAt').reverse().toArray();
    return liked.map(l => l.song);
  },

  getRecentlyPlayed: async () => {
    const recent = await db.recentlyPlayed.orderBy('playedAt').reverse().limit(CACHE_CONFIG.RECENTLY_PLAYED_MAX).toArray();
    return recent.map(r => r.song);
  },

  createPlaylist: async (name: string, description?: string) => {
    const id = generateId();
    const playlist: UserPlaylist = {
      id,
      name,
      description,
      songIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.playlists.add(playlist);
    return id;
  },

  deletePlaylist: async (id: string) => {
    await db.playlists.delete(id);
  },

  renamePlaylist: async (id: string, name: string) => {
    await db.playlists.update(id, { name, updatedAt: Date.now() });
  },

  addToPlaylist: async (playlistId: string, song: Song) => {
    const playlist = await db.playlists.get(playlistId);
    if (!playlist) return;
    if (playlist.songIds.includes(song.id)) return;

    // Also cache the song metadata
    await db.cachedSongs.put({ id: song.id, song, cachedAt: Date.now() });

    await db.playlists.update(playlistId, {
      songIds: [...playlist.songIds, song.id],
      updatedAt: Date.now(),
    });
  },

  removeFromPlaylist: async (playlistId: string, songId: string) => {
    const playlist = await db.playlists.get(playlistId);
    if (!playlist) return;
    await db.playlists.update(playlistId, {
      songIds: playlist.songIds.filter(id => id !== songId),
      updatedAt: Date.now(),
    });
  },

  getPlaylists: async () => {
    return db.playlists.orderBy('updatedAt').reverse().toArray();
  },

  getPlaylist: async (id: string) => {
    return db.playlists.get(id);
  },
}));
