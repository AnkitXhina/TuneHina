import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1,
  Volume2, VolumeX, ChevronDown, Heart, ListMusic, Mic2, Radio,
  MoreHorizontal, Disc3, Plus, Maximize2, Minimize2, Download, RefreshCw
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
import { getImageUrl, formatTime, cn, getDownloadUrl } from '../lib/utils';
import { ArtistLinks } from '../components/ui/ArtistLinks';

type NowPlayingTab = 'upnext' | 'lyrics' | 'details';

export default function NowPlayingPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<NowPlayingTab>('upnext');
  const [lyrics, setLyrics] = useState<LyricsResult | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(true);
  const [lyricsStatus, setLyricsStatus] = useState('Searching for lyrics...');
  const [isReloadingLyrics, setIsReloadingLyrics] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [activeLyricIndex, setActiveLyricIndex] = useState(-1);
  const [userPlaylists, setUserPlaylists] = useState<import('../services/db').UserPlaylist[]>([]);
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isImmersiveMode, setIsImmersiveMode] = useState(false);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  
  const progressBarRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lyricsTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [tooltipLeft, setTooltipLeft] = useState<number | null>(null);
  const [tooltipTime, setTooltipTime] = useState('');

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);
      if (!isFs) setIsImmersiveMode(false);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleImmersiveMode = async () => {
    const nextState = !isImmersiveMode;
    setIsImmersiveMode(nextState);
    if (nextState) {
      setActiveTab('lyrics');
      try {
        if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      } catch (err) {
        console.warn('Error toggling fullscreen', err);
      }
    } else {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
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
  const toggleMute = usePlayerStore(s => s.toggleMute);
  const togglePlay = usePlayerStore(s => s.togglePlay);
  const seek = usePlayerStore(s => s.seek);
  const playSong = usePlayerStore(s => s.playSong);
  const audioQuality = usePlayerStore(s => s.audioQuality);

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

  useEffect(() => {
    setNowPlayingOpen(true);
    return () => setNowPlayingOpen(false);
  }, [setNowPlayingOpen]);

  useEffect(() => {
    if (currentSong) {
      const artworkUrl = getImageUrl(currentSong.image, 'high');
      if (artworkUrl && !artworkUrl.includes('placeholder')) extractFromArtwork(artworkUrl);
      addToRecentlyPlayed(currentSong);
    }
  }, [currentSong?.id, extractFromArtwork, addToRecentlyPlayed]);

  useEffect(() => {
    return () => clearTimeout(lyricsTimerRef.current);
  }, []);

  const fetchLyrics = (forceReload = false) => {
    if (!currentSong) return;
    
    // Capture the exact song ID this fetch is for to prevent stale closure race conditions
    const songId = currentSong.id;
    
    if (forceReload) {
      setIsReloadingLyrics(true);
      lyricsManager.removeCacheEntry(songId);
    } else {
      setLyricsLoading(true);
    }
    
    setLyrics(null);
    
    // Safe status updater that dies if the song changes
    const updateStatus = (status: string) => {
      if (usePlayerStore.getState().currentSong?.id === songId) {
        setLyricsStatus(status);
      }
    };
    
    updateStatus(forceReload ? 'Refetching lyrics...' : 'Searching for lyrics...');
    clearTimeout(lyricsTimerRef.current);

    lyricsManager.getLyrics(currentSong, updateStatus).then((result) => {
      // If the user skipped to another song while this request was pending, ignore this result entirely!
      if (usePlayerStore.getState().currentSong?.id !== songId) return;

      if (result) {
        setLyrics(result);
        if (forceReload) setIsReloadingLyrics(false);
        else setLyricsLoading(false);
        clearTimeout(lyricsTimerRef.current);
      } else {
        lyricsTimerRef.current = setTimeout(() => {
          if (usePlayerStore.getState().currentSong?.id === songId) {
            updateStatus('No lyrics found for this song.');
            if (forceReload) setIsReloadingLyrics(false);
            else setLyricsLoading(false);
          }
        }, 9000);
      }
    }).catch(() => {
      if (usePlayerStore.getState().currentSong?.id !== songId) return;
      
      lyricsTimerRef.current = setTimeout(() => {
        if (usePlayerStore.getState().currentSong?.id === songId) {
          updateStatus('No lyrics found for this song.');
          if (forceReload) setIsReloadingLyrics(false);
          else setLyricsLoading(false);
        }
      }, 9000);
    });
  };

  useEffect(() => {
    fetchLyrics();
  }, [currentSong?.id]);

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

  useEffect(() => {
    useLibraryStore.getState().getPlaylists().then(setUserPlaylists);
  }, []);

  useEffect(() => {
    if (!lyrics?.synced) return;
    const lines = lyrics.synced.lines;
    const timeMs = currentTime * 1000;
    let idx = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (timeMs >= lines[i].timeMs) { idx = i; break; }
    }
    setActiveLyricIndex(idx);
  }, [currentTime, lyrics]);

  useEffect(() => {
    if (activeLyricIndex < 0 || !lyricsContainerRef.current) return;
    const container = lyricsContainerRef.current;
    const activeLine = container.querySelector(`[data-lyric-index="${activeLyricIndex}"]`);
    if (activeLine) activeLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeLyricIndex]);

  const handlePrev = () => {
    if (currentTime > 3) { seek(0); return; }
    const prev = playPrevious();
    if (prev) playSong(prev);
  };

  const handleNext = () => {
    const next = playNext();
    if (next) playSong(next);
  };

  const getPctFromEvent = (e: React.MouseEvent | MouseEvent) => {
    const el = progressBarRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  };

  const updateTooltip = (e: React.MouseEvent | MouseEvent) => {
    const el = progressBarRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setTooltipLeft(pct * 100);
    setTooltipTime(formatTime(pct * duration));
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    isDragging.current = true;
    progressBarRef.current?.classList.add('dragging');
    updateTooltip(e);

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      updateTooltip(ev);
      // Live scrub while dragging
      seek(getPctFromEvent(ev) * duration);
    };

    const onUp = (ev: MouseEvent) => {
      isDragging.current = false;
      progressBarRef.current?.classList.remove('dragging');
      seek(getPctFromEvent(ev) * duration);
      setTooltipLeft(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current) updateTooltip(e);
  };

  const handleMouseLeave = () => {
    if (!isDragging.current) setTooltipLeft(null);
  };

  const handleClose = () => {
    setNowPlayingOpen(false);
    navigate(-1);
  };

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
            if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
          } else {
            e.preventDefault();
            handleClose();
          }
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, isFullscreen, isImmersiveMode]);

  const handlePlayFromQueue = (index: number) => {
    const song = queue[index];
    if (song) {
      useQueueStore.getState().jumpToIndex(index);
      playSong(song);
    }
  };

  const handleDownload = async (song: Song) => {
    try {
      useUIStore.getState().addToast({ message: `Downloading ${song.name}...`, type: 'info' });
      const url = getDownloadUrl(song.downloadUrl, audioQuality);
      if (!url) {
        useUIStore.getState().addToast({ message: 'No download URL available', type: 'error' });
        return;
      }
      
      setDownloadProgress(0);
      const response = await fetch(url);
      const contentLength = response.headers.get('Content-Length');
      const total = contentLength ? parseInt(contentLength) : 0;
      const reader = response.body!.getReader();
      const chunks: Uint8Array<ArrayBuffer>[] = [];
      let received = 0;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (total) setDownloadProgress(Math.round((received / total) * 100));
      }
      
      const blob = new Blob(chunks);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${song.name}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      setDownloadProgress(null);
      useUIStore.getState().addToast({ message: `Downloaded ${song.name}!`, type: 'success' });
    } catch (e) {
      console.error('Download failed', e);
      setDownloadProgress(null);
      useUIStore.getState().addToast({ message: `Failed to download ${song.name}`, type: 'error' });
    }
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
  const displayQueue = queue;

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-black/10 backdrop-blur-[80px] transition-colors duration-1000"
      tabIndex={-1}
      onClick={() => (document.activeElement as HTMLElement)?.blur()}
    >

      {/* ── Header ── */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-5 pb-3">
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
                <DropdownMenu.Item
                  className="flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-2 outline-none hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white"
                  onSelect={() => {
                    addToQueue(currentSong);
                    useUIStore.getState().addToast({ message: 'Added to queue', type: 'success' });
                  }}
                >
                  <ListMusic className="h-4 w-4" />
                  Add to Queue
                </DropdownMenu.Item>

                <DropdownMenu.Item
                  className="flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-2 outline-none hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white"
                  onSelect={(e) => { e.preventDefault(); toggleLike(currentSong); }}
                >
                  <Heart className="h-4 w-4" fill={isLiked(currentSong.id) ? 'currentColor' : 'none'} />
                  {isLiked(currentSong.id) ? 'Unlike Song' : 'Like Song'}
                </DropdownMenu.Item>

                <DropdownMenu.Item
                  className="flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-2 outline-none hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white"
                  onSelect={(e) => {
                    e.preventDefault();
                    if (downloadProgress === null) handleDownload(currentSong);
                  }}
                >
                  {downloadProgress !== null ? (
                    <span className="text-xs font-medium w-4 text-center">{downloadProgress}%</span>
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {downloadProgress !== null ? 'Downloading...' : 'Download'}
                </DropdownMenu.Item>

                <DropdownMenu.Sub>
                  <DropdownMenu.SubTrigger className="flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-2 outline-none hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white data-[state=open]:bg-white/10 data-[state=open]:text-white">
                    <ListMusic className="h-4 w-4" />
                    <span className="flex-1">Add to Playlist</span>
                  </DropdownMenu.SubTrigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.SubContent
                      className="z-[60] w-48 rounded-xl border border-white/10 bg-surface-light p-1.5 text-sm text-gray-200 shadow-2xl animate-in slide-in-from-left-1"
                      sideOffset={2} alignOffset={-5}
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
                        <div className="px-2 py-2 text-xs text-gray-500 text-center">No playlists yet</div>
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

                <DropdownMenu.Item
                  className="flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-2 outline-none hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white"
                  onSelect={() => { useUIStore.getState().setNowPlayingOpen(false); navigate(`/album/${currentSong.album.id}`); }}
                >
                  <Disc3 className="h-4 w-4" />
                  View Album
                </DropdownMenu.Item>

                <DropdownMenu.Item
                  className="flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-2 outline-none hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white"
                  onSelect={() => {
                    const artist = currentSong.artists.primary[0] || currentSong.artists.all[0];
                    if (artist) { useUIStore.getState().setNowPlayingOpen(false); navigate(`/artist/${artist.id}`); }
                  }}
                >
                  <Mic2 className="h-4 w-4" />
                  View Artist
                </DropdownMenu.Item>

                <DropdownMenu.Separator className="my-1 h-px bg-white/10" />

                <DropdownMenu.Item
                  className="flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-2 outline-none hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white"
                  onSelect={async () => {
                    useUIStore.getState().addToast({ message: 'Starting radio...', type: 'info' });
                    const provider = getMusicProvider();
                    const songs = await provider.getSuggestions(currentSong.id, 50);
                    if (songs.length > 0) {
                      const shuffled = [...songs].sort(() => Math.random() - 0.5);
                      useQueueStore.getState().setQueue([currentSong, ...shuffled]);
                      useQueueStore.getState().jumpToIndex(0);
                      useUIStore.getState().addToast({ message: `Radio started — ${songs.length} songs queued`, type: 'success' });
                    }
                  }}
                >
                  <Radio className="h-4 w-4" />
                  Start Radio
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="relative z-10 flex flex-1 flex-col md:flex-row gap-6 md:gap-10 overflow-hidden px-6 md:px-10 pb-4 md:pb-6 min-h-0">

        {/* ── Left Pane: Artwork + Info + Controls ── */}
        <div className={cn(
          'flex flex-shrink-0 flex-col items-center justify-center gap-4 min-h-0 overflow-hidden transition-all duration-700 ease-out origin-left',
          isImmersiveMode
            ? 'w-full md:w-[35%] md:max-w-[420px] scale-95'
            : 'w-full md:w-[45%] md:max-w-[480px] scale-100'
        )}>

          {/* ── Artwork ── */}
          <motion.div
            key={currentSong.id}
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="flex items-center justify-center w-full"
          >
            {/*
              Key fix: explicit square size via CSS min() so it never
              overflows vertically. max-w drives desktop, 42vw drives
              smaller screens. aspect-square is the fallback for browsers
              that don't support min() in inline styles.
            */}
            <div
              className="relative group rounded-2xl overflow-hidden flex-shrink-0"
              style={{
                width: 'min(300px, 42vw)',
                height: 'min(300px, 42vw)',
                boxShadow: '0 8px 48px rgba(var(--theme-primary), 0.45), 0 0 100px rgba(var(--theme-primary), 0.2)',
              }}
            >
              {/* Album art */}
              <img
                src={artworkUrl}
                alt={currentSong.name}
                className="w-full h-full object-cover"
              />

              {/* Hover dark tint */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-250 pointer-events-none" />

              {/* Expand / immersive button — appears top-right on hover */}
              <button
                onClick={toggleImmersiveMode}
                className="absolute top-2.5 right-2.5 p-2 rounded-full bg-black/55 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/75 z-10"
                aria-label={isImmersiveMode ? 'Exit immersive' : 'Expand to immersive'}
              >
                {isImmersiveMode
                  ? <Minimize2 className="h-4 w-4" />
                  : <Maximize2 className="h-4 w-4" />}
              </button>
            </div>
          </motion.div>

          {/* ── Controls Container ── */}
          <div className={cn(
            'w-full mx-auto transition-all duration-700 ease-out',
            isImmersiveMode ? 'opacity-50 hover:opacity-100' : 'opacity-100'
          )}
            style={{ maxWidth: 'min(300px, 42vw)' }}
          >
            {/* Song Info */}
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <motion.h2
                  key={currentSong.id + '-name'}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xl md:text-2xl font-bold text-white truncate leading-tight"
                >
                  {currentSong.name}
                </motion.h2>
                <div className="flex items-center gap-1.5 text-sm mt-0.5 text-white/55 truncate">
                  <ArtistLinks artists={currentSong.artists} />
                  <span>•</span>
                  <span className="truncate">{currentSong.album.name}</span>
                </div>
              </div>
              <button
                onClick={() => toggleLike(currentSong)}
                className={cn('icon-btn flex-shrink-0', isLiked(currentSong.id) && 'active')}
                aria-label={isLiked(currentSong.id) ? 'Unlike' : 'Like'}
              >
                <Heart className="h-6 w-6" fill={isLiked(currentSong.id) ? 'currentColor' : 'none'} />
              </button>
            </div>

            <div className={cn(
              'transition-all duration-700 ease-out',
              isImmersiveMode ? 'opacity-35 hover:opacity-100' : 'opacity-100'
            )}>
              {/* Progress Bar */}
              <div className="mb-3">
                <div
                  className="h-5 flex flex-col justify-center cursor-pointer group"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="progress-bar" ref={progressBarRef}>
                    {/* Tooltip */}
                    {tooltipLeft !== null && (
                      <div className="seek-tooltip" style={{ left: `${tooltipLeft}%` }}>
                        {tooltipTime}
                      </div>
                    )}

                    {/* Fill */}
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${progress}%` }}
                    />

                    {/* Thumb */}
                    <div
                      className="progress-bar-thumb"
                      style={{ left: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="mt-1 flex justify-between text-xs font-medium text-white/45 tabular-nums">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center justify-between">
                {/* Shuffle */}
                <button onClick={toggleShuffle} className={cn('icon-btn', isShuffled && 'active')} aria-label="Shuffle">
                  <Shuffle className="h-5 w-5" />
                </button>

                {/* Prev / Play / Next */}
                <div className="flex items-center gap-5">
                  <button onClick={handlePrev} className="icon-btn hover:scale-110 active:scale-95 transition-transform" aria-label="Previous">
                    <SkipBack className="h-7 w-7" fill="currentColor" />
                  </button>
                  <button
                    onClick={togglePlay}
                    className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_0_36px_rgba(var(--theme-primary),0.5)] transition-transform hover:scale-105 active:scale-95"
                    style={{ background: 'rgb(var(--theme-primary))' }}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying
                      ? <Pause className="h-7 w-7" fill="currentColor" />
                      : <Play className="h-7 w-7 ml-0.5" fill="currentColor" />}
                  </button>
                  <button onClick={handleNext} className="icon-btn hover:scale-110 active:scale-95 transition-transform" aria-label="Next">
                    <SkipForward className="h-7 w-7" fill="currentColor" />
                  </button>
                </div>

                {/* Repeat + Volume */}
                <div className="flex items-center gap-2">
                  <button onClick={cycleRepeatMode} className={cn('icon-btn', repeatMode !== 'off' && 'active')} aria-label="Repeat">
                    {repeatMode === 'one' ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
                  </button>
                  <div className="relative hidden sm:flex items-center pl-3">
                    <button
                      onClick={toggleMute}
                      className="icon-btn"
                      aria-label="Volume"
                    >
                      {volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Pane: Tabs ── */}
        <div className={cn(
          'flex flex-col overflow-hidden transition-all duration-700 ease-out mt-6 md:mt-0 flex-1 min-h-0',
          isImmersiveMode ? 'pl-0 md:pl-10' : 'pl-0'
        )}>
          {/* Tab Headers */}
          {!isImmersiveMode && (
            <div className="mb-5 flex border-b border-white/10 flex-shrink-0">
              {([
                { key: 'upnext' as const, label: 'UP NEXT' },
                { key: 'lyrics' as const, label: 'LYRICS' },
                { key: 'details' as const, label: 'DETAILS' },
              ]).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'flex-1 border-b-2 py-4 text-center text-sm font-bold uppercase tracking-wider transition-colors',
                    activeTab === tab.key
                      ? 'border-white text-white'
                      : 'border-transparent text-white/50 hover:text-white/80'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Tab Content */}
          <div
            className={cn('flex-1 overflow-y-auto no-scrollbar min-h-0', activeTab === 'lyrics' && 'fade-mask-y')}
            ref={lyricsContainerRef}
          >
            <AnimatePresence mode="wait">

              {/* UP NEXT */}
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
                              'flex cursor-pointer items-center gap-4 p-2 rounded-xl transition-all duration-300 group',
                              isPlayingNow
                                ? 'scale-[1.02] bg-white/5'
                                : isPast
                                  ? 'opacity-25 hover:opacity-100 hover:bg-white/5'
                                  : 'opacity-55 hover:opacity-100 hover:bg-white/5'
                            )}
                            onClick={() => handlePlayFromQueue(i)}
                          >
                            <div className="relative h-14 w-14 flex-shrink-0">
                              <img
                                src={getImageUrl(song.image, 'low')}
                                alt={song.name}
                                className={cn(
                                  'h-full w-full rounded-xl object-cover shadow-xl transition-all',
                                  isPlayingNow
                                    ? 'opacity-100 shadow-[0_6px_24px_rgba(var(--theme-primary),0.35)]'
                                    : 'opacity-75 group-hover:opacity-100'
                                )}
                              />
                              {isPlayingNow && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/25 rounded-xl backdrop-blur-sm">
                                  {isPlaying ? (
                                    <div className="flex h-5 items-end gap-[3px]">
                                      <div className="w-1.5 animate-pulse rounded-t-sm bg-white h-3" />
                                      <div className="w-1.5 animate-pulse rounded-t-sm bg-white h-5 delay-75" />
                                      <div className="w-1.5 animate-pulse rounded-t-sm bg-white h-2 delay-150" />
                                    </div>
                                  ) : (
                                    <Play className="h-5 w-5 text-white fill-current drop-shadow-lg" />
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1 py-1">
                              <p className={cn(
                                'truncate text-base font-semibold mb-0.5 transition-colors',
                                isPlayingNow ? 'text-white' : 'text-white/80 group-hover:text-white'
                              )}>
                                {song.name}
                              </p>
                              <p className="truncate text-sm text-white/55">
                                <ArtistLinks artists={song.artists} />
                              </p>
                            </div>
                            <span className="text-sm font-medium text-white/35 tabular-nums flex-shrink-0">
                              {formatTime(song.duration)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {/* LYRICS */}
              {activeTab === 'lyrics' && (
                <motion.div
                  key="lyrics"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={cn(
                    'py-8 px-4 md:px-8 relative',
                    isImmersiveMode ? 'lyrics-immersive space-y-2' : 'space-y-1'
                  )}
                >
                  <button 
                    onClick={() => fetchLyrics(true)}
                    disabled={isReloadingLyrics}
                    className="absolute top-2 right-4 md:right-8 z-10 p-2 text-white/40 hover:text-white/80 transition-colors"
                    title="Reload Lyrics"
                  >
                    <RefreshCw className={cn("h-4 w-4", isReloadingLyrics && "animate-spin")} />
                  </button>

                  {lyricsLoading && !isReloadingLyrics ? (
                    <LyricsLoadingPanel 
                      song={currentSong} 
                      status={lyricsStatus} 
                      onRetry={() => fetchLyrics(true)}
                      isRetrying={isReloadingLyrics}
                    />
                  ) : lyrics?.synced ? (
                    <div className={cn(isImmersiveMode ? 'space-y-4 pb-64' : 'space-y-1 pb-32')}>
                      {lyrics.synced.lines.map((line, i) => (
                        <div
                          key={i}
                          data-lyric-index={i}
                          className={cn('lyrics-line', i === activeLyricIndex && 'active', i < activeLyricIndex && 'past')}
                          onClick={() => seek(line.timeMs / 1000)}
                        >
                          {line.text || '♪'}
                        </div>
                      ))}
                    </div>
                  ) : lyrics?.plain ? (
                    <div className={cn(
                      'whitespace-pre-wrap font-bold leading-relaxed text-white/80',
                      isImmersiveMode ? 'text-lg md:text-xl pb-64' : 'text-lg md:text-xl pb-32'
                    )}>
                      {lyrics.plain.text}
                    </div>
                  ) : (
                    <LyricsLoadingPanel 
                      song={currentSong} 
                      status="No lyrics found for this song." 
                      isError={true} 
                      onRetry={() => fetchLyrics(true)}
                      isRetrying={isReloadingLyrics}
                    />
                  )}
                </motion.div>
              )}

              {/* DETAILS */}
              {activeTab === 'details' && (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-0 pb-20"
                >
                  <div className="flex justify-between py-3 border-b border-white/5">
                    <span className="text-white/40 text-sm">Album</span>
                    <span className="text-white text-sm font-medium hover:underline cursor-pointer" onClick={() => { setNowPlayingOpen(false); navigate(`/album/${currentSong.album.id}`); }}>
                      {currentSong.album.name}
                    </span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-white/5">
                    <span className="text-white/40 text-sm">Artists</span>
                    <span className="text-white text-sm font-medium">
                      <ArtistLinks artists={currentSong.artists} />
                    </span>
                  </div>
                  {currentSong.language && (
                    <div className="flex justify-between py-3 border-b border-white/5">
                      <span className="text-white/40 text-sm">Language</span>
                      <span className="text-white text-sm font-medium capitalize">{currentSong.language}</span>
                    </div>
                  )}
                  {(currentSong.releaseDate || currentSong.year) && (
                    <div className="flex justify-between py-3 border-b border-white/5">
                      <span className="text-white/40 text-sm">Released</span>
                      <span className="text-white text-sm font-medium">{currentSong.releaseDate || currentSong.year}</span>
                    </div>
                  )}
                  {currentSong.label && (
                    <div className="flex justify-between py-3 border-b border-white/5">
                      <span className="text-white/40 text-sm">Label</span>
                      <span className="text-white text-sm font-medium">{currentSong.label}</span>
                    </div>
                  )}
                  {currentSong.playCount && (
                    <div className="flex justify-between py-3 border-b border-white/5">
                      <span className="text-white/40 text-sm">Play Count</span>
                      <span className="text-white text-sm font-medium">{parseInt(currentSong.playCount).toLocaleString()}</span>
                    </div>
                  )}
                  {currentSong.explicitContent && (
                    <div className="flex justify-between py-3 border-b border-white/5">
                      <span className="text-white/40 text-sm">Explicit</span>
                      <span className="text-white text-sm font-medium flex items-center justify-end">
                        <span className="inline-flex items-center justify-center rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-bold text-white uppercase leading-none">E</span>
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-3 border-b border-white/5">
                    <span className="text-white/40 text-sm">Quality</span>
                    <span className="text-white text-sm font-medium uppercase">{audioQuality}</span>
                  </div>
                  {currentSong.copyright && (
                    <div className="mt-6 text-center text-xs text-white/30">
                      {currentSong.copyright}
                    </div>
                  )}
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Create Playlist Modal ── */}
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
                <button
                  onClick={() => setIsCreatingPlaylist(false)}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
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