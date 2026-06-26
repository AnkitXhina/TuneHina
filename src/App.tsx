import { useEffect, useState, useRef } from 'react';
import { Volume2 } from 'lucide-react';
import { AppRouter } from './router';
import { useUIStore } from './stores/uiStore';
import { usePlayerStore } from './stores/playerStore';
import { useLibraryStore } from './stores/libraryStore';
import { useQueueStore } from './stores/queueStore';
import { offlineDetector } from './services/offlineDetector';
import { themeEngine } from './services/themeEngine';
import { getImageUrl } from './lib/utils';
import { AnimatePresence } from 'framer-motion';
import { GlobalBackground } from './components/layout/GlobalBackground';

export default function App() {
  const isOffline = useUIStore(s => s.isOffline);
  const setIsOffline = useUIStore(s => s.setIsOffline);
  const toasts = useUIStore(s => s.toasts);
  const removeToast = useUIStore(s => s.removeToast);

  const volume = usePlayerStore(s => s.volume);
  const [showVolumeIndicator, setShowVolumeIndicator] = useState(false);
  const volumeIndicatorTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const flashVolumeIndicator = () => {
    setShowVolumeIndicator(true);
    clearTimeout(volumeIndicatorTimer.current);
    volumeIndicatorTimer.current = setTimeout(() => setShowVolumeIndicator(false), 1500);
  };

  useEffect(() => {
    setIsOffline(!offlineDetector.isOnline);
    const unsub = offlineDetector.subscribe((online) => setIsOffline(!online));
    
    // Initialize global stores that should persist across all routes
    const cleanupAudio = usePlayerStore.getState().initAudioListeners();
    useLibraryStore.getState().initFromDB();

    return () => {
      unsub();
      cleanupAudio();
    };
  }, [setIsOffline]);

  const currentSong = usePlayerStore(s => s.currentSong);

  // Dynamic Theme Generation
  useEffect(() => {
    if (!currentSong) {
      themeEngine.resetTheme();
      return;
    }

    // Get the high-quality image URL to extract dominant colors
    const imageUrl = getImageUrl(currentSong.image, 'high');
    if (imageUrl) {
      themeEngine.extractColors(imageUrl).then(colors => {
        themeEngine.applyTheme(colors);
      });
    } else {
      themeEngine.resetTheme();
    }
  }, [currentSong]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      const playerState = usePlayerStore.getState();
      const queueState = useQueueStore.getState();

      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        playerState.togglePlay();
      } else if (e.key === 'ArrowRight' && e.ctrlKey) {
        e.preventDefault();
        const next = queueState.playNext();
        if (next) playerState.playSong(next);
      } else if (e.key === 'ArrowLeft' && e.ctrlKey) {
        e.preventDefault();
        const prev = queueState.playPrevious();
        if (prev) playerState.playSong(prev);
      } else if (e.key === 'ArrowRight' && e.shiftKey) {
        e.preventDefault();
        playerState.seek(playerState.currentTime + 10);
      } else if (e.key === 'ArrowLeft' && e.shiftKey) {
        e.preventDefault();
        playerState.seek(playerState.currentTime - 10);
      } else if (e.key === 'ArrowUp' && e.shiftKey) {
        e.preventDefault();
        playerState.setVolume(Math.min(1, playerState.volume + 0.1));
        flashVolumeIndicator();
      } else if (e.key === 'ArrowDown' && e.shiftKey) {
        e.preventDefault();
        playerState.setVolume(Math.max(0, playerState.volume - 0.1));
        flashVolumeIndicator();
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        playerState.toggleMute();
        flashVolumeIndicator();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <>
      <GlobalBackground />
      <AppRouter />

      {/* Offline Indicator */}
      {isOffline && (
        <div className="fixed left-1/2 top-4 z-[100] -translate-x-1/2 rounded-full bg-yellow-500/10 border border-yellow-500/30 px-4 py-2 text-xs font-medium text-yellow-400 backdrop-blur-sm">
          You&apos;re offline — only cached content is available
        </div>
      )}

      {/* Toasts */}
      <div className="fixed bottom-24 right-4 z-[100] space-y-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <div
              key={toast.id}
              onClick={() => removeToast(toast.id)}
              className={`cursor-pointer rounded-lg px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-sm animate-fade-in ${
                toast.type === 'error'
                  ? 'bg-red-500/20 border border-red-500/30 text-red-300'
                  : toast.type === 'success'
                  ? 'bg-green-500/20 border border-green-500/30 text-green-300'
                  : 'bg-white/10 border border-white/10 text-white'
              }`}
            >
              {toast.message}
            </div>
          ))}
        </AnimatePresence>
      </div>

      {/* Volume Indicator Overlay */}
      <AnimatePresence>
        {showVolumeIndicator && (
          <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 bg-black/70 backdrop-blur-md rounded-2xl px-6 py-3 pointer-events-none animate-in fade-in slide-in-from-bottom-2">
            <Volume2 className="h-5 w-5 text-white" />
            <div className="w-32 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all duration-150" style={{ width: `${volume * 100}%` }} />
            </div>
            <span className="text-white text-xs font-medium">{Math.round(volume * 100)}%</span>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
