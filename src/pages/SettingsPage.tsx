import { usePlayerStore } from '../stores/playerStore';
import { Volume2, Palette, HardDrive, Info, ChevronDown, Check } from 'lucide-react';
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

  return (
    <div className="p-8 max-w-2xl">
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
        </div>

        {/* Theme */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
          <div className="flex items-center gap-3 mb-4">
            <Palette className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">Theme</h2>
          </div>
          <p className="text-sm text-gray-400">
            Dynamic colors are extracted from album artwork automatically.
            The theme adapts to whatever song you&apos;re listening to.
          </p>
        </div>

        {/* Storage */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
          <div className="flex items-center gap-3 mb-4">
            <HardDrive className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">Storage</h2>
          </div>
          <p className="text-sm text-gray-400">
            Downloaded songs and cached data are stored locally in your browser.
          </p>
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
          <p className="mt-2 text-xs text-gray-500">
            Built with React, TypeScript, and ❤️
          </p>
        </div>
      </div>
    </div>
  );
}
