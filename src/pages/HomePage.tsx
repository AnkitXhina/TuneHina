import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Play, Clock, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { getMusicProvider } from '../providers/music';
import { usePlayerStore } from '../stores/playerStore';
import { useQueueStore } from '../stores/queueStore';
import { useLibraryStore } from '../stores/libraryStore';
import type { Song, Album, Playlist } from '../types/music';
import { getImageUrl } from '../lib/utils';
import { ArtistLinks } from '../components/ui/ArtistLinks';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// Horizontal scrollable row with arrow buttons
function ScrollRow({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => {
    ref.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });
  };
  return (
    <div className="relative group/row">
      <button
        onClick={() => scroll(-1)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-black/60 backdrop-blur flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity -translate-x-2 hover:bg-black/80"
      >
        <ChevronRight className="h-5 w-5 text-white rotate-180" />
      </button>
      <div
        ref={ref}
        className="flex gap-4 overflow-x-auto pb-2 scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </div>
      <button
        onClick={() => scroll(1)}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-black/60 backdrop-blur flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity translate-x-2 hover:bg-black/80"
      >
        <ChevronRight className="h-5 w-5 text-white" />
      </button>
    </div>
  );
}

// Card for songs
function SongCard({ song, onClick }: { song: Song; onClick: () => void }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="w-40 flex-shrink-0 cursor-pointer group/card"
      onClick={onClick}
    >
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-white/5">
        <img
          src={getImageUrl(song.image, 'high')}
          alt={song.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover/card:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/0 group-hover/card:bg-black/30 transition-all duration-200 flex items-center justify-center">
          <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center shadow-xl opacity-0 group-hover/card:opacity-100 scale-75 group-hover/card:scale-100 transition-all duration-200">
            <Play className="h-5 w-5 fill-black text-black ml-0.5" />
          </div>
        </div>
      </div>
      <div className="mt-2 px-0.5">
        <p className="truncate text-sm font-medium text-white">{song.name}</p>
        <p className="truncate text-xs text-white/50 mt-0.5">
          <ArtistLinks artists={song.artists} />
        </p>
      </div>
    </motion.div>
  );
}

// Card for albums/playlists
function MediaCard({ item, type }: { item: Album | Playlist; type: 'album' | 'playlist' }) {
  const linkTo = type === 'album' ? `/album/${item.id}` : `/playlist/${item.id}`;
  const sub = type === 'album'
    ? <ArtistLinks artists={(item as Album).artists} />
    : (item as Playlist).description || 'Playlist';
  return (
    <Link to={linkTo} className="w-40 flex-shrink-0 group/card block">
      <motion.div whileHover={{ y: -4 }}>
        <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-white/5">
          <img
            src={getImageUrl(item.image, 'high')}
            alt={item.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover/card:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover/card:bg-black/30 transition-all duration-200 flex items-center justify-center">
            <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center shadow-xl opacity-0 group-hover/card:opacity-100 scale-75 group-hover/card:scale-100 transition-all duration-200">
              <Play className="h-5 w-5 fill-black text-black ml-0.5" />
            </div>
          </div>
        </div>
        <div className="mt-2 px-0.5">
          <p className="truncate text-sm font-medium text-white">{item.name}</p>
          <p className="truncate text-xs text-white/50 mt-0.5">{sub}</p>
        </div>
      </motion.div>
    </Link>
  );
}

// Quick pick row item (horizontal pill)
function QuickPick({ song, onClick }: { song: Song; onClick: () => void }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="flex items-center gap-3 bg-white/8 hover:bg-white/14 rounded-lg p-2 cursor-pointer transition-colors group/pick"
    >
      <img
        src={getImageUrl(song.image, 'low')}
        alt={song.name}
        className="h-11 w-11 rounded-md object-cover flex-shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white leading-tight">{song.name}</p>
        <p className="truncate text-xs text-white/50 mt-0.5">
          <ArtistLinks artists={song.artists} />
        </p>
      </div>
      <div className="h-8 w-8 rounded-full bg-white/0 group-hover/pick:bg-white/10 flex items-center justify-center transition-colors flex-shrink-0">
        <Play className="h-4 w-4 fill-white text-white ml-0.5 opacity-0 group-hover/pick:opacity-100 transition-opacity" />
      </div>
    </motion.div>
  );
}

