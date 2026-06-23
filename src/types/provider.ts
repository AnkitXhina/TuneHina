import type { Song, Album, Artist, Playlist, SearchResult } from './music';
import type { LyricsResult } from './lyrics';

export interface MusicProviderInterface {
  name: string;
  search(query: string): Promise<SearchResult>;
  searchSongs(query: string, page?: number, limit?: number): Promise<Song[]>;
  searchAlbums(query: string, page?: number, limit?: number): Promise<Album[]>;
  searchArtists(query: string, page?: number, limit?: number): Promise<Artist[]>;
  searchPlaylists(query: string, page?: number, limit?: number): Promise<Playlist[]>;
  getSong(id: string): Promise<Song>;
  getSongsByIds(ids: string[]): Promise<Song[]>;
  getAlbum(id: string): Promise<Album>;
  getArtist(id: string): Promise<Artist>;
  getArtistSongs(id: string, page?: number): Promise<Song[]>;
  getArtistAlbums(id: string, page?: number): Promise<Album[]>;
  getRelatedArtists(id: string): Promise<Artist[]>;
  getPlaylist(id: string): Promise<Playlist>;
  getSuggestions(songId: string, limit?: number): Promise<Song[]>;
  getTrending(): Promise<{ songs: Song[]; albums: Album[]; playlists: Playlist[] }>;
  getTrendingSongs(): Promise<Song[]>;
  getTrendingAlbums(): Promise<Album[]>;
  getCharts(): Promise<Playlist[]>;
  getHomeFeed(): Promise<HomeFeedSection[]>;
  getRadioStations(): Promise<RadioStation[]>;
  getRadioStation(id: string): Promise<RadioStation>;
  getGenres(): Promise<GenreChannel[]>;
  getMoods(): Promise<MoodChannel[]>;
  getLyrics(songId: string): Promise<string | null>;
  getSyncedLyrics(songId: string): Promise<string | null>;
}

export interface LyricsProviderInterface {
  name: string;
  getLyrics(songName: string, artistName: string, albumName?: string, duration?: number): Promise<LyricsResult | null>;
}

export interface HomeFeedSection {
  title: string;
  type: 'song' | 'album' | 'playlist' | 'artist' | 'radio' | 'mix';
  items: (Song | Album | Playlist | Artist)[];
}

export interface RadioStation {
  id: string;
  name: string;
  type: 'radio';
  image: { quality: string; url: string }[];
  songs?: Song[];
}

export interface GenreChannel {
  id: string;
  name: string;
  image: { quality: string; url: string }[];
  url?: string;
}

export interface MoodChannel {
  id: string;
  name: string;
  image: { quality: string; url: string }[];
  url?: string;
}
