import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, ArrowLeft, Heart, MoreHorizontal, Disc3 } from 'lucide-react';
import type { Artist, Song, Album } from '../types/music';
import { usePlayerStore } from '../stores/playerStore';
import { useQueueStore } from '../stores/queueStore';
import { getMusicProvider } from '../providers/music';
import { getImageUrl, formatTime } from '../lib/utils';
import { ArtistLinks } from '../components/ui/ArtistLinks';
import { Link } from 'react-router-dom';

export default function ArtistPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const playSong = usePlayerStore(s => s.playSong);
  const setQueue = useQueueStore(s => s.setQueue);

  useEffect(() => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    const fetchArtistData = async () => {
      let actualId = id;
      const provider = getMusicProvider();

      try {
        let artistData;
        
        try {
          artistData = await provider.getArtist(actualId);
        } catch (e) {
          // If fetching by ID fails, it might be a name. Try searching.
          const searchData = await provider.search(id);
          const firstArtist = searchData.artists?.results?.[0];
          if (firstArtist) {
            actualId = firstArtist.id;
            window.history.replaceState(null, '', `/artist/${actualId}`);
            artistData = await provider.getArtist(actualId);
          } else {
            throw new Error('Artist not found');
          }
        }

        const [songsData, albumsData] = await Promise.all([
          provider.getArtistSongs(actualId).catch(() => []),
          provider.getArtistAlbums(actualId).catch(() => [])
        ]);

        if (!artistData || !artistData.name) {
          throw new Error('Artist not found');
        }

        setArtist(artistData);
        setSongs(songsData || []);
        setAlbums(albumsData || []);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError('Failed to load artist');
        setLoading(false);
      }
    };

    fetchArtistData();
  }, [id]);

  const handlePlayAll = () => {
    if (songs.length > 0) {
      setQueue(songs);
      playSong(songs[0]);
    }
  };

  const handlePlaySong = (song: Song, index: number) => {
    setQueue(songs);
    useQueueStore.getState().jumpToIndex(index);
    playSong(song);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-theme-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !artist) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-gray-400">
        <Disc3 className="h-12 w-12" />
        <p>{error || 'Artist not found'}</p>
        <button
          onClick={() => navigate(-1)}
          className="rounded-full bg-white/10 px-6 py-2 text-white hover:bg-white/20 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  const imageUrl = getImageUrl(artist.image, 'high');

  return (
    <div className="flex-1 overflow-y-auto pb-32">
      {/* Header section with gradient background */}
      <div className="relative flex min-h-[300px] flex-col justify-end px-8 py-8 md:flex-row md:items-end md:gap-8">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent z-10" />
          {imageUrl && (
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full object-cover opacity-30 blur-sm"
            />
          )}
        </div>

        <button
          onClick={() => navigate(-1)}
          className="absolute left-8 top-8 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-transform hover:scale-110"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="relative z-20 flex flex-col items-center gap-6 md:flex-row md:items-end">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={artist.name}
              className="h-48 w-48 rounded-full object-cover shadow-2xl md:h-56 md:w-56"
            />
          ) : (
            <div className="flex h-48 w-48 items-center justify-center rounded-full bg-surface-light shadow-2xl md:h-56 md:w-56">
              <Disc3 className="h-20 w-20 text-gray-500" />
            </div>
          )}
          
          <div className="flex flex-col items-center text-center md:items-start md:text-left">
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-theme-primary-light">
              Artist
            </p>
            <h1 className="text-balance text-4xl font-black text-white md:text-6xl lg:text-7xl">
              {artist.name}
            </h1>
            <p className="mt-4 text-sm text-gray-300">
              {artist.followerCount ? `${parseInt(artist.followerCount).toLocaleString()} Followers` : 'Popular Artist'}
            </p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-6 px-8 py-6">
        <button
          onClick={handlePlayAll}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-theme-primary text-white shadow-xl shadow-theme-primary/30 transition-transform hover:scale-105 active:scale-95"
        >
          <Play className="h-6 w-6 ml-1" fill="currentColor" />
        </button>
        <button className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white transition-colors hover:border-white">
          <Heart className="h-5 w-5" />
        </button>
        <button className="flex h-10 w-10 items-center justify-center rounded-full text-gray-400 transition-colors hover:text-white">
          <MoreHorizontal className="h-6 w-6" />
        </button>
      </div>

      {/* Content */}
      <div className="px-8 space-y-12">
        {songs.length > 0 && (
          <section>
            <h2 className="section-title">Top Songs</h2>
            <div className="grid gap-2">
              {songs.slice(0, 5).map((song, i) => (
                <div
                  key={song.id}
                  className="group flex cursor-pointer items-center gap-4 rounded-xl p-2 transition-colors hover:bg-white/5"
                  onClick={() => handlePlaySong(song, i)}
                >
                  <div className="w-6 text-center text-sm font-medium text-gray-500 group-hover:hidden">
                    {i + 1}
                  </div>
                  <div className="hidden w-6 items-center justify-center text-white group-hover:flex">
                    <Play className="h-4 w-4" fill="currentColor" />
                  </div>
                  <img
                    src={getImageUrl(song.image, 'low')}
                    alt={song.name}
                    className="h-10 w-10 rounded object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="truncate font-medium text-white">{song.name}</h3>
                    <p className="truncate text-sm text-gray-400"><ArtistLinks artists={song.artists} /></p>
                  </div>
                  <div className="text-sm text-gray-400 tabular-nums">
                    {formatTime(song.duration)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {albums.length > 0 && (
          <section>
            <h2 className="section-title">Top Albums</h2>
            <div className="flex overflow-x-auto pb-6 -mx-8 px-8 gap-4 no-scrollbar">
              {albums.map((album) => (
                <Link key={album.id} to={`/album/${album.id}`} className="w-36 sm:w-48 shrink-0 media-card block">
                  <div className="aspect-square w-full rounded-xl overflow-hidden bg-white/5">
                    <img
                      src={getImageUrl(album.image, 'high')}
                      alt={album.name}
                      className="media-card-image h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="mt-3 px-1">
                    <p className="truncate text-sm font-medium text-white">{album.name}</p>
                    <p className="truncate text-xs text-gray-400">
                      <ArtistLinks artists={album.artists} />
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
