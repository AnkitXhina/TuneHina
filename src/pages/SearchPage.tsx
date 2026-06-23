import { useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search as SearchIcon, X, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSearchStore } from '../stores/searchStore';
import { usePlayerStore } from '../stores/playerStore';
import { useQueueStore } from '../stores/queueStore';
import type { Song } from '../types/music';
import { getImageUrl, formatTime } from '../lib/utils';
import { ArtistLinks } from '../components/ui/ArtistLinks';

export default function SearchPage() {
  const query = useSearchStore(s => s.query);
  const results = useSearchStore(s => s.results);
  const isSearching = useSearchStore(s => s.isSearching);
  const searchHistory = useSearchStore(s => s.searchHistory);
  const activeTab = useSearchStore(s => s.activeTab);
  const setQuery = useSearchStore(s => s.setQuery);
  const search = useSearchStore(s => s.search);
  const clearResults = useSearchStore(s => s.clearResults);
  const setActiveTab = useSearchStore(s => s.setActiveTab);
  const clearHistory = useSearchStore(s => s.clearHistory);

  const playSong = usePlayerStore(s => s.playSong);
  const setQueue = useQueueStore(s => s.setQueue);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      clearResults();
      return;
    }
    debounceRef.current = setTimeout(() => search(value), 300);
  }, [setQuery, search, clearResults]);

  const handlePlaySong = (song: Song) => {
    const songs = results?.songs?.results || [];
    const idx = songs.findIndex(s => s.id === song.id);
    if (songs.length > 0) {
      setQueue(songs, idx >= 0 ? idx : 0);
    }
    playSong(song);
  };

  const tabs = [
    { key: 'all' as const, label: 'All' },
    { key: 'songs' as const, label: 'Songs' },
    { key: 'albums' as const, label: 'Albums' },
    { key: 'artists' as const, label: 'Artists' },
    { key: 'playlists' as const, label: 'Playlists' },
  ];

  return (
    <div className="p-8">
      {/* Search Input */}
      <div className="mb-8">
        <div className="relative max-w-2xl">
          <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Search songs, albums, artists..."
            className="w-full rounded-xl border border-white/20 bg-white/10 py-3.5 pl-12 pr-10 text-white placeholder:text-white/50 outline-none transition-all focus:border-white/30 focus:bg-white/20"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); clearResults(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 icon-btn"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* No query - show history */}
      {!query && !results && (
        <div>
          {searchHistory.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-gray-400" />
                  Recent Searches
                </h2>
                <button onClick={clearHistory} className="text-xs text-gray-400 hover:text-white transition-colors">
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {searchHistory.map((q) => (
                  <button
                    key={q}
                    onClick={() => { setQuery(q); search(q); }}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {isSearching && (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
        </div>
      )}

      {/* Results */}
      {results && !isSearching && (
        <div>
          {/* Tabs */}
          <div className="mb-6 flex gap-3 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-white text-black'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Songs */}
          {(activeTab === 'all' || activeTab === 'songs') && results.songs?.results && results.songs.results.length > 0 && (
            <div className="mb-8">
              {activeTab === 'all' && <h3 className="mb-3 text-lg font-semibold text-white">Songs</h3>}
              <div className="space-y-1">
                {results.songs.results.slice(0, activeTab === 'all' ? 5 : 50).map((song) => (
                  <motion.div
                    key={song.id}
                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                    className="flex cursor-pointer items-center gap-3 rounded-lg p-2.5 transition-all"
                    onClick={() => handlePlaySong(song)}
                  >
                    <img
                      src={getImageUrl(song.image, 'low')}
                      alt={song.name}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{song.name}</p>
                      <p className="truncate text-xs text-gray-400">
                        Song • <ArtistLinks artists={song.artists} />
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 tabular-nums">{formatTime(song.duration)}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Albums */}
          {(activeTab === 'all' || activeTab === 'albums') && results.albums?.results && results.albums.results.length > 0 && (
            <div className="mb-8">
              {activeTab === 'all' && <h3 className="mb-3 text-lg font-semibold text-white">Albums</h3>}
              <div className="scroll-section">
                {results.albums.results.slice(0, 20).map((album) => (
                  <Link to={`/album/${album.id}`} key={album.id} className="media-card w-40 flex-shrink-0 block lg:w-44">
                    <div className="media-card-image mb-3">
                      <img
                        src={getImageUrl(album.image, 'medium')}
                        alt={album.name}
                        className="aspect-square w-full rounded-xl object-cover"
                      />
                    </div>
                    <p className="truncate text-sm font-medium text-white">{album.name}</p>
                    <p className="truncate text-xs text-gray-400">{album.year || 'Album'}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Artists */}
          {(activeTab === 'all' || activeTab === 'artists') && results.artists?.results && results.artists.results.length > 0 && (
            <div className="mb-8">
              {activeTab === 'all' && <h3 className="mb-3 text-lg font-semibold text-white">Artists</h3>}
              <div className="scroll-section">
                {results.artists.results.slice(0, 20).map((artist) => (
                  <div key={artist.id} className="media-card w-36 flex-shrink-0 text-center lg:w-40">
                    <div className="media-card-image mb-3">
                      <img
                        src={getImageUrl(artist.image, 'medium')}
                        alt={artist.name}
                        className="aspect-square w-full rounded-full object-cover"
                      />
                    </div>
                    <p className="truncate text-sm font-medium text-white">{artist.name}</p>
                    <p className="text-xs text-gray-400">Artist</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No results */}
          {(!results.songs?.results?.length && !results.albums?.results?.length && !results.artists?.results?.length) && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <SearchIcon className="mb-3 h-10 w-10" />
              <p className="font-medium">No results found</p>
              <p className="text-sm">Try different keywords</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
