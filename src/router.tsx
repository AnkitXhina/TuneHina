import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';

const HomePage = lazy(() => import('./pages/HomePage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const NowPlayingPage = lazy(() => import('./pages/NowPlayingPage'));
const LibraryPage = lazy(() => import('./pages/LibraryPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AlbumPage = lazy(() => import('./pages/AlbumPage'));
const PlaylistPage = lazy(() => import('./pages/PlaylistPage'));
const ArtistPage = lazy(() => import('./pages/ArtistPage'));

export function AppRouter() {
  return (
    <Routes>
      {/* Now Playing is a full-screen overlay outside the main layout */}
      <Route path="/now-playing" element={<NowPlayingPage />} />

      {/* Main layout with sidebar */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/library/recent" element={<LibraryPage />} />
        <Route path="/library/playlists" element={<LibraryPage />} />
        <Route path="/liked" element={<LibraryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/album/:id" element={<AlbumPage />} />
        <Route path="/playlist/:id" element={<PlaylistPage />} />
        <Route path="/artist/:id" element={<ArtistPage />} />
      </Route>
    </Routes>
  );
}
