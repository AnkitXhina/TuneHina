import type {
  MusicProviderInterface,
  HomeFeedSection,
  RadioStation,
  GenreChannel,
  MoodChannel,
} from '../../types/provider';
import type { Song, Album, Artist, Playlist, SearchResult } from '../../types/music';
import { API_CONFIG } from '../../config/constants';

/* eslint-disable @typescript-eslint/no-explicit-any */
type RawData = Record<string, any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

// ──────────────────────────────────────────────
// Response normalisers
// ──────────────────────────────────────────────

function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#039;': "'",
    '&#39;': "'",
  };
  return text.replace(/&amp;|&lt;|&gt;|&quot;|&#039;|&#39;/g, (match) => entities[match] || match);
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = parseFloat(value);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

function normalizeImages(images: unknown): { quality: string; url: string }[] {
  if (!Array.isArray(images)) return [];
  return images.map((img: RawData) => ({
    quality: String(img.quality ?? img.link ?? ''),
    url: String(img.url ?? img.link ?? ''),
  }));
}

function normalizeDownloadUrls(urls: unknown): { quality: string; url: string }[] {
  if (!Array.isArray(urls)) return [];
  return urls.map((u: RawData) => ({
    quality: String(u.quality ?? ''),
    url: String(u.url ?? u.link ?? ''),
  }));
}

function normalizeArtistMinimal(raw: RawData): Artist {
  return {
    id: String(raw.id ?? ''),
    name: decodeHtmlEntities(String(raw.name ?? raw.title ?? '')),
    url: raw.url as string | undefined,
    type: 'artist',
    role: raw.role as string | undefined,
    image: normalizeImages(raw.image),
  };
}

function normalizeArtists(raw: RawData | string | undefined, subtitle?: string): {
  primary: Artist[];
  featured: Artist[];
  all: Artist[];
} {
  // If we have an object with primary/featured/all
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return {
      primary: Array.isArray(raw.primary) ? raw.primary.map(normalizeArtistMinimal) : [],
      featured: Array.isArray(raw.featured) ? raw.featured.map(normalizeArtistMinimal) : [],
      all: Array.isArray(raw.all) ? raw.all.map(normalizeArtistMinimal) : [],
    };
  }
  
  // If raw is just a string (e.g. comma separated artist names)
  if (typeof raw === 'string') {
    const names = raw.split(',').map(n => n.trim()).filter(Boolean);
    const artists = names.map(name => ({ id: name, name, type: 'artist' as const, image: [] }));
    return { primary: artists, featured: [], all: artists };
  }

  // Fallback to parsing subtitle if artists object is missing entirely
  if (subtitle) {
    const artistStr = subtitle.split('-')[0]?.trim();
    if (artistStr) {
      const names = artistStr.split(',').map(n => n.trim()).filter(Boolean);
      const artists = names.map(name => ({ id: name, name, type: 'artist' as const, image: [] }));
      return { primary: artists, featured: [], all: artists };
    }
  }

  return { primary: [], featured: [], all: [] };
}

function normalizeSong(raw: RawData): Song {
  return {
    id: String(raw.id ?? ''),
    name: decodeHtmlEntities(String(raw.name ?? raw.title ?? '')),
    type: 'song',
    year: raw.year as string | undefined,
    releaseDate: raw.releaseDate as string | undefined,
    duration: toNumber(raw.duration),
    label: raw.label as string | undefined,
    explicitContent: Boolean(raw.explicitContent),
    playCount: raw.playCount as string | undefined,
    language: raw.language as string | undefined,
    hasLyrics: Boolean(raw.hasLyrics),
    copyright: raw.copyright_text as string | undefined,
    url: raw.url as string | undefined,
    album: {
      id: String(raw.album?.id ?? ''),
      name: decodeHtmlEntities(String(raw.album?.name ?? raw.album?.title ?? '')),
      url: raw.album?.url as string | undefined,
    },
    artists: normalizeArtists(
      raw.artists ?? raw.primaryArtists, 
      typeof raw.subtitle === 'string' ? raw.subtitle : typeof raw.description === 'string' ? raw.description : undefined
    ),
    image: normalizeImages(raw.image),
    downloadUrl: normalizeDownloadUrls(raw.downloadUrl),
  };
}

