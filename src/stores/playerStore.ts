import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Song } from '../types/music';
import { audioEngine } from '../services/audioEngine';
import { getDownloadUrl } from '../lib/utils';
import { useQueueStore } from './queueStore';

interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  audioQuality: string;
  normalizeVolume: boolean;
  crossfade: boolean;
  isLoading: boolean;
  error: string | null;

  playSong: (song: Song) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  setAudioQuality: (quality: string) => void;
  setNormalizeVolume: (normalize: boolean) => void;
  setCrossfade: (crossfade: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  initAudioListeners: () => () => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      currentSong: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 0.8,
      playbackRate: 1,
      audioQuality: '320kbps',
      normalizeVolume: true,
      crossfade: false,
      isLoading: false,
      error: null,

      playSong: async (song: Song) => {
        set({
          isLoading: true,
          error: null,
        });

        let fullSong = song;

        // If the song is missing download URLs (common in global search results), fetch full details
        if (!fullSong.downloadUrl || fullSong.downloadUrl.length === 0) {
          try {
            const { getMusicProvider } = await import('../providers/music');
            const provider = getMusicProvider();
            fullSong = await provider.getSong(song.id);
          } catch (err) {
            console.error('[Player] Failed to fetch full song details:', err);
            set({ error: 'Failed to retrieve audio stream', isLoading: false });
            return;
          }
        }

        const url = getDownloadUrl(fullSong.downloadUrl, get().audioQuality);
        if (!url) {
          set({ error: 'No audio URL available for this song', isLoading: false });
          return;
        }

        // Preserve currentTime if we are just resuming the exact same song after a refresh
        const isSameSong = get().currentSong?.id === fullSong.id;
        const startAt = isSameSong ? get().currentTime : 0;

        set({
          currentSong: fullSong,
          currentTime: startAt,
          duration: fullSong.duration || 0,
        });

        audioEngine.load(url);
        if (startAt > 0) {
          audioEngine.seek(startAt);
        }
        audioEngine.setVolume(get().volume);
        audioEngine.setPlaybackRate(get().playbackRate);
        audioEngine.play().catch((err) => {
          console.error('[Player] Play failed:', err);
          set({ error: 'Failed to play song', isLoading: false });
        });
      },

      play: () => {
        const { currentSong } = get();
        // If we have a persisted song but audio engine is empty (e.g., after refresh)
        if (!audioEngine.src && currentSong) {
          get().playSong(currentSong);
          return;
        }

        audioEngine.play().catch(() => {
          set({ error: 'Failed to resume playback' });
        });
      },

      pause: () => {
        audioEngine.pause();
      },

      togglePlay: () => {
        if (audioEngine.paused) {
          get().play();
        } else {
          get().pause();
        }
      },

      seek: (time: number) => {
        audioEngine.seek(time);
        set({ currentTime: time });
      },

      setVolume: (volume: number) => {
        const v = Math.max(0, Math.min(1, volume));
        audioEngine.setVolume(v);
        set({ volume: v });
      },

      setPlaybackRate: (rate: number) => {
        audioEngine.setPlaybackRate(rate);
        set({ playbackRate: rate });
      },

      setAudioQuality: (quality: string) => {
        set({ audioQuality: quality });
        const { currentSong } = get();
        if (currentSong && !audioEngine.paused && audioEngine.src) {
          get().playSong(currentSong);
        }
      },

      setNormalizeVolume: (normalize: boolean) => set({ normalizeVolume: normalize }),
      setCrossfade: (crossfade: boolean) => set({ crossfade: crossfade }),

      setCurrentTime: (time: number) => set({ currentTime: time }),
      setDuration: (duration: number) => set({ duration }),
      setIsLoading: (loading: boolean) => set({ isLoading: loading }),
      setError: (error: string | null) => set({ error }),

      initAudioListeners: () => {
        const onPlay = () => set({ isPlaying: true, error: null });
        const onPause = () => set({ isPlaying: false });
        const onTimeUpdate = (data: { currentTime: number; duration: number }) =>
          set({ currentTime: data.currentTime });
        const onDurationChange = (data: { duration: number }) =>
          set({ duration: data.duration });
        const onEnded = () => {
          set({ isPlaying: false });
          const nextSong = useQueueStore.getState().playNext();
          if (nextSong) {
            get().playSong(nextSong);
          }
        };
        const onLoading = (data: { isLoading: boolean }) =>
          set({ isLoading: data.isLoading });
        const onCanPlay = () => set({ isLoading: false });
        const onError = (data: { message: string; code?: number }) =>
          set({ error: data.message, isLoading: false, isPlaying: false });

        audioEngine.on('play', onPlay);
        audioEngine.on('pause', onPause);
        audioEngine.on('timeupdate', onTimeUpdate);
        audioEngine.on('durationchange', onDurationChange);
        audioEngine.on('ended', onEnded);
        audioEngine.on('loading', onLoading);
        audioEngine.on('canplay', onCanPlay);
        audioEngine.on('error', onError);

        // Restore volume
        audioEngine.setVolume(get().volume);

        return () => {
          audioEngine.off('play', onPlay);
          audioEngine.off('pause', onPause);
          audioEngine.off('timeupdate', onTimeUpdate);
          audioEngine.off('durationchange', onDurationChange);
          audioEngine.off('ended', onEnded);
          audioEngine.off('loading', onLoading);
          audioEngine.off('canplay', onCanPlay);
          audioEngine.off('error', onError);
        };
      },
    }),
    {
      name: 'tunehina-player',
      partialize: (state) => ({
        currentSong: state.currentSong,
        currentTime: state.currentTime,
        volume: state.volume,
        playbackRate: state.playbackRate,
        audioQuality: state.audioQuality,
        normalizeVolume: state.normalizeVolume,
        crossfade: state.crossfade,
      }),
    },
  ),
);