export default function HomePage() {
  const [trendingSongs, setTrendingSongs] = useState<Song[]>([]);
  const [trendingAlbums, setTrendingAlbums] = useState<Album[]>([]);
  const [charts, setCharts] = useState<Playlist[]>([]);
  const [trendingPlaylists, setTrendingPlaylists] = useState<Playlist[]>([]);
  const [recentSongs, setRecentSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  const playSong = usePlayerStore(s => s.playSong);
  const setQueue = useQueueStore(s => s.setQueue);
  const getRecentlyPlayed = useLibraryStore(s => s.getRecentlyPlayed);

  useEffect(() => {
    window.history.scrollRestoration = 'manual';
    const load = async () => {
      setLoading(true);
      const provider = getMusicProvider();
      try {
        const [trending, chartsRes, recent] = await Promise.allSettled([
          provider.getTrending(),
          provider.getCharts(),
          getRecentlyPlayed(),
        ]);
        if (recent.status === 'fulfilled') setRecentSongs(recent.value.slice(0, 12));
        if (trending.status === 'fulfilled') {
          setTrendingSongs(trending.value.songs?.slice(0, 20) ?? []);
          setTrendingAlbums(trending.value.albums?.slice(0, 20) ?? []);
          setTrendingPlaylists(trending.value.playlists?.slice(0, 20) ?? []);
        }
        if (chartsRes.status === 'fulfilled') setCharts(chartsRes.value.slice(0, 20));
      } catch (e) {
        console.error('[Home] load failed:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const play = (song: Song, list: Song[]) => {
    const idx = list.findIndex(s => s.id === song.id);
    setQueue(list, idx >= 0 ? idx : 0);
    playSong(song);
  };

  if (loading) {
    return (
      <div className="p-8 space-y-10">
        <div className="h-9 w-56 animate-pulse rounded-lg bg-white/5" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-white/5" />
          ))}
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="space-y-4">
            <div className="h-5 w-36 animate-pulse rounded bg-white/5" />
            <div className="flex gap-4">
              {Array.from({ length: 6 }).map((_, j) => (
                <div key={j} className="w-40 flex-shrink-0 space-y-2">
                  <div className="aspect-square rounded-xl animate-pulse bg-white/5" />
                  <div className="h-3 w-3/4 animate-pulse rounded bg-white/5" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-white/5" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="px-6 pt-5 pb-32 space-y-10 overflow-hidden w-full">

      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between pt-2 mb-6 md:hidden">
          <img src="/icon-transparent.svg" className="h-10 w-10" style={{ minWidth: '40px', minHeight: '40px' }} />
        </div>
        <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight">{getGreeting()}</h1>
        <p className="mt-1 text-sm text-white/40">Discover music that moves you</p>
      </motion.div>

      {/* Quick Picks */}
      {recentSongs.length > 0 && (
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-white/40" />
            <h2 className="text-base font-semibold text-white/80 uppercase tracking-widest text-xs">Quick Picks</h2>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {recentSongs.slice(0, 8).map(song => (
              <QuickPick key={song.id} song={song} onClick={() => play(song, recentSongs)} />
            ))}
          </div>
        </motion.section>
      )}

      {/* Trending Songs */}
      {trendingSongs.length > 0 && (
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Trending Now</h2>
            <span className="text-xs text-white/30 uppercase tracking-widest">Songs</span>
          </div>
          <ScrollRow>
            {trendingSongs.map(song => (
              <SongCard key={song.id} song={song} onClick={() => play(song, trendingSongs)} />
            ))}
          </ScrollRow>
        </motion.section>
      )}

      {/* Charts */}
      {charts.length > 0 && (
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Top Charts</h2>
            <span className="text-xs text-white/30 uppercase tracking-widest">Playlists</span>
          </div>
          <ScrollRow>
            {charts.map(pl => (
              <MediaCard key={pl.id} item={pl} type="playlist" />
            ))}
          </ScrollRow>
        </motion.section>
      )}

      {/* Popular Albums */}
      {trendingAlbums.length > 0 && (
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Popular Albums</h2>
            <span className="text-xs text-white/30 uppercase tracking-widest">Albums</span>
          </div>
          <ScrollRow>
            {trendingAlbums.map(album => (
              <MediaCard key={album.id} item={album} type="album" />
            ))}
          </ScrollRow>
        </motion.section>
      )}

      {/* Recommended Playlists */}
      {trendingPlaylists.length > 0 && (
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Recommended Playlists</h2>
            <span className="text-xs text-white/30 uppercase tracking-widest">Playlists</span>
          </div>
          <ScrollRow>
            {trendingPlaylists.map(pl => (
              <MediaCard key={pl.id} item={pl} type="playlist" />
            ))}
          </ScrollRow>
        </motion.section>
      )}

    </div>
  );
}
