import { useState, useEffect } from 'react';
import { X, Plus, ListMusic, Music } from 'lucide-react';
import { getImageUrl } from '../../lib/utils';
import { useLibraryStore } from '../../stores/libraryStore';
import { useUIStore } from '../../stores/uiStore';
import type { UserPlaylist } from '../../services/db';

export function PlaylistPickerModal() {
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { closeModal, playlistTargetSong, addToast } = useUIStore();
  const { getPlaylists, createPlaylist, addToPlaylist } = useLibraryStore();

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    setIsLoading(true);
    const lists = await getPlaylists();
    setPlaylists(lists);
    setIsLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim() || !playlistTargetSong) return;

    try {
      const id = await createPlaylist(newPlaylistName.trim());
      
      const songs = Array.isArray(playlistTargetSong) ? playlistTargetSong : [playlistTargetSong];
      for (const song of songs) {
        await addToPlaylist(id, song);
      }
      
      addToast({ message: `Created '${newPlaylistName}' and added song${songs.length > 1 ? 's' : ''}`, type: 'success' });
      closeModal();
    } catch (err) {
      addToast({ message: 'Failed to create playlist', type: 'error' });
    }
  };

  const handleSelect = async (playlist: UserPlaylist) => {
    if (!playlistTargetSong) return;

    try {
      const songs = Array.isArray(playlistTargetSong) ? playlistTargetSong : [playlistTargetSong];
      for (const song of songs) {
        await addToPlaylist(playlist.id, song);
      }

      addToast({ message: `Added to ${playlist.name}`, type: 'success' });
      closeModal();
    } catch (err) {
      addToast({ message: `Failed to add to ${playlist.name}`, type: 'error' });
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in p-4"
      onClick={closeModal}
    >
      <div 
        className="w-full max-w-sm rounded-2xl bg-[#1a1a24] border border-white/10 shadow-2xl animate-in zoom-in-95 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <h2 className="text-lg font-bold text-white">Save to Playlist</h2>
          <button 
            onClick={closeModal}
            className="rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto max-h-[60vh]">
          {/* Create New */}
          {isCreating ? (
            <form onSubmit={handleCreate} className="mb-6 space-y-3">
              <input
                autoFocus
                type="text"
                placeholder="Playlist name"
                className="w-full rounded-xl border border-white/20 bg-black/20 px-4 py-3 text-sm text-white placeholder-white/40 focus:border-theme-primary focus:outline-none"
                value={newPlaylistName}
                onChange={e => setNewPlaylistName(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="flex-1 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newPlaylistName.trim()}
                  className="flex-1 rounded-xl bg-theme-primary px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50 transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="mb-4 flex w-full items-center gap-3 rounded-xl border border-dashed border-white/20 bg-white/5 p-4 text-left transition-colors hover:border-theme-primary hover:bg-white/10 group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 group-hover:bg-theme-primary transition-colors">
                <Plus className="h-5 w-5 text-white" />
              </div>
              <span className="font-medium text-white">New Playlist</span>
            </button>
          )}

          {/* Playlist List */}
          <div className="space-y-1">
            {isLoading ? (
              <div className="py-8 text-center text-sm text-white/50">Loading...</div>
            ) : playlists.length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center text-white/50">
                <ListMusic className="h-10 w-10 mb-3 opacity-50" />
                <p className="text-sm">No playlists yet</p>
              </div>
            ) : (
              playlists.map(playlist => (
                <button
                  key={playlist.id}
                  onClick={() => handleSelect(playlist)}
                  className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-white/10 group"
                >
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-white/5 overflow-hidden group-hover:bg-white/10">
                    {playlist.songs && playlist.songs.length >= 4 ? (
                      <div className="grid grid-cols-2 w-full h-full">
                        {playlist.songs.slice(0, 4).map((song, i) => (
                          <img key={i} src={getImageUrl(song.image, 'low')} className="w-full h-full object-cover" />
                        ))}
                      </div>
                    ) : playlist.songs && playlist.songs.length > 0 ? (
                      <img src={getImageUrl(playlist.songs[0].image, 'low')} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-white/5">
                        <Music className="h-6 w-6 text-white/50 group-hover:text-theme-primary transition-colors" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium text-white">{playlist.name}</p>
                    <p className="truncate text-xs text-white/50">
                      {playlist.songIds.length} song{playlist.songIds.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
