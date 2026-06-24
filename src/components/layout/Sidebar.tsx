import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home, Search, Library,
  Settings, Menu,
} from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { usePlayerStore } from '../../stores/playerStore';
import { cn } from '../../lib/utils';

const mainNavItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/search', icon: Search, label: 'Search' },
  { path: '/library', icon: Library, label: 'Library' },
];

export function Sidebar() {
  const collapsed = useUIStore(s => s.sidebarCollapsed);
  const setSidebarCollapsed = useUIStore(s => s.setSidebarCollapsed);
  const currentSong = usePlayerStore(s => s.currentSong);
  const navigate = useNavigate();

  return (
    <aside
      className={cn(
        'hidden md:flex fixed left-0 top-0 z-40 h-full flex-col border-r border-white/5 bg-black/20 backdrop-blur-3xl transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-64',
        currentSong ? 'pb-[72px]' : ''
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex h-16 items-center border-b border-white/5 transition-all duration-300 overflow-hidden',
          collapsed ? 'px-1 gap-1' : 'px-4 gap-3'
        )}
      >
        <button
          onClick={() => setSidebarCollapsed(!collapsed)}
          className="p-1 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0 text-white/70 hover:text-white"
          aria-label="Toggle Sidebar"
        >
          <Menu className={cn("transition-all duration-300", collapsed ? "h-6 w-6" : "h-5 w-5")} />
        </button>
        
        <div 
          className="flex items-center gap-3 cursor-pointer overflow-hidden"
          onClick={() => navigate('/')}
        >
          <img
            src="/icon-transparent.svg"
            alt="TuneHina"
            className={cn(
              "object-contain drop-shadow-lg flex-shrink-0 transition-all duration-300",
              collapsed ? "h-8 w-8" : "h-[34px] w-[34px]"
            )}
          />
          <span 
            className={cn(
              "text-[22px] font-semibold text-white truncate transition-all duration-300",
              collapsed ? "opacity-0 w-0" : "opacity-100 w-full"
            )}
            style={{ 
              fontFamily: "'Inter', sans-serif", 
              letterSpacing: '-0.01em',
              lineHeight: 1
            }}
          >
            TuneHina
          </span>
        </div>
      </div>


      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 no-scrollbar">
        <div className="space-y-1 px-2">
          {mainNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'sidebar-item',
                  isActive && 'active',
                  collapsed && 'justify-center px-0',
                )
              }
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span className={cn(
                "truncate transition-all duration-300",
                collapsed ? "opacity-0 w-0 hidden" : "opacity-100 w-auto"
              )}>
                {item.label}
              </span>
            </NavLink>
          ))}
        </div>


      </nav>

      {/* Settings */}
      <div className="border-t border-white/5 p-2">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn('sidebar-item', isActive && 'active', collapsed && 'justify-center px-0')
          }
        >
          <Settings className="h-5 w-5 flex-shrink-0" />
          <span className={cn(
            "truncate transition-all duration-300",
            collapsed ? "opacity-0 w-0 hidden" : "opacity-100 w-auto"
          )}>
            Settings
          </span>
        </NavLink>
      </div>
    </aside>
  );
}
