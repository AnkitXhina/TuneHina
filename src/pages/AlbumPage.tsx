import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, ArrowLeft, Heart, MoreHorizontal, Clock } from 'lucide-react';
import type { Album, Song } from '../types/music';
import { usePlayerStore } from '../stores/playerStore';
import { useQueueStore } from '../stores/queueStore';
import { getImageUrl, formatTime } from '../lib/utils';
import { ArtistLinks } from '../components/ui/ArtistLinks';
import { motion } from 'framer-motion';

export default function AlbumPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [album, setAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(true);
  const playSong = usePlayerStore(s => s.playSong);
  const currentSong = usePlayerStore(s => s.currentSong);
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const togglePlay = usePlayerStore(s => s.togglePlay);
  const setQueue = useQueueStore(s => s.setQueue);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);

    import('../providers/music').then(({ getMusicProvider }) => {
      const provider = getMusicProvider();
      let actualId = id;

      const loadAlbum = async () => {
        try {
          const data = await provider.getAlbum(actualId);
          if (mounted) {
            setAlbum(data);
            setLoading(false);
          }
        } catch (err) {
          try {
            const searchData = await provider.search(id);
            const firstAlbum = searchData.albums?.results?.[0];
            if (firstAlbum) {
              actualId = firstAlbum.id;
              window.history.replaceState(null, '', `/album/${actualId}`);
              const data = await provider.getAlbum(actualId);
              if (mounted) {
                setAlbum(data);
                setLoading(false);
              }
            } else {
              throw err;
            }
          } catch (fallbackErr) {
            console.error('Failed to load album:', fallbackErr);
            if (mounted) setLoading(false);
          }
        }
      };

      loadAlbum();
    });

    return () => { mounted = false; };
  }, [id]);

  const handlePlaySong = (song: Song, index: number) => {
    if (currentSong?.id === song.id) {
      togglePlay();
      return;
    }
    if (album?.songs) {
      setQueue(album.songs, index);
    }
    playSong(song);
  };

  const handlePlayAlbum = () => {
    if (album?.songs && album.songs.length > 0) {
      handlePlaySong(album.songs[0], 0);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-theme-primary border-t-transparent" />
      </div>
    );
  }

  if (!album) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-gray-400">
        <p className="mb-4 text-xl">Album not found</p>
        <button onClick={() => navigate(-1)} className="text-theme-primary hover:underline">
          Go back
        </button>
      </div>
    );
  }

  const isAlbumPlaying = currentSong?.album.id === album.id;

  return (
    <div className="relative min-h-full pb-8">
      {/* Dynamic blurred header background */}
      <div className="absolute inset-0 h-96 w-full overflow-hidden opacity-30">
        <div 
          className="absolute inset-0 bg-cover bg-center blur-[100px] scale-150"
          style={{ backgroundImage: `url(${getImageUrl(album.image, 'low')})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="relative z-10 px-8 pt-8">
        <button 
          onClick={() => navigate(-1)}
          className="icon-btn mb-6 flex items-center gap-2 rounded-full bg-black/20 px-4 py-2 text-sm text-white backdrop-blur-md hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {/* Header */}
        <div className="flex flex-col gap-6 md:flex-row md:items-end">
          <motion.img
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            src={getImageUrl(album.image, 'high')}
            alt={album.name}
            className="h-56 w-56 rounded-xl object-cover shadow-2xl"
          />
          <div className="flex flex-col">
            <span className="mb-2 text-sm font-medium uppercase tracking-wider text-theme-primary-light">
              Album
            </span>
            <h1 className="mb-4 text-4xl font-extrabold text-white md:text-6xl lg:text-7xl">
              {album.name}
            </h1>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <span className="font-semibold text-white"><ArtistLinks artists={album.artists} /></span>
              <span>•</span>
              <span>{album.year}</span>
              <span>•</span>
              <span>{album.songs?.length || 0} songs</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex items-center gap-4">
          <button
            onClick={handlePlayAlbum}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-theme-primary text-white shadow-xl shadow-theme-primary/30 transition-transform hover:scale-105 active:scale-95"
          >
            {isAlbumPlaying && isPlaying ? (
              <div className="flex gap-1">
                <div className="h-4 w-1 animate-pulse rounded-full bg-white" />
                <div className="h-4 w-1 animate-pulse rounded-full bg-white delay-75" />
                <div className="h-4 w-1 animate-pulse rounded-full bg-white delay-150" />
              </div>
            ) : (
              <Play className="ml-1 h-6 w-6 fill-current" />
            )}
          </button>
          <button className="icon-btn h-12 w-12 border border-white/10">
            <Heart className="h-6 w-6" />
          </button>
          <button className="icon-btn h-12 w-12 border border-white/10">
            <MoreHorizontal className="h-6 w-6" />
          </button>
        </div>

        {/* Tracklist */}
        <div className="mt-10">
          <div className="mb-4 grid grid-cols-[16px_1fr_48px] gap-4 px-4 text-sm font-medium text-gray-400">
            <div className="text-center">#</div>
            <div>Title</div>
            <div className="flex justify-end">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          
          <div className="space-y-1">
            {album.songs?.map((song, index) => {
              const isSongActive = currentSong?.id === song.id;
              
              return (
                <div
                  key={song.id}
                  onClick={() => handlePlaySong(song, index)}
                  className={`group grid cursor-pointer grid-cols-[16px_1fr_48px] items-center gap-4 rounded-lg px-4 py-3 transition-colors hover:bg-white/5 ${
                    isSongActive ? 'bg-white/5' : ''
                  }`}
                >
                  <div className="flex items-center justify-center text-sm">
                    {isSongActive && isPlaying ? (
                      <div className="flex h-3 items-end gap-0.5">
                        <div className="w-1 animate-pulse rounded-t-sm bg-theme-primary h-2" />
                        <div className="w-1 animate-pulse rounded-t-sm bg-theme-primary h-3 delay-75" />
                        <div className="w-1 animate-pulse rounded-t-sm bg-theme-primary h-1.5 delay-150" />
                      </div>
                    ) : (
                      <span className={`text-gray-400 group-hover:hidden ${isSongActive ? 'text-theme-primary font-bold' : ''}`}>
                        {index + 1}
                      </span>
                    )}
                    <Play className="hidden h-4 w-4 text-white group-hover:block" />
                  </div>
                  
                  <div className="flex flex-col overflow-hidden">
                    <span className={`truncate text-base ${isSongActive ? 'text-theme-primary font-semibold' : 'text-white'}`}>
                      {song.name}
                    </span>
                    <span className="truncate text-sm text-gray-400">
                      <ArtistLinks artists={song.artists} />
                    </span>
                  </div>
                  
                  <div className="text-right text-sm text-gray-400">
                    {formatTime(song.duration)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
