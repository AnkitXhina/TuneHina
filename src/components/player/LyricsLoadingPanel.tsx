import { motion, AnimatePresence } from 'framer-motion';
import { Disc3, RefreshCw } from 'lucide-react';
import type { Song } from '../../types/music';
import { getImageUrl } from '../../lib/utils';
import { ArtistLinks } from '../ui/ArtistLinks';

interface LyricsLoadingPanelProps {
  song: Song;
  status: string;
  isError?: boolean;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export function LyricsLoadingPanel({ song, status, isError, onRetry, isRetrying }: LyricsLoadingPanelProps) {
  const artworkUrl = getImageUrl(song.image, 'medium');

  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mb-8 relative"
      >
        {artworkUrl ? (
          <img
            src={artworkUrl}
            alt={song.name}
            className="h-48 w-48 rounded-2xl object-cover shadow-2xl shadow-black/50"
          />
        ) : (
          <div className="flex h-48 w-48 items-center justify-center rounded-2xl bg-white/5 shadow-2xl">
            <Disc3 className="h-16 w-16 text-gray-500" />
          </div>
        )}
        
        {(!isError || isRetrying) && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white" />
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <h3 className="mb-2 text-2xl font-bold text-white">{song.name}</h3>
        <p className="mb-8 text-lg text-gray-400"><ArtistLinks artists={song.artists} /></p>

        <AnimatePresence mode="wait">
          <div className="flex items-center justify-center gap-2">
            <motion.p
              key={status}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`text-sm font-medium ${isError ? 'text-gray-400' : 'text-theme-primary-light animate-pulse'}`}
            >
              {status}
            </motion.p>
            {isError && onRetry && (
              <button 
                onClick={onRetry}
                disabled={isRetrying}
                className="p-1.5 text-white/40 hover:text-white/80 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
