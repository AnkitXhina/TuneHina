import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, ArrowLeft, Heart, MoreHorizontal, Clock, Music, Camera } from 'lucide-react';
import type { Playlist, Song } from '../types/music';
import { usePlayerStore } from '../stores/playerStore';
import { useQueueStore } from '../stores/queueStore';
import { getImageUrl, formatTime } from '../lib/utils';
import { ArtistLinks } from '../components/ui/ArtistLinks';
import { motion } from 'framer-motion';
import { useLibraryStore } from '../stores/libraryStore';

export default function PlaylistPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
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

    import('../providers/music').then(async ({ getMusicProvider }) => {
      const provider = getMusicProvider();
      
      try {
        // First try to load from local library
        const localPlaylist = await useLibraryStore.getState().getPlaylist(id);
        if (localPlaylist && mounted) {
          // It's a local playlist. Fetch the song details.
          const songs = await provider.getSongsByIds(localPlaylist.songIds);
          setPlaylist({
            id: localPlaylist.id,
            name: localPlaylist.name,
            description: localPlaylist.description,
            type: 'playlist',
            image: localPlaylist.coverImage ? [{ quality: 'high', url: localPlaylist.coverImage }] : [],
            songCount: songs.length,
            songs: songs
          });
          setLoading(false);
          return;
        }

        // If not local, load from JioSaavn
        const data = await provider.getPlaylist(id);
        if (mounted) {
          setPlaylist(data);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load playlist:', err);
        if (mounted) setLoading(false);
      }
    });

    return () => { mounted = false; };
  }, [id]);

  const handleArtworkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !playlist) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      await useLibraryStore.getState().setPlaylistArtwork(playlist.id, base64);
      setPlaylist({ ...playlist, image: [{ quality: 'high', url: base64 }] });
    };
    reader.readAsDataURL(file);
  };

  const handlePlaySong = (song: Song, index: number) => {
    if (currentSong?.id === song.id) {
      togglePlay();
      return;
    }
    if (playlist?.songs) {
      setQueue(playlist.songs, index);
    }
    playSong(song);
  };

  const handlePlayPlaylist = () => {
    if (playlist?.songs && playlist.songs.length > 0) {
      handlePlaySong(playlist.songs[0], 0);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-theme-primary border-t-transparent" />
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-gray-400">
        <p className="mb-4 text-xl">Playlist not found</p>
        <button onClick={() => navigate(-1)} className="text-theme-primary hover:underline">
          Go back
        </button>
      </div>
    );
  }

  // To check if playlist is currently playing, we see if the current queue matches this playlist
  // A simple heuristic is if the current song is in the playlist.
  const isPlaylistPlaying = playlist.songs?.some(s => s.id === currentSong?.id);

  return (
    <div className="relative min-h-full pb-8">
      {/* Dynamic blurred header background */}
      <div className="absolute inset-0 h-96 w-full overflow-hidden opacity-30">
        <div 
          className="absolute inset-0 bg-cover bg-center blur-[100px] scale-150"
          style={{ backgroundImage: `url(${getImageUrl(playlist.image, 'low')})` }}
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-56 w-56 flex-shrink-0 rounded-xl shadow-2xl bg-white/5 relative group/art cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-full h-full rounded-xl overflow-hidden">
              {playlist.image && playlist.image.length > 0 ? (
                <img src={getImageUrl(playlist.image, 'high')} className="w-full h-full object-cover" />
              ) : playlist.songs && playlist.songs.length >= 4 ? (
                <div className="grid grid-cols-2 w-full h-full">
                  {playlist.songs.slice(0, 4).map((song, i) => (
                    <img key={i} src={getImageUrl(song.image, 'low')} className="w-full h-full object-cover" />
                  ))}
                </div>
              ) : playlist.songs && playlist.songs.length > 0 ? (
                <img src={getImageUrl(playlist.songs[0].image, 'high')} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-white/5">
                  <Music className="h-16 w-16 text-white/20" />
                </div>
              )}
            </div>
            
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/art:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
              <Camera className="h-8 w-8 text-white" />
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleArtworkChange} />
          </motion.div>
          <div className="flex flex-col">
            <span className="mb-2 text-sm font-medium uppercase tracking-wider text-theme-primary-light">
              Playlist
            </span>
            <h1 className="mb-4 text-4xl font-extrabold text-white md:text-6xl lg:text-7xl">
              {playlist.name}
            </h1>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <span className="font-semibold text-white">TuneHina</span>
              <span>•</span>
              <span>{playlist.songCount || playlist.songs?.length || 0} songs</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex items-center gap-4">
          <button
            onClick={handlePlayPlaylist}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-theme-primary text-white shadow-xl shadow-theme-primary/30 transition-transform hover:scale-105 active:scale-95"
          >
            {isPlaylistPlaying && isPlaying ? (
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
            {playlist.songs?.map((song, index) => {
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
