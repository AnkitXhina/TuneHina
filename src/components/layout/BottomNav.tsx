import { NavLink } from 'react-router-dom';
import { Home, Search, Library, Settings } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useUIStore } from '../../stores/uiStore';

const bottomNavItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/search', icon: Search, label: 'Search' },
  { path: '/library', icon: Library, label: 'Library' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export function BottomNav() {
  const nowPlayingOpen = useUIStore(s => s.nowPlayingOpen);

  if (nowPlayingOpen) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 h-[64px] bg-black/40 backdrop-blur-3xl border-t border-white/10 md:hidden flex items-center justify-around px-2 pb-safe">
      {bottomNavItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === '/'}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center w-full h-full text-[10px] font-medium gap-1 transition-colors',
              isActive ? 'text-theme-primary' : 'text-gray-400 hover:text-white'
            )
          }
        >
          <item.icon className="h-5 w-5 mb-0.5" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
