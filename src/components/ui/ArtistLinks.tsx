import { Link } from 'react-router-dom';
import type { Artist } from '../../types/music';

interface ArtistLinksProps {
  artists: { primary: Artist[]; featured: Artist[]; all: Artist[] };
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function ArtistLinks({ artists, className = '', onClick }: ArtistLinksProps) {
  const allArtists = [...artists.primary, ...artists.featured];
  
  if (allArtists.length === 0) {
    return <span className={className}>Unknown Artist</span>;
  }

  return (
    <span className={className}>
      {allArtists.map((artist, index) => {
        // Synthetic IDs are generated from strings and are non-numeric. 
        // We render these as plain text to avoid weird hover URLs on Search results.
        const isSyntheticId = isNaN(Number(artist.id));

        return (
          <span key={artist.id}>
            {isSyntheticId ? (
              <span>{artist.name}</span>
            ) : (
              <Link
                to={`/artist/${artist.id}`}
                className="hover:underline hover:text-theme-primary-light transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick?.(e);
                }}
              >
                {artist.name}
              </Link>
            )}
            {index < allArtists.length - 1 && ', '}
          </span>
        );
      })}
    </span>
  );
}
