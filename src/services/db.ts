import Dexie, { type Table } from 'dexie';
import type { Song, Album } from '../types/music';

export interface LikedSong {
  id: string;
  song: Song;
  likedAt: number;
}

export interface LikedAlbum {
  id: string;
  album: Album;
  likedAt: number;
}

export interface UserPlaylist {
  id: string;
  name: string;
  description?: string;
  songIds: string[];
  songs?: Song[]; // Hydrated for UI displays
  createdAt: number;
  updatedAt: number;
  coverImage?: string;
}

export interface RecentlyPlayed {
  id: string;
  song: Song;
  playedAt: number;
}

export interface CachedSong {
  id: string;
  song: Song;
  audioBlob?: Blob;
  cachedAt: number;
}

export interface SearchHistoryEntry {
  id?: number;
  query: string;
  timestamp: number;
}

export interface QueueEntry {
  id?: number;
  songId: string;
  song: Song;
  position: number;
}

class TuneHinaDB extends Dexie {
  likedSongs!: Table<LikedSong, string>;
  likedAlbums!: Table<LikedAlbum, string>;
  playlists!: Table<UserPlaylist, string>;
  recentlyPlayed!: Table<RecentlyPlayed, string>;
  cachedSongs!: Table<CachedSong, string>;
  searchHistory!: Table<SearchHistoryEntry, number>;
  queue!: Table<QueueEntry, number>;

  constructor() {
    super('TuneHinaDB');
    this.version(1).stores({
      likedSongs: 'id, likedAt',
      playlists: 'id, name, updatedAt',
      recentlyPlayed: 'id, playedAt',
      cachedSongs: 'id, cachedAt',
      searchHistory: '++id, query, timestamp',
      queue: '++id, songId, position',
    });
    this.version(2).stores({
      likedAlbums: 'id, likedAt',
    });
  }
}

export const db = new TuneHinaDB();
