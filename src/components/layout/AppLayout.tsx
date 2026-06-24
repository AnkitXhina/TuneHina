import { Suspense, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { MiniPlayer } from '../player/MiniPlayer';
import { usePlayerStore } from '../../stores/playerStore';
import { useUIStore } from '../../stores/uiStore';

export function AppLayout() {
  const sidebarCollapsed = useUIStore(s => s.sidebarCollapsed);
  const nowPlayingOpen = useUIStore(s => s.nowPlayingOpen);
  const currentSong = usePlayerStore(s => s.currentSong);
  const setIsMobile = useUIStore(s => s.setIsMobile);

  useEffect(() => {

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [setIsMobile]);

  return (
    <div className="flex h-screen overflow-hidden bg-transparent relative z-0">
      {/* Sidebar */}
      {!nowPlayingOpen && <Sidebar />}

      {/* Main Content */}
      <main
        className={`flex-1 overflow-y-auto transition-all duration-300 relative ${
          currentSong ? 'pb-[144px] md:pb-32' : 'pb-20 md:pb-0'
        } ${sidebarCollapsed && !nowPlayingOpen ? 'md:ml-[72px]' : !nowPlayingOpen ? 'md:ml-64' : ''}`}
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

      {/* Bottom Mobile Navigation */}
      <BottomNav />
    </div>
  );
}
