import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Clock, Disc3, Music, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import { getMusicProvider } from '../providers/music';
import { usePlayerStore } from '../stores/playerStore';
import { useQueueStore } from '../stores/queueStore';
import { useLibraryStore } from '../stores/libraryStore';
import type { Song, Album, Playlist } from '../types/music';
import { getImageUrl } from '../lib/utils';
import { ArtistLinks } from '../components/ui/ArtistLinks';

interface Section {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: (Song | Album | Playlist)[];
  type: 'song' | 'album' | 'playlist';
}

export default function HomePage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentSongs, setRecentSongs] = useState<Song[]>([]);
  const playSong = usePlayerStore(s => s.playSong);
  const setQueue = useQueueStore(s => s.setQueue);
  const getRecentlyPlayed = useLibraryStore(s => s.getRecentlyPlayed);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const provider = getMusicProvider();

      try {
        const [trending, charts, recent] = await Promise.allSettled([
          provider.getTrending(),
          provider.getCharts(),
          getRecentlyPlayed(),
        ]);

        const newSections: Section[] = [];

        // Recently Played
        if (recent.status === 'fulfilled' && recent.value.length > 0) {
          setRecentSongs(recent.value);
          newSections.push({
            title: 'Recently Played',
            icon: Clock,
            items: recent.value.slice(0, 20),
            type: 'song',
          });
        }

        // Trending Songs
        if (trending.status === 'fulfilled' && trending.value.songs.length > 0) {
          newSections.push({
            title: 'Trending Now',
            icon: TrendingUp,
            items: trending.value.songs.slice(0, 20),
            type: 'song',
          });
        }

        // Trending Albums
        if (trending.status === 'fulfilled' && trending.value.albums.length > 0) {
          newSections.push({
            title: 'Popular Albums',
            icon: Disc3,
            items: trending.value.albums.slice(0, 20),
            type: 'album',
          });
        }

        // Charts / Playlists
        if (charts.status === 'fulfilled' && charts.value.length > 0) {
          newSections.push({
            title: 'Charts & Playlists',
            icon: Music,
            items: charts.value.slice(0, 20),
            type: 'playlist',
          });
        }

        // Trending Playlists
        if (trending.status === 'fulfilled' && trending.value.playlists.length > 0) {
          newSections.push({
            title: 'Recommended Playlists',
            icon: Music,
            items: trending.value.playlists.slice(0, 20),
            type: 'playlist',
          });
        }

        setSections(newSections);
      } catch (error) {
        console.error('[Home] load failed:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handlePlaySong = (song: Song, sectionSongs: Song[]) => {
    const idx = sectionSongs.findIndex(s => s.id === song.id);
    setQueue(sectionSongs, idx >= 0 ? idx : 0);
    playSong(song);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-white/5" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-square animate-pulse rounded-xl bg-white/5" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-white/5" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-white/5" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-white">
          {getGreeting()}
        </h1>
        <p className="mt-1 text-gray-400">
          Discover music that moves you
        </p>
      </motion.div>

      {/* Quick Picks from recent */}
      {recentSongs.length > 0 && (
        <div className="mb-10">
          <h2 className="section-title">Quick Picks</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {recentSongs.slice(0, 8).map((song) => (
              <motion.div
                key={song.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex cursor-pointer items-center gap-3 rounded-lg bg-white/5 p-2 transition-colors hover:bg-white/10"
                onClick={() => handlePlaySong(song, recentSongs)}
              >
                <img
                  src={getImageUrl(song.image, 'low')}
                  alt={song.name}
                  className="h-12 w-12 rounded object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{song.name}</p>
                  <p className="truncate text-xs text-gray-400">
                    <ArtistLinks artists={song.artists} />
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Sections */}
      {sections.map((section, sIdx) => (
        <motion.div
          key={section.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: sIdx * 0.1 }}
          className="mb-10"
        >
          <h2 className="section-title">
            <span className="flex items-center gap-2">
              <section.icon className="h-5 w-5 text-gray-400" />
              {section.title}
            </span>
          </h2>

          <div className="scroll-section">
            {section.items.map((item) => {
              if (section.type === 'song') {
                const song = item as Song;
                return (
                  <div key={song.id} className="w-36 sm:w-48">
                    <div
                      className="song-card group aspect-square w-full bg-white/5 cursor-pointer rounded-xl overflow-hidden relative"
                      onClick={() => handlePlaySong(song, section.items as Song[])}
                    >
                      <img
                        src={getImageUrl(song.image, 'high')}
                        alt={song.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      <div className="play-overlay">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-lg transition-transform hover:scale-110">
                          <Play className="ml-1 h-6 w-6 fill-current" />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 px-1">
                      <p className="truncate text-sm font-medium text-white">{song.name}</p>
                      <p className="truncate text-xs text-gray-400">
                        <ArtistLinks artists={song.artists} />
                      </p>
                    </div>
                  </div>
                );
              }

              // Album or Playlist
              const isAlbum = section.type === 'album';
              const media = item as Album | Playlist;
              const linkTo = isAlbum ? `/album/${media.id}` : `/playlist/${media.id}`;
              
              return (
                <Link key={media.id} to={linkTo} className="w-36 sm:w-48 media-card block">
                  <div className="aspect-square w-full rounded-xl overflow-hidden bg-white/5">
                    <img
                      src={getImageUrl(media.image, 'high')}
                      alt={media.name}
                      className="media-card-image h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="mt-3 px-1">
                    <p className="truncate text-sm font-medium text-white">{media.name}</p>
                    <p className="truncate text-xs text-gray-400">
                      {isAlbum ? <ArtistLinks artists={(media as Album).artists} /> : 'TuneHina'}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </motion.div>
      ))}

      {sections.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Music className="mb-4 h-16 w-16" />
          <h2 className="mb-2 text-xl font-semibold text-gray-300">Welcome to TuneHina</h2>
          <p>Search for songs to get started</p>
        </div>
      )}
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
