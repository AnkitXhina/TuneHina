import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home, Search, Library,
  Settings, ChevronLeft, ChevronRight, Music2,
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
        'fixed left-0 top-0 z-40 flex h-full flex-col border-r border-white/5 bg-black/20 backdrop-blur-3xl transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
        currentSong ? 'pb-[72px]' : ''
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex h-16 items-center gap-3 border-b border-white/5 px-4 cursor-pointer',
          collapsed && 'justify-center px-0',
        )}
        onClick={() => navigate('/')}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-pink-500">
          <Music2 className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight gradient-text">
            TuneHina
          </span>
        )}
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
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </div>


      </nav>

      {/* Settings & Collapse */}
      <div className="border-t border-white/5 p-2">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn('sidebar-item', isActive && 'active', collapsed && 'justify-center px-0')
          }
        >
          <Settings className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
        </NavLink>

        <button
          onClick={() => setSidebarCollapsed(!collapsed)}
          className={cn('sidebar-item w-full', collapsed && 'justify-center px-0')}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5 flex-shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
