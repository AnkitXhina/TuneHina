import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateId } from '../lib/utils';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  isMobile: boolean;
  isOffline: boolean;
  nowPlayingOpen: boolean;
  activeModal: string | null;
  toasts: Toast[];

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setIsMobile: (isMobile: boolean) => void;
  setIsOffline: (isOffline: boolean) => void;
  setNowPlayingOpen: (open: boolean) => void;
  openModal: (id: string) => void;
  closeModal: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      sidebarCollapsed: false,
      isMobile: false,
      isOffline: false,
      nowPlayingOpen: false,
      activeModal: null,
      toasts: [],

      toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setIsMobile: (isMobile) => set({ isMobile }),
      setIsOffline: (isOffline) => set({ isOffline }),
      setNowPlayingOpen: (open) => set({ nowPlayingOpen: open }),
      openModal: (id) => set({ activeModal: id }),
      closeModal: () => set({ activeModal: null }),

      addToast: (toast) => {
        const id = generateId();
        const newToast: Toast = { ...toast, id };
        set({ toasts: [...get().toasts, newToast] });

        const duration = toast.duration ?? 3000;
        if (duration > 0) {
          setTimeout(() => get().removeToast(id), duration);
        }
      },

      removeToast: (id) => {
        set({ toasts: get().toasts.filter(t => t.id !== id) });
      },
    }),
    {
      name: 'tunehina-ui',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    },
  ),
);
