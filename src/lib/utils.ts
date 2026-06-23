import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ImageQuality, DownloadUrl } from '../types/music';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatDuration(seconds: number): string {
  if (seconds >= 3600) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  }
  return formatTime(seconds);
}

export function formatCount(count: string | number | undefined): string {
  if (!count) return '';
  const num = typeof count === 'string' ? parseInt(count, 10) : count;
  if (isNaN(num)) return '';
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

export function getImageUrl(images: ImageQuality[] | undefined, quality: 'high' | 'medium' | 'low' = 'high'): string {
  if (!images || images.length === 0) return '/placeholder-album.svg';
  const qualityMap = { high: images.length - 1, medium: Math.min(1, images.length - 1), low: 0 };
  return images[qualityMap[quality]]?.url || images[0].url;
}

export function getDownloadUrl(urls: DownloadUrl[] | undefined, preferredQuality: string = '320kbps'): string {
  if (!urls || urls.length === 0) return '';
  const found = urls.find(u => u.quality === preferredQuality);
  return found?.url || urls[urls.length - 1]?.url || '';
}

export function getArtistNames(artists: { primary: { name: string }[] } | undefined): string {
  if (!artists?.primary?.length) return 'Unknown Artist';
  return artists.primary.map(a => a.name).join(', ');
}

export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, ms: number): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
