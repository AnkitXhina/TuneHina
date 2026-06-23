import { db, type CachedSong } from './db';
import type { Song } from '../types/music';
import { getDownloadUrl } from '../lib/utils';

export interface DownloadProgress {
  songId: string;
  progress: number; // 0-100
  status: 'pending' | 'downloading' | 'complete' | 'error';
  error?: string;
}

type ProgressCallback = (progress: DownloadProgress) => void;

class DownloadManager {
  private activeDownloads: Map<string, AbortController> = new Map();
  private progressCallbacks: Map<string, Set<ProgressCallback>> = new Map();

  // ── Download ────────────────────────────────────────────────

  async downloadSong(song: Song): Promise<void> {
    const songId = song.id;

    // Skip if already downloaded
    if (await this.isDownloaded(songId)) {
      this.notifyProgress(songId, { songId, progress: 100, status: 'complete' });
      return;
    }

    // Skip if already downloading
    if (this.activeDownloads.has(songId)) return;

    const controller = new AbortController();
    this.activeDownloads.set(songId, controller);

    this.notifyProgress(songId, { songId, progress: 0, status: 'pending' });

    try {
      const url = getDownloadUrl(song.downloadUrl, '320kbps');
      if (!url) {
        throw new Error('No download URL available');
      }

      this.notifyProgress(songId, { songId, progress: 0, status: 'downloading' });

      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        throw new Error(`Download failed: HTTP ${response.status}`);
      }

      const blob = await this.readResponseWithProgress(response, songId, controller.signal);

      // Store in IndexedDB
      await db.cachedSongs.put({
        id: songId,
        song,
        audioBlob: blob,
        cachedAt: Date.now(),
      });

      this.notifyProgress(songId, { songId, progress: 100, status: 'complete' });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // Download was cancelled – no error notification
        this.notifyProgress(songId, { songId, progress: 0, status: 'pending' });
      } else {
        const message = err instanceof Error ? err.message : 'Download failed';
        this.notifyProgress(songId, { songId, progress: 0, status: 'error', error: message });
      }
    } finally {
      this.activeDownloads.delete(songId);
    }
  }

  // ── Cancel ──────────────────────────────────────────────────

  cancelDownload(songId: string): void {
    const controller = this.activeDownloads.get(songId);
    if (controller) {
      controller.abort();
      this.activeDownloads.delete(songId);
    }
  }

  cancelAll(): void {
    this.activeDownloads.forEach((controller) => controller.abort());
    this.activeDownloads.clear();
  }

  // ── Queries ─────────────────────────────────────────────────

  async isDownloaded(songId: string): Promise<boolean> {
    const entry = await db.cachedSongs.get(songId);
    return !!entry?.audioBlob;
  }

  async getDownloadedSong(songId: string): Promise<CachedSong | undefined> {
    return db.cachedSongs.get(songId);
  }

  async getAllDownloaded(): Promise<CachedSong[]> {
    return db.cachedSongs.toArray();
  }

  // ── Delete ──────────────────────────────────────────────────

  async deleteDownload(songId: string): Promise<void> {
    this.cancelDownload(songId);
    await db.cachedSongs.delete(songId);
  }

  async deleteAll(): Promise<void> {
    this.cancelAll();
    await db.cachedSongs.clear();
  }

  // ── Storage Usage ───────────────────────────────────────────

  async getStorageUsage(): Promise<{ used: number; songs: number }> {
    const allCached = await db.cachedSongs.toArray();
    let totalBytes = 0;

    for (const entry of allCached) {
      if (entry.audioBlob) {
        totalBytes += entry.audioBlob.size;
      }
    }

    return { used: totalBytes, songs: allCached.length };
  }

  // ── Progress Subscription ──────────────────────────────────

  onProgress(songId: string, callback: ProgressCallback): () => void {
    if (!this.progressCallbacks.has(songId)) {
      this.progressCallbacks.set(songId, new Set());
    }
    this.progressCallbacks.get(songId)!.add(callback);

    return () => {
      const set = this.progressCallbacks.get(songId);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.progressCallbacks.delete(songId);
        }
      }
    };
  }

  // ── Active Download Status ──────────────────────────────────

  isDownloading(songId: string): boolean {
    return this.activeDownloads.has(songId);
  }

  get activeCount(): number {
    return this.activeDownloads.size;
  }

  // ── Internals ───────────────────────────────────────────────

  private notifyProgress(songId: string, progress: DownloadProgress): void {
    const set = this.progressCallbacks.get(songId);
    if (set) {
      set.forEach((cb) => {
        try {
          cb(progress);
        } catch (err) {
          console.error('[DownloadManager] Error in progress callback:', err);
        }
      });
    }
  }

  private async readResponseWithProgress(
    response: Response,
    songId: string,
    signal: AbortSignal
  ): Promise<Blob> {
    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    // If no content-length or no body stream, fall back to simple blob read
    if (!total || !response.body) {
      const blob = await response.blob();
      this.notifyProgress(songId, { songId, progress: 90, status: 'downloading' });
      return blob;
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;

    try {
      while (true) {
        if (signal.aborted) {
          reader.cancel();
          throw new DOMException('Download aborted', 'AbortError');
        }

        const { done, value } = await reader.read();

        if (done) break;

        if (value) {
          chunks.push(value);
          received += value.length;

          const progress = Math.min(Math.round((received / total) * 100), 99);
          this.notifyProgress(songId, { songId, progress, status: 'downloading' });
        }
      }
    } catch (err) {
      reader.cancel();
      throw err;
    }

    // Combine chunks into a single blob
    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    return new Blob(chunks as BlobPart[], { type: contentType });
  }
}

export const downloadManager = new DownloadManager();
