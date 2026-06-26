import { create } from 'zustand';

interface DownloadState {
  activeDownload: { songName: string; progress: number } | null;
  startDownload: (songName: string) => void;
  updateProgress: (progress: number) => void;
  completeDownload: () => void;
  clearDownload: () => void;
}

export const useDownloadStore = create<DownloadState>((set) => ({
  activeDownload: null,
  startDownload: (songName) => set({ activeDownload: { songName, progress: 0 } }),
  updateProgress: (progress) => set((s) => s.activeDownload ? { activeDownload: { ...s.activeDownload, progress } } : s),
  completeDownload: () => {
    set((s) => s.activeDownload ? { activeDownload: { ...s.activeDownload, progress: 100 } } : s);
    setTimeout(() => set({ activeDownload: null }), 2000);
  },
  clearDownload: () => set({ activeDownload: null }),
}));
