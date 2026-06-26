export interface Song {
  id: string;
  name: string;
  type: 'song';
  year?: string;
  releaseDate?: string;
  duration: number; // seconds
  label?: string;
  explicitContent: boolean;
  playCount?: string;
  language?: string;
  hasLyrics: boolean;
  copyright?: string;
  url?: string;
  album: {
    id: string;
    name: string;
    url?: string;
  };
  artists: {
    primary: Artist[];
    featured: Artist[];
    all: Artist[];
  };
  image: ImageQuality[];
  downloadUrl: DownloadUrl[];
}

export interface Album {
  id: string;
  name: string;
  description?: string;
  year?: string;
  type: 'album';
  playCount?: string;
  language?: string;
  explicitContent: boolean;
  url?: string;
  songCount?: number;
  artists: { primary: Artist[]; featured: Artist[]; all: Artist[] };
  image: ImageQuality[];
  songs?: Song[];
}

export interface Artist {
  id: string;
  name: string;
  url?: string;
  type: 'artist';
  role?: string;
  followerCount?: string;
  fanCount?: string;
  isVerified?: boolean;
  dominantLanguage?: string;
  dominantType?: string;
  bio?: Array<{ text: string; title: string }>;
  image: ImageQuality[];
  availableLanguages?: string[];
  topSongs?: Song[];
  topAlbums?: Album[];
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  type: 'playlist';
  year?: string;
  songCount?: number;
  url?: string;
  image: ImageQuality[];
  songs?: Song[];
  followerCount?: string;
  lastUpdated?: string;
  userId?: string;
  isUserPlaylist?: boolean;
}

export interface ImageQuality {
  quality: string;
  url: string;
}

export interface DownloadUrl {
  quality: string;
  url: string;
}

export interface SearchResult {
  topQuery?: { results: (Song | Album | Artist | Playlist)[]; position: number };
  songs?: { results: Song[]; position: number; total?: number };
  albums?: { results: Album[]; position: number; total?: number };
  artists?: { results: Artist[]; position: number; total?: number };
  playlists?: { results: Playlist[]; position: number; total?: number };
}

export interface ApiResponse<T> {
  status: string;
  message: string | null;
  data: T;
}

export type RepeatMode = 'off' | 'one' | 'all';
export type AudioQuality = '12kbps' | '48kbps' | '96kbps' | '160kbps' | '320kbps';