function normalizeAlbum(raw: RawData): Album {
  return {
    id: String(raw.id ?? ''),
    name: decodeHtmlEntities(String(raw.name ?? raw.title ?? '')),
    description: raw.description ? decodeHtmlEntities(String(raw.description)) : undefined,
    year: raw.year as string | undefined,
    type: 'album',
    playCount: raw.playCount as string | undefined,
    language: raw.language as string | undefined,
    explicitContent: Boolean(raw.explicitContent),
    url: raw.url as string | undefined,
    songCount: raw.songCount != null ? toNumber(raw.songCount) : undefined,
    artists: normalizeArtists(
      raw.artists ?? raw.primaryArtists, 
      typeof raw.subtitle === 'string' ? raw.subtitle : undefined
    ),
    image: normalizeImages(raw.image),
    songs: Array.isArray(raw.songs) ? raw.songs.map(normalizeSong) : undefined,
  };
}

function normalizeArtistFull(raw: RawData): Artist {
  return {
    id: String(raw.id ?? ''),
    name: decodeHtmlEntities(String(raw.name ?? raw.title ?? '')),
    url: raw.url as string | undefined,
    type: 'artist',
    role: raw.role as string | undefined,
    followerCount: raw.followerCount as string | undefined,
    fanCount: raw.fanCount as string | undefined,
    isVerified: raw.isVerified as boolean | undefined,
    dominantLanguage: raw.dominantLanguage as string | undefined,
    dominantType: raw.dominantType as string | undefined,
    bio: Array.isArray(raw.bio)
      ? raw.bio.map((b: RawData) => ({ text: String(b.text ?? ''), title: String(b.title ?? '') }))
      : undefined,
    image: normalizeImages(raw.image),
    availableLanguages: Array.isArray(raw.availableLanguages) ? raw.availableLanguages.map(String) : undefined,
    topSongs: Array.isArray(raw.topSongs) ? raw.topSongs.map(normalizeSong) : undefined,
    topAlbums: Array.isArray(raw.topAlbums) ? raw.topAlbums.map(normalizeAlbum) : undefined,
  };
}

function normalizePlaylist(raw: RawData): Playlist {
  return {
    id: String(raw.id ?? ''),
    name: decodeHtmlEntities(String(raw.name ?? raw.title ?? '')),
    description: raw.description ? decodeHtmlEntities(String(raw.description)) : undefined,
    type: 'playlist',
    year: raw.year as string | undefined,
    songCount: raw.songCount != null ? toNumber(raw.songCount) : undefined,
    url: raw.url as string | undefined,
    image: normalizeImages(raw.image),
    songs: Array.isArray(raw.songs) ? raw.songs.map(normalizeSong) : undefined,
    followerCount: raw.followerCount as string | undefined,
    lastUpdated: raw.lastUpdated as string | undefined,
    userId: raw.userId as string | undefined,
  };
}

// ──────────────────────────────────────────────
// JioSaavn Provider
// ──────────────────────────────────────────────

class JioSaavnProvider implements MusicProviderInterface {
  name = 'jiosaavn' as const;
  private baseUrl = API_CONFIG.JIOSAAVN_BASE_URL;

  // ── Core fetch helper ──────────────────────

