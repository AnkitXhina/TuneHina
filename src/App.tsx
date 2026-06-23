import { useEffect } from 'react';
import { AppRouter } from './router';
import { useUIStore } from './stores/uiStore';
import { usePlayerStore } from './stores/playerStore';
import { useLibraryStore } from './stores/libraryStore';
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
    const handler = (e: KeyboardEvent) => {
      // Space to toggle play (only if not in input)
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        usePlayerStore.getState().togglePlay();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
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
    </>
  );
}
