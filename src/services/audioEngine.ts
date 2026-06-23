export type AudioEventType =
  | 'play'
  | 'pause'
  | 'timeupdate'
  | 'ended'
  | 'error'
  | 'loading'
  | 'canplay'
  | 'volumechange'
  | 'durationchange'
  | 'seeked';

export interface AudioEventData {
  play: undefined;
  pause: undefined;
  timeupdate: { currentTime: number; duration: number };
  ended: undefined;
  error: { message: string; code?: number };
  loading: { isLoading: boolean };
  canplay: undefined;
  volumechange: { volume: number; muted: boolean };
  durationchange: { duration: number };
  seeked: { currentTime: number };
}

type AudioEventCallback<T extends AudioEventType> = (data: AudioEventData[T]) => void;

class AudioEngine {
  private audio: HTMLAudioElement;
  private listeners: Map<AudioEventType, Set<AudioEventCallback<AudioEventType>>>;
  private _isLoading: boolean = false;
  private _isSeeking: boolean = false;
  private boundHandlers: Map<string, EventListener> = new Map();

  constructor() {
    this.audio = new Audio();
    this.listeners = new Map();
    this.audio.preload = 'auto';
    this.audio.crossOrigin = 'anonymous';
    this.setupEventListeners();
  }

  // ── Properties ──────────────────────────────────────────────

  get currentTime(): number {
    return this.audio.currentTime;
  }

  get duration(): number {
    return isNaN(this.audio.duration) ? 0 : this.audio.duration;
  }

  get volume(): number {
    return this.audio.volume;
  }

  get muted(): boolean {
    return this.audio.muted;
  }

  get playbackRate(): number {
    return this.audio.playbackRate;
  }

  get paused(): boolean {
    return this.audio.paused;
  }

  get src(): string {
    return this.audio.src;
  }

  get isLoading(): boolean {
    return this._isLoading;
  }

  get isSeeking(): boolean {
    return this._isSeeking;
  }

  get buffered(): TimeRanges {
    return this.audio.buffered;
  }

  get bufferedPercent(): number {
    if (this.duration === 0) return 0;
    const { buffered } = this.audio;
    if (buffered.length === 0) return 0;
    return (buffered.end(buffered.length - 1) / this.duration) * 100;
  }

  // ── Methods ─────────────────────────────────────────────────

  async play(): Promise<void> {
    try {
      await this.audio.play();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Playback failed');
      // AbortError is benign – happens when play() is interrupted by a new load
      if (error.name !== 'AbortError') {
        this.emit('error', { message: error.message });
      }
    }
  }

  pause(): void {
    this.audio.pause();
  }

  seek(time: number): void {
    const clamped = Math.max(0, Math.min(time, this.duration));
    this._isSeeking = true;
    this.audio.currentTime = clamped;
  }

  setVolume(vol: number): void {
    this.audio.volume = Math.max(0, Math.min(1, vol));
  }

  setMuted(muted: boolean): void {
    this.audio.muted = muted;
  }

  setPlaybackRate(rate: number): void {
    this.audio.playbackRate = Math.max(0.25, Math.min(4, rate));
  }

  load(url: string): void {
    if (this.audio.src === url) return;
    this._isLoading = true;
    this.emit('loading', { isLoading: true });
    this.audio.src = url;
    this.audio.load();
  }

  loadBlob(blob: Blob): void {
    const url = URL.createObjectURL(blob);
    this._isLoading = true;
    this.emit('loading', { isLoading: true });

    // Revoke the previous object URL if it was a blob URL
    if (this.audio.src.startsWith('blob:')) {
      URL.revokeObjectURL(this.audio.src);
    }

    this.audio.src = url;
    this.audio.load();
  }

  stop(): void {
    this.audio.pause();
    this.audio.currentTime = 0;

    if (this.audio.src.startsWith('blob:')) {
      URL.revokeObjectURL(this.audio.src);
    }
    this.audio.removeAttribute('src');
    this.audio.load(); // Reset the element
  }

  destroy(): void {
    this.stop();
    this.teardownEventListeners();
    this.listeners.clear();
  }

  // ── Event System ────────────────────────────────────────────

  on<T extends AudioEventType>(event: T, callback: AudioEventCallback<T>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as AudioEventCallback<AudioEventType>);
  }

  off<T extends AudioEventType>(event: T, callback: AudioEventCallback<T>): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(callback as AudioEventCallback<AudioEventType>);
    }
  }

  once<T extends AudioEventType>(event: T, callback: AudioEventCallback<T>): void {
    const wrapper: AudioEventCallback<T> = (data) => {
      this.off(event, wrapper);
      callback(data);
    };
    this.on(event, wrapper);
  }

  private emit<T extends AudioEventType>(event: T, data: AudioEventData[T]): void {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach((cb) => {
        try {
          (cb as AudioEventCallback<T>)(data);
        } catch (err) {
          console.error(`[AudioEngine] Error in ${event} listener:`, err);
        }
      });
    }
  }

  // ── Native Event Wiring ─────────────────────────────────────

  private setupEventListeners(): void {
    const bind = (eventName: string, handler: EventListener) => {
      this.boundHandlers.set(eventName, handler);
      this.audio.addEventListener(eventName, handler);
    };

    bind('play', () => {
      this.emit('play', undefined);
    });

    bind('pause', () => {
      this.emit('pause', undefined);
    });

    bind('timeupdate', () => {
      this.emit('timeupdate', {
        currentTime: this.audio.currentTime,
        duration: this.duration,
      });
    });

    bind('ended', () => {
      this.emit('ended', undefined);
    });

    bind('error', () => {
      const { error } = this.audio;
      this._isLoading = false;
      this.emit('loading', { isLoading: false });
      this.emit('error', {
        message: error?.message || 'Unknown playback error',
        code: error?.code,
      });
    });

    bind('waiting', () => {
      this._isLoading = true;
      this.emit('loading', { isLoading: true });
    });

    bind('canplay', () => {
      this._isLoading = false;
      this.emit('loading', { isLoading: false });
      this.emit('canplay', undefined);
    });

    bind('volumechange', () => {
      this.emit('volumechange', {
        volume: this.audio.volume,
        muted: this.audio.muted,
      });
    });

    bind('durationchange', () => {
      this.emit('durationchange', { duration: this.duration });
    });

    bind('seeked', () => {
      this._isSeeking = false;
      this.emit('seeked', { currentTime: this.audio.currentTime });
    });
  }

  private teardownEventListeners(): void {
    this.boundHandlers.forEach((handler, eventName) => {
      this.audio.removeEventListener(eventName, handler);
    });
    this.boundHandlers.clear();
  }
}

export const audioEngine = new AudioEngine();
