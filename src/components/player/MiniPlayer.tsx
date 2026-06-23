import { useNavigate } from 'react-router-dom';
import { Play, Pause, SkipBack, SkipForward, ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePlayerStore } from '../../stores/playerStore';
import { useQueueStore } from '../../stores/queueStore';
import { useUIStore } from '../../stores/uiStore';
import { getImageUrl, formatTime } from '../../lib/utils';
import { ArtistLinks } from '../ui/ArtistLinks';

export function MiniPlayer() {
  const currentSong = usePlayerStore(s => s.currentSong);
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const currentTime = usePlayerStore(s => s.currentTime);
  const duration = usePlayerStore(s => s.duration);
  const togglePlay = usePlayerStore(s => s.togglePlay);
  const playNext = useQueueStore(s => s.playNext);
  const playPrevious = useQueueStore(s => s.playPrevious);
  const playSong = usePlayerStore(s => s.playSong);
  const setNowPlayingOpen = useUIStore(s => s.setNowPlayingOpen);
  const navigate = useNavigate();

  if (!currentSong) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const artworkUrl = getImageUrl(currentSong.image, 'medium');

  const handlePrev = () => {
    const prev = playPrevious();
    if (prev) playSong(prev);
  };

  const handleNext = () => {
    const next = playNext();
    if (next) playSong(next);
  };

  const handleExpand = () => {
    setNowPlayingOpen(true);
    navigate('/now-playing');
  };

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="mini-player"
    >
      {/* Progress bar */}
      <div className="absolute left-0 right-0 top-0 h-0.5" style={{ background: 'rgba(255, 255, 255, 0.15)' }}>
        <div
          className="h-full transition-all duration-100 ease-linear"
          style={{
            width: `${progress}%`,
            background: 'rgb(var(--theme-primary))',
          }}
        />
      </div>

      <div className="flex h-[72px] items-center gap-4 px-4">
        {/* Song Info */}
        <div
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3"
          onClick={handleExpand}
        >
          <img
            src={artworkUrl}
            alt={currentSong.name}
            className="h-12 w-12 rounded-lg object-cover shadow-lg"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">
              {currentSong.name}
            </p>
            <p className="truncate text-xs text-gray-400">
              <ArtistLinks artists={currentSong.artists} />
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button onClick={handlePrev} className="icon-btn" aria-label="Previous">
            <SkipBack className="h-5 w-5" fill="currentColor" />
          </button>

          <button
            onClick={togglePlay}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-all hover:scale-105"
            style={{ background: 'rgb(var(--theme-primary))' }}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" fill="currentColor" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" fill="currentColor" />
            )}
          </button>

          <button onClick={handleNext} className="icon-btn" aria-label="Next">
            <SkipForward className="h-5 w-5" fill="currentColor" />
          </button>
        </div>

        {/* Time + Expand */}
        <div className="hidden items-center gap-3 sm:flex">
          <span className="text-xs text-gray-400 tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <button onClick={handleExpand} className="icon-btn" aria-label="Expand">
            <ChevronUp className="h-5 w-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
