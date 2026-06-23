import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1,
  Volume2, VolumeX, ChevronDown, Heart, ListMusic, Mic2, Radio,
  MoreHorizontal, Disc3, Plus, Maximize2, Minimize2, Download
} from 'lucide-react';
import { usePlayerStore } from '../stores/playerStore';
import { useQueueStore } from '../stores/queueStore';
import { useThemeStore } from '../stores/themeStore';
import { useLibraryStore } from '../stores/libraryStore';
import { useUIStore } from '../stores/uiStore';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { getMusicProvider } from '../providers/music';
import { lyricsManager } from '../providers/lyrics/LyricsManager';
import { LyricsLoadingPanel } from '../components/player/LyricsLoadingPanel';
import type { Song } from '../types/music';
import type { LyricsResult } from '../types/lyrics';
import { getImageUrl, formatTime, cn, getDownloadUrl, getArtistNames } from '../lib/utils';
import { ArtistLinks } from '../components/ui/ArtistLinks';

type NowPlayingTab = 'upnext' | 'lyrics' | 'related';

export default function NowPlayingPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<NowPlayingTab>('upnext');
  const [lyrics, setLyrics] = useState<LyricsResult | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsStatus, setLyricsStatus] = useState('Searching for lyrics...');
  const [relatedSongs, setRelatedSongs] = useState<Song[]>([]);
  const [activeLyricIndex, setActiveLyricIndex] = useState(-1);
  const [userPlaylists, setUserPlaylists] = useState<import('../services/db').UserPlaylist[]>([]);
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isImmersiveMode, setIsImmersiveMode] = useState(false);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);
      if (!isFs) {
        setIsImmersiveMode(false); // Drop immersive mode if they exit native fullscreen
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleImmersiveMode = async () => {
    const nextState = !isImmersiveMode;
    setIsImmersiveMode(nextState);
    if (nextState) {
      setActiveTab('lyrics'); // Switch to lyrics for immersive dominance
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {
        console.warn('Error toggling fullscreen', err);
      }
    } else {
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
      } catch (err) {
        console.warn('Error exiting fullscreen', err);
      }
    }
  };

  const currentSong = usePlayerStore(s => s.currentSong);
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const currentTime = usePlayerStore(s => s.currentTime);
  const duration = usePlayerStore(s => s.duration);
  const volume = usePlayerStore(s => s.volume);
  const togglePlay = usePlayerStore(s => s.togglePlay);
  const seek = usePlayerStore(s => s.seek);
  const setVolume = usePlayerStore(s => s.setVolume);
  const playSong = usePlayerStore(s => s.playSong);

  const queue = useQueueStore(s => s.queue);
  const currentIndex = useQueueStore(s => s.currentIndex);
  const playNext = useQueueStore(s => s.playNext);
  const playPrevious = useQueueStore(s => s.playPrevious);
  const isShuffled = useQueueStore(s => s.isShuffled);
  const repeatMode = useQueueStore(s => s.repeatMode);
  const toggleShuffle = useQueueStore(s => s.toggleShuffle);
  const cycleRepeatMode = useQueueStore(s => s.cycleRepeatMode);
  const addToQueue = useQueueStore(s => s.addToQueue);
  const needsRecommendations = useQueueStore(s => s.needsRecommendations);
  const addRecommendations = useQueueStore(s => s.addRecommendations);

  const extractFromArtwork = useThemeStore(s => s.extractFromArtwork);
  const toggleLike = useLibraryStore(s => s.toggleLike);
  const isLiked = useLibraryStore(s => s.isLiked);
  const addToRecentlyPlayed = useLibraryStore(s => s.addToRecentlyPlayed);
  const setNowPlayingOpen = useUIStore(s => s.setNowPlayingOpen);

  // Mark Now Playing as open
  useEffect(() => {
    setNowPlayingOpen(true);
    return () => setNowPlayingOpen(false);
  }, [setNowPlayingOpen]);

  // Extract theme colors from artwork
  useEffect(() => {
    if (currentSong) {
      const artworkUrl = getImageUrl(currentSong.image, 'high');
      if (artworkUrl && !artworkUrl.includes('placeholder')) {
        extractFromArtwork(artworkUrl);
      }
      addToRecentlyPlayed(currentSong);
    }
  }, [currentSong?.id, extractFromArtwork, addToRecentlyPlayed]);

  // Fetch lyrics
  useEffect(() => {
    if (!currentSong) return;
    setLyricsLoading(true);
    setLyricsStatus('Searching for lyrics...');
    setLyrics(null);
    lyricsManager.getLyrics(currentSong, setLyricsStatus).then((result) => {
      setLyrics(result);
      setLyricsLoading(false);
      if (!result) setLyricsStatus('No lyrics found for this song.');
    }).catch(() => {
      setLyricsLoading(false);
      setLyricsStatus('No lyrics found for this song.');
    });
  }, [currentSong?.id]);

  // Fetch related songs and auto-recommendations
  useEffect(() => {
    if (!currentSong) return;
    const provider = getMusicProvider();
    provider.getSuggestions(currentSong.id, 15).then((songs) => {
      setRelatedSongs(songs);
      // Auto-add recommendations if queue is running low
      if (needsRecommendations && songs.length > 0) {
        addRecommendations(songs);
      }
    }).catch(() => setRelatedSongs([]));
  }, [currentSong?.id, needsRecommendations]);

  // Auto-fetch more recommendations when queue runs low
  useEffect(() => {
    if (!needsRecommendations || !currentSong) return;
    const provider = getMusicProvider();

    const fetchMore = async () => {
      try {
        let songs = await provider.getSuggestions(currentSong.id, 15);
        if (songs.length === 0) songs = await provider.getTrendingSongs();
        if (songs.length > 0) addRecommendations(songs);
      } catch { /* Ignore */ }
    };
    fetchMore();
  }, [needsRecommendations, currentSong?.id]);

  // Fetch user playlists for the dropdown
  useEffect(() => {
    useLibraryStore.getState().getPlaylists().then(setUserPlaylists);
  }, []);

  // Sync lyrics with current time
  useEffect(() => {
    if (!lyrics?.synced) return;
    const lines = lyrics.synced.lines;
    const timeMs = currentTime * 1000;
    let idx = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (timeMs >= lines[i].timeMs) {
        idx = i;
        break;
      }
    }
    setActiveLyricIndex(idx);
  }, [currentTime, lyrics]);

  // Auto-scroll lyrics
  useEffect(() => {
    if (activeLyricIndex < 0 || !lyricsContainerRef.current) return;
    const container = lyricsContainerRef.current;
    const activeLine = container.querySelector(`[data-lyric-index="${activeLyricIndex}"]`);
    if (activeLine) {
      activeLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeLyricIndex]);

  const handlePrev = () => {
    if (currentTime > 3) {
      seek(0);
      return;
    }
    const prev = playPrevious();
    if (prev) playSong(prev);
  };

  const handleNext = () => {
    const next = playNext();
    if (next) playSong(next);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    seek(pct * duration);
  };

  const handleClose = () => {
    setNowPlayingOpen(false);
    navigate(-1);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key.toLowerCase()) {
        case 'f':
          e.preventDefault();
          toggleImmersiveMode();
          break;
        case 'l':
          e.preventDefault();
          setActiveTab(t => t === 'lyrics' ? 'upnext' : 'lyrics');
          break;
        case 'escape':
          if (isFullscreen || isImmersiveMode) {
            e.preventDefault();
            setIsImmersiveMode(false);
            if (document.fullscreenElement) document.exitFullscreen().catch(()=>{});
          } else {
            e.preventDefault();
            handleClose();
          }
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  const handlePlayFromQueue = (index: number) => {
    const song = queue[index];
    if (song) {
      useQueueStore.getState().jumpToIndex(index);
      playSong(song);
    }
  };

  const handlePlayRelated = (song: Song) => {
    addToQueue(song);
    playSong(song);
    const idx = queue.length;
    useQueueStore.getState().jumpToIndex(idx);
  };

  if (!currentSong) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500">No song playing</p>
      </div>
    );
  }

  const artworkUrl = getImageUrl(currentSong.image, 'high');
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  
  // Show a bit of history + the rest of the queue
  const displayQueue = queue;

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-black/10 backdrop-blur-[80px] transition-colors duration-1000">
      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-6 py-8">
        <button onClick={handleClose} className="icon-btn" aria-label="Close">
          <ChevronDown className="h-8 w-8" />
        </button>
        <div className="text-center">
          <p className="text-2xs uppercase tracking-widest text-gray-400">Now Playing</p>
          <p className="text-xs text-gray-300 truncate max-w-[200px]">{currentSong.album.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="icon-btn" aria-label="More options">
                <MoreHorizontal className="h-6 w-6" />
              </button>
            </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="z-[60] w-56 rounded-xl border border-white/10 bg-surface-light p-1.5 text-sm text-gray-200 shadow-2xl animate-in fade-in zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
              sideOffset={5}
              align="end"
            >
              <DropdownMenu.Item className="flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-2 outline-none hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white" onSelect={() => {
                addToQueue(currentSong);
                useUIStore.getState().addToast({ message: 'Added to queue', type: 'success' });
              }}>
                <ListMusic className="h-4 w-4" />
                Add to Queue
              </DropdownMenu.Item>
              <DropdownMenu.Item className="flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-2 outline-none hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white" onSelect={(e) => {
                e.preventDefault();
                toggleLike(currentSong);
              }}>
                <Heart className="h-4 w-4" fill={isLiked(currentSong.id) ? 'currentColor' : 'none'} />
                {isLiked(currentSong.id) ? 'Unlike Song' : 'Like Song'}
              </DropdownMenu.Item>
              <DropdownMenu.Item className="flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-2 outline-none hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white" onSelect={() => {
                const url = getDownloadUrl(currentSong.downloadUrl, '320kbps');
                if (!url) {
                  useUIStore.getState().addToast({ message: 'No download URL available', type: 'error' });
                  return;
                }
                const artistName = getArtistNames(currentSong.artists);
                const fileName = `${currentSong.name} - ${artistName}.m4a`;
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                useUIStore.getState().addToast({ message: `Downloading ${currentSong.name}...`, type: 'success' });
              }}>
                <Download className="h-4 w-4" />
                Download
              </DropdownMenu.Item>
              
              <DropdownMenu.Sub>
                <DropdownMenu.SubTrigger className="flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-2 outline-none hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white data-[state=open]:bg-white/10 data-[state=open]:text-white">
                  <ListMusic className="h-4 w-4" />
                  <span className="flex-1">Add to Playlist</span>
                </DropdownMenu.SubTrigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.SubContent 
                    className="z-[60] w-48 rounded-xl border border-white/10 bg-surface-light p-1.5 text-sm text-gray-200 shadow-2xl animate-in slide-in-from-left-1"
                    sideOffset={2}
                    alignOffset={-5}
                  >
                    <DropdownMenu.Item 
                      className="flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-2 outline-none hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white text-theme-primary-light"
                      onSelect={() => setIsCreatingPlaylist(true)}
                    >
                      <Plus className="h-4 w-4" />
                      Create New Playlist
                    </DropdownMenu.Item>
                    
                    {userPlaylists.length > 0 && <DropdownMenu.Separator className="my-1 h-px bg-white/10" />}

                    {userPlaylists.length === 0 ? (
                      <div className="px-2 py-2 text-xs text-gray-500 text-center">
                        No playlists yet
                      </div>
                    ) : (
                      userPlaylists.map(pl => (
                        <DropdownMenu.Item 
                          key={pl.id} 
                          className="flex cursor-pointer select-none items-center rounded-md px-2 py-2 outline-none hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white truncate"
                          onSelect={async () => {
                            await useLibraryStore.getState().addToPlaylist(pl.id, currentSong);
                            useUIStore.getState().addToast({ message: `Added to ${pl.name}`, type: 'success' });
                          }}
                        >
                          {pl.name}
                        </DropdownMenu.Item>
                      ))
                    )}
                  </DropdownMenu.SubContent>
                </DropdownMenu.Portal>
              </DropdownMenu.Sub>

              <DropdownMenu.Separator className="my-1 h-px bg-white/10" />
              <DropdownMenu.Item className="flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-2 outline-none hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white" onSelect={() => { 
                useUIStore.getState().setNowPlayingOpen(false);
                navigate(`/album/${currentSong.album.id}`); 
              }}>
                <Disc3 className="h-4 w-4" />
                View Album
              </DropdownMenu.Item>
              <DropdownMenu.Item className="flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-2 outline-none hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white" onSelect={() => {
                const artist = currentSong.artists.primary[0] || currentSong.artists.all[0];
                if (artist) {
                  useUIStore.getState().setNowPlayingOpen(false);
                  navigate(`/artist/${artist.id}`);
                }
              }}>
                <Mic2 className="h-4 w-4" />
                View Artist
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px bg-white/10" />
              <DropdownMenu.Item className="flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-2 outline-none hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white" onSelect={async () => {
                useUIStore.getState().addToast({ message: 'Starting radio...', type: 'info' });
                const provider = getMusicProvider();
                const songs = await provider.getSuggestions(currentSong.id, 20);
                if (songs.length > 0) {
                  useQueueStore.getState().setQueue([currentSong, ...songs]);
                  useQueueStore.getState().jumpToIndex(0);
                }
              }}>
                <Radio className="h-4 w-4" />
                Start Radio
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
        </div>
      </div>

      {/* Main Content - Desktop: Split Pane, Mobile: Stacked */}
      <div className="relative z-10 flex flex-1 flex-col md:flex-row gap-6 md:gap-12 overflow-hidden px-6 md:px-12 pb-6 md:pb-12">
        
        {/* Left Pane: Artwork + Info + Controls */}
        <div className={cn(
          "flex flex-shrink-0 flex-col justify-center gap-8 overflow-y-auto no-scrollbar transition-all duration-700 ease-out origin-left",
          isImmersiveMode ? "w-full md:w-[30%] md:max-w-[400px] scale-95" : "w-full md:w-[45%] md:max-w-[600px] scale-100"
        )}>
          {/* Artwork */}
          <motion.div
            key={currentSong.id}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-full max-w-[500px] aspect-square mx-auto rounded-[2rem] overflow-hidden group relative flex items-center justify-center bg-black/10 transition-shadow duration-1000"
            style={{ boxShadow: '0 8px 60px rgba(var(--theme-primary), 0.5), 0 0 120px rgba(var(--theme-primary), 0.25)' }}
          >
            <img
              src={artworkUrl}
              alt={currentSong.name}
              className="w-full h-full rounded-[2rem] object-contain"
            />
            
            {/* Artwork Overlay Controls */}
            <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={toggleImmersiveMode}
                className="p-3 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md shadow-lg transition-transform hover:scale-105 active:scale-95"
                aria-label={isImmersiveMode ? "Exit Fullscreen" : "Toggle Fullscreen"}
              >
                {isImmersiveMode ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              </button>
              
              {isImmersiveMode && (
                <button
                  onClick={() => setIsImmersiveMode(false)}
                  className="p-3 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md shadow-lg transition-transform hover:scale-105 active:scale-95"
                  aria-label="Exit Immersive Mode"
                >
                  <ChevronDown className="h-5 w-5" />
                </button>
              )}
            </div>
          </motion.div>

          {/* Controls Container */}
          <div className={cn(
            "w-full max-w-[500px] mx-auto transition-all duration-700 ease-out",
            isImmersiveMode ? "opacity-60 hover:opacity-100" : "opacity-100"
          )}>
            {/* Song Info Row */}
            <div className="mb-6 flex items-center justify-between">
              <div className="min-w-0">
                <motion.h2
                  key={currentSong.id + '-name'}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-2xl md:text-3xl font-bold text-white truncate mb-1"
                >
                  {currentSong.name}
                </motion.h2>
                <div className="flex items-center gap-2 text-base text-white/60 truncate">
                  <ArtistLinks artists={currentSong.artists} />
                  <span>•</span>
                  <span>{currentSong.album.name}</span>
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2 pl-4">
                <button
                  onClick={() => toggleLike(currentSong)}
                  className={cn('icon-btn', isLiked(currentSong.id) && 'active')}
                  aria-label={isLiked(currentSong.id) ? 'Unlike' : 'Like'}
                >
                  <Heart
                    className="h-6 w-6"
                    fill={isLiked(currentSong.id) ? 'currentColor' : 'none'}
                  />
                </button>
              </div>
            </div>

            <div className={cn(
              "transition-all duration-700 ease-out",
              isImmersiveMode ? "opacity-20 hover:opacity-100 blur-[1px] hover:blur-none" : "opacity-100"
            )}>
              {/* Progress Bar */}
            <div className="mb-6">
              <div className="progress-bar h-2" onClick={handleSeek}>
                <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                <div
                  className="progress-bar-thumb opacity-100 h-4 w-4"
                  style={{ left: `${progress}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs font-medium text-white/50 tabular-nums">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Main Controls */}
            <div className="flex items-center justify-between">
              {/* Left: Shuffle */}
              <button
                onClick={toggleShuffle}
                className={cn('icon-btn', isShuffled && 'active')}
                aria-label="Shuffle"
              >
                <Shuffle className="h-5 w-5" />
              </button>

              {/* Center: Prev / Play / Next */}
              <div className="flex items-center gap-6 md:gap-8">
                <button onClick={handlePrev} className="icon-btn hover:scale-110 active:scale-95 transition-transform" aria-label="Previous">
                  <SkipBack className="h-8 w-8" fill="currentColor" />
                </button>

                <button
                  onClick={togglePlay}
                  className="flex h-16 w-16 items-center justify-center rounded-full text-white shadow-[0_0_40px_rgba(var(--theme-primary),0.5)] transition-transform hover:scale-105 active:scale-95"
                  style={{ background: 'rgb(var(--theme-primary))' }}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="h-8 w-8" fill="currentColor" />
                  ) : (
                    <Play className="h-8 w-8 ml-1" fill="currentColor" />
                  )}
                </button>

                <button onClick={handleNext} className="icon-btn hover:scale-110 active:scale-95 transition-transform" aria-label="Next">
                  <SkipForward className="h-8 w-8" fill="currentColor" />
                </button>
              </div>

              {/* Right: Repeat + Volume */}
              <div className="flex items-center gap-2">
                <button
                  onClick={cycleRepeatMode}
                  className={cn('icon-btn', repeatMode !== 'off' && 'active')}
                  aria-label="Repeat"
                >
                  {repeatMode === 'one' ? (
                    <Repeat1 className="h-5 w-5" />
                  ) : (
                    <Repeat className="h-5 w-5" />
                  )}
                </button>

                <div className="hidden items-center gap-2 sm:flex pl-4">
                  <button
                    onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
                    className="icon-btn"
                    aria-label="Volume"
                  >
                    {volume === 0 ? (
                      <VolumeX className="h-5 w-5" />
                    ) : (
                      <Volume2 className="h-5 w-5" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="h-1.5 w-24 cursor-pointer appearance-none rounded-full bg-white/10 accent-theme-primary-light"
                  />
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* Right Pane: Tabs Content */}
        <div className={cn(
          "flex flex-col overflow-hidden transition-all duration-700 ease-out mt-8 md:mt-0 flex-1",
          isImmersiveMode ? "pl-0 md:pl-12" : "pl-0"
        )}>
          {/* Tab Headers */}
          {!isImmersiveMode && (
            <div className="mb-6 flex gap-8">
              {([
                { key: 'upnext' as const, label: 'UP NEXT' },
                { key: 'lyrics' as const, label: 'LYRICS' },
                { key: 'related' as const, label: 'RELATED' },
              ]).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'pb-3 pt-1 text-xs md:text-sm font-bold uppercase tracking-widest transition-all',
                    activeTab === tab.key
                      ? 'border-b-2 border-white text-white'
                      : 'border-b-2 border-transparent text-white/50 hover:text-white/80',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Tab Content */}
          <div className={cn("flex-1 overflow-y-auto no-scrollbar", activeTab === 'lyrics' && 'fade-mask-y')} ref={lyricsContainerRef}>
            <AnimatePresence mode="wait">
              {activeTab === 'upnext' && (
                <motion.div
                  key="upnext"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-1"
                >
                  {displayQueue.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-white/50">
                      <ListMusic className="mb-3 h-12 w-12 opacity-50" />
                      <p className="font-medium">Queue is empty</p>
                      <p className="text-sm">Play a song to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-1 pb-20">
                      {displayQueue.map((song, i) => {
                        const isPlayingNow = i === currentIndex;
                        const isPast = i < currentIndex;
                        
                        return (
                          <div
                            key={`${song.id}-${i}`}
                            className={cn(
                              "flex cursor-pointer items-center gap-6 p-2 transition-all duration-300 group",
                              isPlayingNow ? "scale-[1.02]" : isPast ? "opacity-20 hover:opacity-100" : "opacity-60 hover:opacity-100"
                            )}
                            onClick={() => handlePlayFromQueue(i)}
                          >
                            <div className="relative h-16 w-16 flex-shrink-0">
                              <img
                                src={getImageUrl(song.image, 'low')}
                                alt={song.name}
                                className={cn("h-full w-full rounded-xl object-cover shadow-2xl transition-all", isPlayingNow ? "opacity-100 shadow-[0_8px_30px_rgba(var(--theme-primary),0.3)]" : "opacity-80 group-hover:opacity-100")}
                              />
                              {isPlayingNow && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl backdrop-blur-sm">
                                  {isPlaying ? (
                                    <div className="flex h-5 items-end gap-[3px]">
                                      <div className="w-1.5 animate-pulse rounded-t-sm bg-white h-3" />
                                      <div className="w-1.5 animate-pulse rounded-t-sm bg-white h-5 delay-75" />
                                      <div className="w-1.5 animate-pulse rounded-t-sm bg-white h-2 delay-150" />
                                    </div>
                                  ) : (
                                    <Play className="h-6 w-6 text-white fill-current drop-shadow-lg" />
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1 py-2">
                              <p className={cn(
                                "truncate text-lg font-bold mb-1 transition-colors",
                                isPlayingNow ? "text-white text-shadow-glow" : "text-white/80 group-hover:text-white"
                              )}>
                                {song.name}
                              </p>
                              <p className="truncate text-sm text-white/60">
                                <ArtistLinks artists={song.artists} />
                              </p>
                            </div>
                            <span className="text-sm font-medium text-white/40 tabular-nums">
                              {formatTime(song.duration)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'lyrics' && (
                <motion.div
                  key="lyrics"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={cn(
                    "py-8 px-4 md:px-8",
                    isImmersiveMode ? "lyrics-immersive space-y-2" : "space-y-1"
                  )}
                >
                  {lyricsLoading ? (
                    <LyricsLoadingPanel song={currentSong} status={lyricsStatus} />
                  ) : lyrics?.synced ? (
                    <div className={cn(isImmersiveMode ? "space-y-4 pb-64" : "space-y-1 pb-32")}>
                      {lyrics.synced.lines.map((line, i) => (
                        <div
                          key={i}
                          data-lyric-index={i}
                          className={cn(
                            'lyrics-line',
                            i === activeLyricIndex && 'active',
                            i < activeLyricIndex && 'past',
                          )}
                          onClick={() => seek(line.timeMs / 1000)}
                        >
                          {line.text || '♪'}
                        </div>
                      ))}
                    </div>
                  ) : lyrics?.plain ? (
                    <div className={cn(
                      "whitespace-pre-wrap font-bold leading-relaxed text-white/80",
                      isImmersiveMode ? "text-2xl md:text-3xl pb-64" : "text-lg md:text-xl pb-32"
                    )}>
                      {lyrics.plain.text}
                    </div>
                  ) : (
                    <LyricsLoadingPanel song={currentSong} status="No lyrics found for this song." isError={true} />
                  )}
                </motion.div>
              )}

              {activeTab === 'related' && (
                <motion.div
                  key="related"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-2 pb-20"
                >
                  {relatedSongs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-white/50">
                      <Radio className="mb-3 h-12 w-12 opacity-50" />
                      <p className="font-medium">No related songs</p>
                    </div>
                  ) : (
                    relatedSongs.map((song) => (
                      <div
                        key={song.id}
                        className="flex cursor-pointer items-center gap-4 rounded-xl p-3 transition-all hover:bg-white/10"
                        onClick={() => handlePlayRelated(song)}
                      >
                        <img
                          src={getImageUrl(song.image, 'low')}
                          alt={song.name}
                          className="h-14 w-14 rounded-lg object-cover shadow-md"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-bold text-white">
                            {song.name}
                          </p>
                          <p className="truncate text-sm text-white/60">
                            <ArtistLinks artists={song.artists} />
                          </p>
                        </div>
                        <span className="text-sm font-medium text-white/40 tabular-nums">
                          {formatTime(song.duration)}
                        </span>
                      </div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Create Playlist Modal Overlay */}
      <AnimatePresence>
        {isCreatingPlaylist && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl border border-white/10 bg-surface-light p-6 shadow-2xl"
            >
              <h3 className="mb-4 text-lg font-semibold text-white">Create New Playlist</h3>
              <input
                autoFocus
                type="text"
                value={newPlaylistName}
                onChange={e => setNewPlaylistName(e.target.value)}
                onKeyDown={async e => {
                  if (e.key === 'Enter' && newPlaylistName.trim()) {
                    const id = await useLibraryStore.getState().createPlaylist(newPlaylistName.trim());
                    await useLibraryStore.getState().addToPlaylist(id, currentSong);
                    useLibraryStore.getState().getPlaylists().then(setUserPlaylists);
                    useUIStore.getState().addToast({ message: `Added to ${newPlaylistName.trim()}`, type: 'success' });
                    setIsCreatingPlaylist(false);
                    setNewPlaylistName('');
                  } else if (e.key === 'Escape') {
                    setIsCreatingPlaylist(false);
                  }
                }}
                placeholder="Playlist name"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-theme-primary transition-colors"
              />
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setIsCreatingPlaylist(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
                <button 
                  onClick={async () => {
                    if (!newPlaylistName.trim()) return;
                    const id = await useLibraryStore.getState().createPlaylist(newPlaylistName.trim());
                    await useLibraryStore.getState().addToPlaylist(id, currentSong);
                    useLibraryStore.getState().getPlaylists().then(setUserPlaylists);
                    useUIStore.getState().addToast({ message: `Added to ${newPlaylistName.trim()}`, type: 'success' });
                    setIsCreatingPlaylist(false);
                    setNewPlaylistName('');
                  }}
                  className="rounded-full bg-theme-primary px-6 py-2 text-sm font-medium text-white transition-transform hover:scale-105 active:scale-95"
                >
                  Create & Add
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
