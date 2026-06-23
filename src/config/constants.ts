export const API_CONFIG = {
  JIOSAAVN_BASE_URL: 'https://shnwazdev-jiosaavn-apii.vercel.app',
  LRCLIB_BASE_URL: 'https://lrclib.net',
  BOIDU_BASE_URL: 'https://lyrics-api.boidu.dev',
  BETTER_LYRICS_BASE_URL: 'https://lyrics-api.boidu.dev',
} as const;

export const AUDIO_QUALITY_OPTIONS = [
  { value: '320kbps', label: 'Very High (320kbps)', description: 'Best quality' },
  { value: '160kbps', label: 'High (160kbps)', description: 'Recommended' },
  { value: '96kbps', label: 'Medium (96kbps)', description: 'Data saver' },
  { value: '48kbps', label: 'Low (48kbps)', description: 'Minimum quality' },
] as const;

export const DEFAULT_AUDIO_QUALITY = '320kbps';

export const CACHE_CONFIG = {
  SEARCH_TTL: 5 * 60 * 1000, // 5 minutes
  TRENDING_TTL: 30 * 60 * 1000, // 30 minutes
  SONG_TTL: 24 * 60 * 60 * 1000, // 24 hours
  LYRICS_TTL: 7 * 24 * 60 * 60 * 1000, // 7 days
  IMAGE_TTL: 30 * 24 * 60 * 60 * 1000, // 30 days
  RECENTLY_PLAYED_MAX: 100,
  SEARCH_HISTORY_MAX: 20,
} as const;

export const PLAYER_CONFIG = {
  CROSSFADE_DURATION: 500,
  SEEK_STEP: 10,
  VOLUME_STEP: 0.05,
  DEFAULT_VOLUME: 0.8,
  MIN_QUEUE_SIZE: 20,
  AUTO_RECOMMENDATIONS_COUNT: 15,
} as const;

export const IMAGE_QUALITY = {
  THUMBNAIL: '50x50',
  SMALL: '150x150',
  MEDIUM: '500x500',
} as const;

export const LRCLIB_USER_AGENT = 'TuneHina/1.0.0 (https://tunehina.pages.dev)';
