import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../../stores/playerStore';
import { getImageUrl } from '../../lib/utils';

export function GlobalBackground() {
  const currentSong = usePlayerStore(s => s.currentSong);
  const artworkUrl = currentSong ? getImageUrl(currentSong.image, 'high') : null;

  return (
    <AnimatePresence mode="popLayout">
      {artworkUrl ? (
        <motion.div
          key={artworkUrl}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
          className="fixed inset-0 z-[-100] pointer-events-none overflow-hidden"
          style={{ backgroundColor: 'rgb(var(--background))' }}
        >
          {/* Color wash layer — large soft gradients from theme colors */}
          <div className="absolute inset-0 transition-all duration-1000"
               style={{ background: 'radial-gradient(ellipse 80% 60% at 20% 30%, rgba(var(--theme-primary), 0.65), transparent), radial-gradient(ellipse 70% 50% at 80% 70%, rgba(var(--theme-accent), 0.55), transparent), radial-gradient(ellipse 90% 70% at 50% 50%, rgba(var(--theme-secondary), 0.45), transparent)' }} />

          {/* Animated blobs for movement — use opacity, not blend modes */}
          <div className="absolute top-[-25%] left-[-15%] w-[70vw] h-[70vw] rounded-full opacity-70 blur-[120px] md:blur-[200px] animate-blob transition-colors duration-1000"
               style={{ backgroundColor: 'rgb(var(--theme-primary))' }} />
          <div className="absolute top-[15%] right-[-20%] w-[60vw] h-[60vw] rounded-full opacity-55 blur-[120px] md:blur-[200px] animate-blob animation-delay-2000 transition-colors duration-1000"
               style={{ backgroundColor: 'rgb(var(--theme-accent))' }} />
          <div className="absolute bottom-[-25%] left-[15%] w-[80vw] h-[80vw] rounded-full opacity-50 blur-[120px] md:blur-[200px] animate-blob animation-delay-4000 transition-colors duration-1000"
               style={{ backgroundColor: 'rgb(var(--theme-secondary))' }} />

          {/* Artwork reflection — bleeds the actual image into the room */}
          <div 
            className="absolute inset-[-30%] bg-cover bg-center bg-no-repeat opacity-25 blur-[120px] saturate-200 transition-all duration-1000"
            style={{ backgroundImage: `url(${artworkUrl})` }}
          />
        </motion.div>
      ) : (
        <div className="fixed inset-0 z-[-100] pointer-events-none bg-background transition-colors duration-1000" />
      )}
    </AnimatePresence>
  );
}
