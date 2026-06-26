import { create } from 'zustand';
import type { Song, Album } from '../types/music';
import type { UserPlaylist } from '../services/db';
import { db } from '../services/db';
import { generateId } from '../lib/utils';
import { CACHE_CONFIG } from '../config/constants';

interface LibraryState {
  likedSongIds: string[];
  likedAlbums: Album[];
  recentlyPlayedIds: string[];
  isInitialized: boolean;

  toggleLike: (song: Song) => Promise<void>;
  toggleLikeAlbum: (album: Album) => Promise<void>;
  isLiked: (songId: string) => boolean;
  isAlbumLiked: (albumId: string) => boolean;
  addToRecentlyPlayed: (song: Song) => Promise<void>;
  getLikedSongs: () => Promise<Song[]>;
  getLikedAlbums: () => Album[];
  getRecentlyPlayed: () => Promise<Song[]>;
  createPlaylist: (name: string, description?: string) => Promise<string>;
  deletePlaylist: (id: string) => Promise<void>;
  renamePlaylist: (id: string, name: string) => Promise<void>;
  addToPlaylist: (playlistId: string, song: Song) => Promise<void>;
  removeFromPlaylist: (playlistId: string, songId: string) => Promise<void>;
  setPlaylistArtwork: (playlistId: string, artwork: string) => Promise<void>;
  getPlaylists: () => Promise<UserPlaylist[]>;
  getPlaylist: (id: string) => Promise<UserPlaylist | undefined>;
  initFromDB: () => Promise<void>;
  clearRecentlyPlayed: () => Promise<void>;
}

export const useLibraryStore = create<LibraryState>()((set, get) => ({
  likedSongIds: [],
  likedAlbums: [],
  recentlyPlayedIds: [],
  isInitialized: false,

  initFromDB: async () => {
    try {
      const liked = await db.likedSongs.toArray();
      const likedAlbs = await db.likedAlbums.toArray();
      const recent = await db.recentlyPlayed.orderBy('playedAt').reverse().limit(CACHE_CONFIG.RECENTLY_PLAYED_MAX).toArray();
      set({
        likedSongIds: liked.map(l => l.id),
        likedAlbums: likedAlbs.map(l => l.album).reverse(),
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
    
    // 1. Update UI INSTANTLY (optimistic update)
    set({ 
      likedSongIds: isCurrentlyLiked 
        ? likedSongIds.filter(id => id !== song.id)
        : [...likedSongIds, song.id]
    });

    // 2. Then save to database in background
    try {
      if (isCurrentlyLiked) {
        await db.likedSongs.delete(song.id);
      } else {
        await db.likedSongs.put({ id: song.id, song, likedAt: Date.now() });
      }
    } catch (err) {
      // If DB fails, revert the optimistic update
      console.error('[Library] toggleLike failed:', err);
      set({ likedSongIds });
    }
  },

  toggleLikeAlbum: async (album: Album) => {
    const { likedAlbums } = get();
    const isCurrentlyLiked = likedAlbums.some(a => a.id === album.id);
    
    set({
      likedAlbums: isCurrentlyLiked
        ? likedAlbums.filter(a => a.id !== album.id)
        : [album, ...likedAlbums]
    });

    try {
      if (isCurrentlyLiked) {
        await db.likedAlbums.delete(album.id);
      } else {
        await db.likedAlbums.put({ id: album.id, album, likedAt: Date.now() });
      }
    } catch (err) {
      console.error('[Library] toggleLikeAlbum failed:', err);
      set({ likedAlbums });
    }
  },

  isAlbumLiked: (albumId: string) => {
    return get().likedAlbums.some(a => a.id === albumId);
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

  getLikedAlbums: () => {
    return get().likedAlbums;
  },

  getRecentlyPlayed: async () => {
    const recent = await db.recentlyPlayed.orderBy('playedAt').reverse().limit(CACHE_CONFIG.RECENTLY_PLAYED_MAX).toArray();
    return recent.map(r => r.song);
  },

  clearRecentlyPlayed: async () => {
    try {
      await db.recentlyPlayed.clear();
      set({ recentlyPlayedIds: [] });
    } catch (error) {
      console.error('[Library] clearRecentlyPlayed failed:', error);
    }
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

  setPlaylistArtwork: async (playlistId: string, artwork: string) => {
    await db.playlists.update(playlistId, {
      coverImage: artwork,
      updatedAt: Date.now(),
    });
  },

  getPlaylists: async () => {
    const playlists = await db.playlists.orderBy('updatedAt').reverse().toArray();
    for (const pl of playlists) {
      if (pl.songIds.length > 0) {
        const top4Ids = pl.songIds.slice(0, 4);
        const cachedSongs = await Promise.all(top4Ids.map(id => db.cachedSongs.get(id)));
        pl.songs = cachedSongs.filter(c => c !== undefined).map(c => c!.song);
      } else {
        pl.songs = [];
      }
    }
    return playlists;
  },

  getPlaylist: async (id: string) => {
    return db.playlists.get(id);
  },
}));
