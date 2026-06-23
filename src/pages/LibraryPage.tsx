import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Clock, ListMusic, Plus, Music } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLibraryStore } from '../stores/libraryStore';
import { usePlayerStore } from '../stores/playerStore';
import { useQueueStore } from '../stores/queueStore';
import type { Song } from '../types/music';
import type { UserPlaylist } from '../services/db';
import { getImageUrl, formatTime, cn } from '../lib/utils';
import { ArtistLinks } from '../components/ui/ArtistLinks';

type LibraryTab = 'liked' | 'recent' | 'playlists';

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<LibraryTab>('liked');
  const [likedSongs, setLikedSongs] = useState<Song[]>([]);
  const [recentSongs, setRecentSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const getLikedSongs = useLibraryStore(s => s.getLikedSongs);
  const getRecentlyPlayed = useLibraryStore(s => s.getRecentlyPlayed);
  const getPlaylists = useLibraryStore(s => s.getPlaylists);
  const createPlaylist = useLibraryStore(s => s.createPlaylist);
  const deletePlaylist = useLibraryStore(s => s.deletePlaylist);
  const playSong = usePlayerStore(s => s.playSong);
  const setQueue = useQueueStore(s => s.setQueue);

  const loadData = async () => {
    setLoading(true);
    const [liked, recent, pls] = await Promise.all([
      getLikedSongs(),
      getRecentlyPlayed(),
      getPlaylists(),
    ]);
    setLikedSongs(liked);
    setRecentSongs(recent);
    setPlaylists(pls);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handlePlay = (song: Song, list: Song[]) => {
    const idx = list.findIndex(s => s.id === song.id);
    setQueue(list, idx >= 0 ? idx : 0);
    playSong(song);
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    await createPlaylist(newPlaylistName.trim());
    setNewPlaylistName('');
    setShowCreatePlaylist(false);
    loadData();
  };

  const tabs = [
    { key: 'liked' as const, label: 'Liked Songs', icon: Heart, count: likedSongs.length },
    { key: 'recent' as const, label: 'Recent', icon: Clock, count: recentSongs.length },
    { key: 'playlists' as const, label: 'Playlists', icon: ListMusic, count: playlists.length },
  ];

  const currentSongs = activeTab === 'liked' ? likedSongs : activeTab === 'recent' ? recentSongs : [];

  return (
    <div className="p-8">
      <h1 className="mb-6 text-3xl font-bold text-white">Your Library</h1>

      {/* Tabs */}
      <div className="mb-6 flex gap-3">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all',
              activeTab === tab.key
                ? 'bg-white text-black'
                : 'bg-white/5 text-gray-300 hover:bg-white/10',
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            <span className="text-xs opacity-60">({tab.count})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-12 w-12 animate-pulse rounded-lg bg-white/5" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 animate-pulse rounded bg-white/5" />
                <div className="h-3 w-1/5 animate-pulse rounded bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Playlists view */}
          {activeTab === 'playlists' && (
            <div>
              <button
                onClick={() => setShowCreatePlaylist(true)}
                className="mb-4 flex items-center gap-2 rounded-lg bg-white/5 px-4 py-3 text-sm text-white transition-colors hover:bg-white/10"
              >
                <Plus className="h-5 w-5" />
                Create Playlist
              </button>

              {showCreatePlaylist && (
                <div className="mb-4 flex items-center gap-2">
                  <input
                    type="text"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
                    placeholder="Playlist name"
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white outline-none"
                    autoFocus
                  />
                  <button onClick={handleCreatePlaylist} className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black">
                    Create
                  </button>
                  <button onClick={() => setShowCreatePlaylist(false)} className="px-3 py-2 text-sm text-gray-400">
                    Cancel
                  </button>
                </div>
              )}

              {playlists.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-gray-500">
                  <ListMusic className="mb-3 h-10 w-10" />
                  <p>No playlists yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {playlists.map((pl) => (
                    <div key={pl.id} className="flex items-center justify-between rounded-lg p-3 hover:bg-white/5 group">
                      <Link to={`/playlist/${pl.id}`} className="flex flex-1 items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500/30 to-pink-500/30">
                          <ListMusic className="h-5 w-5 text-gray-300" />
                        </div>
                        <div>
                          <p className="font-medium text-white group-hover:text-theme-primary transition-colors">{pl.name}</p>
                          <p className="text-sm text-gray-400">{pl.songIds.length} songs</p>
                        </div>
                      </Link>
                      <button
                        onClick={(e) => { e.preventDefault(); deletePlaylist(pl.id); loadData(); }}
                        className="text-xs text-gray-500 hover:text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Song list view */}
          {activeTab !== 'playlists' && (
            currentSongs.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-gray-500">
                <Music className="mb-3 h-10 w-10" />
                <p>{activeTab === 'liked' ? 'No liked songs yet' : 'No recently played songs'}</p>
              </div>
            ) : (
              <div className="space-y-1">
                {currentSongs.map((song, i) => (
                  <motion.div
                    key={song.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.3) }}
                    className="flex cursor-pointer items-center gap-3 rounded-lg p-2.5 transition-all hover:bg-white/5"
                    onClick={() => handlePlay(song, currentSongs)}
                  >
                    <span className="w-6 text-center text-xs text-gray-500 tabular-nums">{i + 1}</span>
                    <img
                      src={getImageUrl(song.image, 'low')}
                      alt={song.name}
                      className="h-11 w-11 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{song.name}</p>
                      <p className="truncate text-xs text-gray-400"><ArtistLinks artists={song.artists} /></p>
                    </div>
                    <span className="text-xs text-gray-500 tabular-nums">{formatTime(song.duration)}</span>
                  </motion.div>
                ))}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
