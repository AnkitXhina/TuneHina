import { Suspense, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MiniPlayer } from '../player/MiniPlayer';
import { usePlayerStore } from '../../stores/playerStore';
import { useUIStore } from '../../stores/uiStore';
import { offlineDetector } from '../../services/offlineDetector';

export function AppLayout() {
  const sidebarCollapsed = useUIStore(s => s.sidebarCollapsed);
  const nowPlayingOpen = useUIStore(s => s.nowPlayingOpen);
  const currentSong = usePlayerStore(s => s.currentSong);
  const setIsOffline = useUIStore(s => s.setIsOffline);
  const setIsMobile = useUIStore(s => s.setIsMobile);

  useEffect(() => {
    const unsubOffline = offlineDetector.subscribe((online) => {
      setIsOffline(!online);
    });

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      unsubOffline();
      window.removeEventListener('resize', handleResize);
    };
  }, [setIsOffline, setIsMobile]);

  return (
    <div className="flex h-screen overflow-hidden bg-transparent relative z-0">
      {/* Sidebar */}
      {!nowPlayingOpen && <Sidebar />}

      {/* Main Content */}
      <main
        className={`flex-1 overflow-y-auto transition-all duration-300 relative ${
          currentSong ? 'pb-32' : ''
        } ${sidebarCollapsed && !nowPlayingOpen ? 'ml-16' : !nowPlayingOpen ? 'ml-64' : ''}`}
      >
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>

      {/* Persistent Mini Player */}
      {currentSong && !nowPlayingOpen && <MiniPlayer />}
    </div>
  );
}
