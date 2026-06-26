import { create } from 'zustand';
import type { SearchResult } from '../types/music';
import { getMusicProvider } from '../providers/music';

type SearchTab = 'all' | 'songs' | 'albums' | 'artists' | 'playlists';

interface SearchState {
  query: string;
  results: SearchResult | null;
  isSearching: boolean;
  searchHistory: string[];
  activeTab: SearchTab;

  setQuery: (query: string) => void;
  search: (query: string) => Promise<void>;
  clearResults: () => void;
  setActiveTab: (tab: SearchTab) => void;
  addToHistory: (query: string) => void;
  clearHistory: () => void;
}

export const useSearchStore = create<SearchState>()((set, get) => ({
  query: '',
  results: null,
  isSearching: false,
  searchHistory: JSON.parse(localStorage.getItem('tunehina-search-history') || '[]'),
  activeTab: 'all',

  setQuery: (query: string) => set({ query }),

  search: async (query: string) => {
    if (!query.trim()) {
      set({ results: null, isSearching: false });
      return;
    }

    set({ isSearching: true, query, results: null });

    try {
      const provider = getMusicProvider();
      // Fetch global search and first 24 albums simultaneously
      const [results, albums] = await Promise.all([
        provider.search(query),
        provider.searchAlbums(query, 1, 24)
      ]);
      
      // Merge full albums back into results
      if (results) {
        results.albums = {
          position: results.albums?.position || 0,
          results: albums,
          total: albums.length
        };
        
        if (results.songs?.results) {
          results.songs.results = await Promise.all(
            results.songs.results.map(song => provider.getSong(song.id).catch(() => song))
          );
        }
      }
      
      set({ results, isSearching: false });
    } catch (error) {
      console.error('[Search] failed:', error);
      set({ isSearching: false });
    }
  },

  clearResults: () => set({ results: null, query: '' }),

  setActiveTab: (tab: SearchTab) => set({ activeTab: tab }),

  addToHistory: (query: string) => {
    const { searchHistory } = get();
    const filtered = searchHistory.filter(q => q.toLowerCase() !== query.toLowerCase());
    const updated = [query, ...filtered].slice(0, 20);
    set({ searchHistory: updated });
    localStorage.setItem('tunehina-search-history', JSON.stringify(updated));
  },

  clearHistory: () => {
    set({ searchHistory: [] });
    localStorage.removeItem('tunehina-search-history');
  },
}));
