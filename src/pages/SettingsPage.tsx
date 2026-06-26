import { usePlayerStore } from '../stores/playerStore';
import { lyricsManager } from '../providers/lyrics/LyricsManager';
import { Volume2, Info, ChevronDown, Check, Sliders } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

const QUALITIES = [
  { value: '320kbps', label: 'Very High (320kbps)' },
  { value: '160kbps', label: 'High (160kbps)' },
  { value: '96kbps', label: 'Medium (96kbps)' },
  { value: '48kbps', label: 'Low (48kbps)' },
];

export default function SettingsPage() {
  const quality = usePlayerStore(s => s.audioQuality);
  const setQuality = usePlayerStore(s => s.setAudioQuality);
  const normalizeVolume = usePlayerStore(s => s.normalizeVolume);
  const setNormalizeVolume = usePlayerStore(s => s.setNormalizeVolume);
  const crossfade = usePlayerStore(s => s.crossfade);
  const setCrossfade = usePlayerStore(s => s.setCrossfade);

  return (
    <div className="p-8 pb-32 max-w-2xl">
      <h1 className="mb-8 text-3xl font-bold text-white">Settings</h1>

      <div className="space-y-6">
        {/* Audio Quality */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
          <div className="flex items-center gap-3 mb-4">
            <Volume2 className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">Audio Quality</h2>
          </div>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition-colors hover:border-white/20 focus:border-theme-primary data-[state=open]:border-theme-primary">
              <span>{QUALITIES.find(q => q.value === quality)?.label}</span>
              <ChevronDown className="h-5 w-5 text-gray-400" />
            </DropdownMenu.Trigger>
            
            <DropdownMenu.Portal>
              <DropdownMenu.Content 
                className="z-50 w-[var(--radix-dropdown-menu-trigger-width)] min-w-[200px] overflow-hidden rounded-xl border border-white/10 bg-surface-light p-1.5 shadow-2xl animate-in fade-in-80 zoom-in-95"
                sideOffset={4}
              >
                {QUALITIES.map((q) => (
                  <DropdownMenu.Item
                    key={q.value}
                    onSelect={() => setQuality(q.value)}
                    className="flex cursor-pointer select-none items-center justify-between rounded-md px-3 py-2.5 text-sm text-gray-200 outline-none hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white"
                  >
                    {q.label}
                    {quality === q.value && <Check className="h-4 w-4 text-theme-primary" />}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
          <p className="mt-4 text-xs text-gray-500">
            * Theme adapts automatically to album artwork based on the current playing track.
          </p>
        </div>

        {/* Playback */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
          <div className="flex items-center gap-3 mb-4">
            <Sliders className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">Playback</h2>
          </div>
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium text-white">Normalize Volume</p>
                <p className="text-xs text-gray-400 mt-0.5">Maintain consistent volume across different songs</p>
              </div>
              <button 
                onClick={() => setNormalizeVolume(!normalizeVolume)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${normalizeVolume ? 'bg-theme-primary' : 'bg-white/10'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${normalizeVolume ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium text-white">Crossfade</p>
                <p className="text-xs text-gray-400 mt-0.5">Smoothly transition between songs</p>
              </div>
              <button 
                onClick={() => setCrossfade(!crossfade)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${crossfade ? 'bg-theme-primary' : 'bg-white/10'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${crossfade ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </label>
          </div>
        </div>



        {/* About */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
          <div className="flex items-center gap-3 mb-4">
            <Info className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">About</h2>
          </div>
          <p className="text-sm text-gray-400">
            TuneHina v1.0.0 — A modern music streaming experience.
          </p>
          <p className="mt-2 text-xs text-gray-500 mb-6">
            Built with React, TypeScript, and ❤️
          </p>
          <div className="pt-6 border-t border-white/5">
            <button
              onClick={async () => {
                const confirmed = window.confirm('This will clear all your data including library, downloads, recently played and settings. Are you sure?');
                if (confirmed) {
                  // Clear localStorage
                  localStorage.clear();
                  
                  // Clear IndexedDB
                  try {
                    const dbs = await indexedDB.databases();
                    await Promise.all(dbs.map(db => indexedDB.deleteDatabase(db.name!)));
                  } catch (e) {
                    console.warn('Failed to clear indexedDB', e);
                  }
                  
                  // Clear lyrics cache
                  lyricsManager.clearCache();
                  
                  // Reload the app
                  window.location.reload();
                }
              }}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-medium rounded-lg transition-colors border border-red-500/20"
            >
              Clear All Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