  private async fetch<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.set(key, value);
        }
      });
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`JioSaavn API error: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();

    // The API wraps responses as { status: 'SUCCESS', data: ... }
    if (json.data !== undefined) return json.data as T;
    return json as T;
  }

  // ── Search ─────────────────────────────────

  async search(query: string, page: number = 1, limit: number = 20): Promise<SearchResult> {
    try {
      const data = await this.fetch<RawData>('/api/search', { 
        query, 
        page: page.toString(), 
        limit: limit.toString() 
      });
      return {
        topQuery: data.topQuery
          ? {
              results: Array.isArray(data.topQuery.results)
                ? data.topQuery.results.map((r: RawData) => this.normalizeSearchItem(r))
                : [],
              position: toNumber(data.topQuery.position),
            }
          : undefined,
        songs: data.songs
          ? {
              results: Array.isArray(data.songs.results)
                ? data.songs.results.map(normalizeSong)
                : [],
              position: toNumber(data.songs.position),
              total: data.songs.total != null ? toNumber(data.songs.total) : undefined,
            }
          : undefined,
        albums: data.albums
          ? {
              results: Array.isArray(data.albums.results)
                ? data.albums.results.map(normalizeAlbum)
                : [],
              position: toNumber(data.albums.position),
              total: data.albums.total != null ? toNumber(data.albums.total) : undefined,
            }
          : undefined,
        artists: data.artists
          ? {
              results: Array.isArray(data.artists.results)
                ? data.artists.results.map(normalizeArtistFull)
                : [],
              position: toNumber(data.artists.position),
              total: data.artists.total != null ? toNumber(data.artists.total) : undefined,
            }
          : undefined,
        playlists: data.playlists
          ? {
              results: Array.isArray(data.playlists.results)
                ? data.playlists.results.map(normalizePlaylist)
                : [],
              position: toNumber(data.playlists.position),
              total: data.playlists.total != null ? toNumber(data.playlists.total) : undefined,
            }
          : undefined,
      };
    } catch (error) {
      console.error('[JioSaavn] search failed:', error);
      return {};
    }
  }

  async searchSongs(query: string, page = 0, limit = 20): Promise<Song[]> {
    try {
      const data = await this.fetch<RawData>('/api/search/songs', {
        query,
        page: String(page),
        limit: String(limit),
      });
      const results = data.results ?? data;
      return Array.isArray(results) ? results.map(normalizeSong) : [];
    } catch (error) {
      console.error('[JioSaavn] searchSongs failed:', error);
      return [];
    }
  }

  async searchAlbums(query: string, page = 1, limit = 20): Promise<Album[]> {
    try {
      const data = await this.fetch<RawData>('/api/search/albums', {
        query,
        page: String(page),
        limit: String(limit),
      });
      const results = data.results ?? data;
      console.log('[searchAlbums] raw response:', results);
      return Array.isArray(results) ? results.map(normalizeAlbum) : [];
    } catch (error) {
      console.error('[JioSaavn] searchAlbums failed:', error);
      return [];
    }
  }

  async searchArtists(query: string, page = 0, limit = 20): Promise<Artist[]> {
    try {
      const data = await this.fetch<RawData>('/api/search/artists', {
        query,
        page: String(page),
        limit: String(limit),
      });
      const results = data.results ?? data;
      return Array.isArray(results) ? results.map(normalizeArtistFull) : [];
    } catch (error) {
      console.error('[JioSaavn] searchArtists failed:', error);
      return [];
    }
  }

  async searchPlaylists(query: string, page = 0, limit = 20): Promise<Playlist[]> {
    try {
      const data = await this.fetch<RawData>('/api/search/playlists', {
        query,
        page: String(page),
        limit: String(limit),
      });
      const results = data.results ?? data;
      return Array.isArray(results) ? results.map(normalizePlaylist) : [];
    } catch (error) {
      console.error('[JioSaavn] searchPlaylists failed:', error);
      return [];
    }
  }

  // ── Songs ──────────────────────────────────

  async getSong(id: string): Promise<Song> {
    try {
      const data = await this.fetch<RawData | RawData[]>(`/api/songs/${encodeURIComponent(id)}`);
      const raw = Array.isArray(data) ? data[0] : data;
      if (!raw) throw new Error('Song not found');
      return normalizeSong(raw);
    } catch (error) {
      console.error('[JioSaavn] getSong failed:', error);
      throw error;
    }
  }

  async getSongsByIds(ids: string[]): Promise<Song[]> {
    if (ids.length === 0) return [];
    try {
      const data = await this.fetch<RawData[]>('/api/songs', { ids: ids.join(',') });
      return Array.isArray(data) ? data.map(normalizeSong) : [];
    } catch (error) {
      console.error('[JioSaavn] getSongsByIds failed:', error);
      return [];
    }
  }

  async getSuggestions(songId: string, limit = 10): Promise<Song[]> {
    try {
      const data = await this.fetch<RawData[]>(
        `/api/songs/${encodeURIComponent(songId)}/suggestions`,
        { limit: String(limit) },
      );
      return Array.isArray(data) ? data.map(normalizeSong) : [];
    } catch (error) {
      console.error('[JioSaavn] getSuggestions failed:', error);
      return [];
    }
  }

  // ── Albums ─────────────────────────────────

  async getAlbum(id: string): Promise<Album> {
    try {
      const data = await this.fetch<RawData>('/api/albums', { id });
      return normalizeAlbum(data);
    } catch (error) {
      console.error('[JioSaavn] getAlbum failed:', error);
      throw error;
    }
  }

  // ── Artists ────────────────────────────────

  async getArtist(id: string): Promise<Artist> {
    try {
      const data = await this.fetch<RawData>('/api/artists', { id });
      return normalizeArtistFull(data);
    } catch (error) {
      console.error('[JioSaavn] getArtist failed:', error);
      throw error;
    }
  }

  async getArtistSongs(id: string, page = 0): Promise<Song[]> {
    try {
      const data = await this.fetch<RawData>(
        `/api/artists/${encodeURIComponent(id)}/songs`,
        { page: String(page) },
      );
      const results = data.songs ?? data.results ?? data;
      return Array.isArray(results) ? results.map(normalizeSong) : [];
    } catch (error) {
      console.error('[JioSaavn] getArtistSongs failed:', error);
      return [];
    }
  }

  async getArtistAlbums(id: string, page = 0): Promise<Album[]> {
    try {
      const data = await this.fetch<RawData>(
        `/api/artists/${encodeURIComponent(id)}/albums`,
        { page: String(page) },
      );
      const results = data.albums ?? data.results ?? data;
      return Array.isArray(results) ? results.map(normalizeAlbum) : [];
    } catch (error) {
      console.error('[JioSaavn] getArtistAlbums failed:', error);
      return [];
    }
  }

  async getRelatedArtists(id: string): Promise<Artist[]> {
    try {
      const data = await this.fetch<RawData[]>(`/api/artists/${encodeURIComponent(id)}/related`);
      return Array.isArray(data) ? data.map(normalizeArtistFull) : [];
    } catch (error) {
      console.error('[JioSaavn] getRelatedArtists failed:', error);
      return [];
    }
  }

  // ── Playlists ──────────────────────────────

  async getPlaylist(id: string): Promise<Playlist> {
    try {
      const data = await this.fetch<RawData>('/api/playlists', { id });
      return normalizePlaylist(data);
    } catch (error) {
      console.error('[JioSaavn] getPlaylist failed:', error);
      throw error;
    }
  }

  // ── Discovery ──────────────────────────────

  async getTrending(): Promise<{ songs: Song[]; albums: Album[]; playlists: Playlist[] }> {
    try {
      const data = await this.fetch<RawData>('/api/trending');

      if (Array.isArray(data)) {
        // Flat array — split by type
        const songs: Song[] = [];
        const albums: Album[] = [];
        const playlists: Playlist[] = [];

        for (const item of data) {
          const type = String(item.type ?? '');
          if (type === 'song') songs.push(normalizeSong(item));
          else if (type === 'album') albums.push(normalizeAlbum(item));
          else if (type === 'playlist') playlists.push(normalizePlaylist(item));
        }

        return { songs, albums, playlists };
      }

      const songsData = Array.isArray(data.songs) ? data.songs : (data.songs?.results || []);
      const albumsData = Array.isArray(data.albums) ? data.albums : (data.albums?.results || []);
      const playlistsData = Array.isArray(data.playlists) ? data.playlists : (data.playlists?.results || []);

      return {
        songs: Array.isArray(songsData) ? songsData.map(normalizeSong) : [],
        albums: Array.isArray(albumsData) ? albumsData.map(normalizeAlbum) : [],
        playlists: Array.isArray(playlistsData) ? playlistsData.map(normalizePlaylist) : [],
      };
    } catch (error) {
      console.error('[JioSaavn] getTrending failed:', error);
      return { songs: [], albums: [], playlists: [] };
    }
  }

  async getTrendingSongs(): Promise<Song[]> {
    try {
      const data = await this.fetch<RawData>('/api/trending/songs');
      const results = Array.isArray(data) ? data : (data.results ?? data.songs ?? []);
      return Array.isArray(results) ? results.map(normalizeSong) : [];
    } catch (error) {
      console.error('[JioSaavn] getTrendingSongs failed:', error);
      return [];
    }
  }

  async getTrendingAlbums(): Promise<Album[]> {
    try {
      const data = await this.fetch<RawData>('/api/trending/albums');
      const results = Array.isArray(data) ? data : (data.results ?? data.albums ?? []);
      return Array.isArray(results) ? results.map(normalizeAlbum) : [];
    } catch (error) {
      console.error('[JioSaavn] getTrendingAlbums failed:', error);
      return [];
    }
  }

  async getCharts(): Promise<Playlist[]> {
    try {
      const data = await this.fetch<RawData[] | RawData>('/api/charts');
      const list = Array.isArray(data) ? data : (data.results ?? []);
      return Array.isArray(list) ? list.map(normalizePlaylist) : [];
    } catch (error) {
      console.error('[JioSaavn] getCharts failed:', error);
      return [];
    }
  }

  async getHomeFeed(): Promise<HomeFeedSection[]> {
    try {
      const data = await this.fetch<RawData>('/api/home');
      return this.normalizeHomeFeed(data);
    } catch (error) {
      console.error('[JioSaavn] getHomeFeed failed:', error);
      return [];
    }
  }

  // ── Radio ──────────────────────────────────

  async getRadioStations(): Promise<RadioStation[]> {
    try {
      const data = await this.fetch<RawData[] | RawData>('/api/radio');
      const list = Array.isArray(data) ? data : (data.results ?? data.stations ?? []);
      return Array.isArray(list) ? list.map(this.normalizeRadioStation) : [];
    } catch (error) {
      console.error('[JioSaavn] getRadioStations failed:', error);
      return [];
    }
  }

  async getRadioStation(id: string): Promise<RadioStation> {
    try {
      const data = await this.fetch<RawData>(`/api/radio/${encodeURIComponent(id)}`);
      return this.normalizeRadioStation(data);
    } catch (error) {
      console.error('[JioSaavn] getRadioStation failed:', error);
      throw error;
    }
  }

  // ── Genres & Moods ─────────────────────────

  async getGenres(): Promise<GenreChannel[]> {
    try {
      const data = await this.fetch<RawData[] | RawData>('/api/genres');
      const list = Array.isArray(data) ? data : (data.results ?? data.genres ?? []);
      return Array.isArray(list)
        ? list.map(
            (g: RawData): GenreChannel => ({
              id: String(g.id ?? ''),
              name: String(g.name ?? g.title ?? ''),
              image: normalizeImages(g.image),
              url: g.url as string | undefined,
            }),
          )
        : [];
    } catch (error) {
      console.error('[JioSaavn] getGenres failed:', error);
      return [];
    }
  }

  async getMoods(): Promise<MoodChannel[]> {
    try {
      const data = await this.fetch<RawData[] | RawData>('/api/moods');
      const list = Array.isArray(data) ? data : (data.results ?? data.moods ?? []);
      return Array.isArray(list)
        ? list.map(
            (m: RawData): MoodChannel => ({
              id: String(m.id ?? ''),
              name: String(m.name ?? m.title ?? ''),
              image: normalizeImages(m.image),
              url: m.url as string | undefined,
            }),
          )
        : [];
    } catch (error) {
      console.error('[JioSaavn] getMoods failed:', error);
      return [];
    }
  }

  // ── Lyrics ─────────────────────────────────

  async getLyrics(songId: string): Promise<string | null> {
    try {
      const data = await this.fetch<RawData>(`/api/lyrics/${encodeURIComponent(songId)}`);
      const lyrics = data.lyrics ?? data.text ?? data;
      return typeof lyrics === 'string' ? lyrics : null;
    } catch {
      return null;
    }
  }

  async getSyncedLyrics(songId: string): Promise<string | null> {
    try {
      const data = await this.fetch<RawData>(`/api/lyrics/${encodeURIComponent(songId)}/sync`);
      const lyrics = data.lyrics ?? data.syncedLyrics ?? data;
      return typeof lyrics === 'string' ? lyrics : null;
    } catch {
      return null;
    }
  }

  // ── Private helpers ────────────────────────

  private normalizeSearchItem(raw: RawData): Song | Album | Artist | Playlist {
    const type = String(raw.type ?? 'song');
    switch (type) {
      case 'album':
        return normalizeAlbum(raw);
      case 'artist':
        return normalizeArtistFull(raw);
      case 'playlist':
        return normalizePlaylist(raw);
      default:
        return normalizeSong(raw);
    }
  }

  private normalizeRadioStation(raw: RawData): RadioStation {
    return {
      id: String(raw.id ?? raw.stationId ?? ''),
      name: String(raw.name ?? raw.title ?? ''),
      type: 'radio',
      image: normalizeImages(raw.image),
      songs: Array.isArray(raw.songs) ? raw.songs.map(normalizeSong) : undefined,
    };
  }

  private normalizeHomeFeed(data: RawData): HomeFeedSection[] {
    // The home API can return different shapes — handle both
    // Shape 1: { modules: { ... }, data: { ... } }
    // Shape 2: Array of sections
    // Shape 3: Object with named keys (trending, charts, albums, etc.)

    const sections: HomeFeedSection[] = [];

    if (Array.isArray(data)) {
      for (const section of data) {
        const normalized = this.normalizeHomeFeedSection(section);
        if (normalized) sections.push(normalized);
      }
      return sections;
    }

    // Handle object with modules + data pattern
    const modules = data.modules ?? data;
    const sectionData = data.data ?? data;

    // Iterate over known sections
    const sectionKeys = Object.keys(modules);

    for (const key of sectionKeys) {
      const moduleInfo = modules[key];
      if (!moduleInfo || typeof moduleInfo !== 'object') continue;

      const title = String(moduleInfo.title ?? key);
      const items = sectionData[key];

      if (!items) continue;

      const itemList = Array.isArray(items) ? items : (items.results ?? items.data ?? []);
      if (!Array.isArray(itemList) || itemList.length === 0) continue;

      const type = this.inferSectionType(itemList);
      const normalizedItems = itemList.map((item: RawData) => this.normalizeSearchItem(item));

      sections.push({
        title,
        type,
        items: normalizedItems,
      });
    }

    return sections;
  }

  private normalizeHomeFeedSection(section: RawData): HomeFeedSection | null {
    const title = String(section.title ?? section.name ?? '');
    const items = section.items ?? section.data ?? section.results ?? [];

    if (!Array.isArray(items) || items.length === 0) return null;

    const type = this.inferSectionType(items);
    const normalizedItems = items.map((item: RawData) => this.normalizeSearchItem(item));

    return { title, type, items: normalizedItems };
  }

  private inferSectionType(items: RawData[]): HomeFeedSection['type'] {
    if (items.length === 0) return 'song';
    const firstType = String(items[0].type ?? '');
    switch (firstType) {
      case 'album':
        return 'album';
      case 'playlist':
        return 'playlist';
      case 'artist':
        return 'artist';
      case 'radio':
      case 'radio_station':
        return 'radio';
      case 'mix':
        return 'mix';
      default:
        return 'song';
    }
  }
}

export const jiosaavnProvider = new JioSaavnProvider();
