import { create } from 'zustand';
import { Media } from '../types';

interface UIState {
  // Sidebar
  isSidebarOpen: boolean;
  toggleSidebar: () => void;

  // Zoom & View layout
  zoomLevel: number; // 1 (smallest) to 5 (largest)
  setZoomLevel: (zoom: number) => void;
  gridMode: 'square' | 'aspect';
  toggleGridMode: () => void;
  setGridMode: (mode: 'square' | 'aspect') => void;

  // Multi-select
  selectedMediaIds: string[];
  toggleSelect: (id: string) => void;
  setSelectedMediaIds: (ids: string[]) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;

  // Media Viewer
  viewerMedia: Media | null;
  viewerMediaList: Media[];
  setViewerMedia: (media: Media | null, list?: Media[]) => void;
  nextMedia: () => void;
  prevMedia: () => void;

  // Search & Filters
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  dateFilter: string | null;
  setDateFilter: (filter: string | null) => void;

  // Global Theme
  theme: 'dark' | 'light';
  toggleTheme: () => void;

  // Modals
  isShareModalOpen: boolean;
  shareTarget: { type: 'MEDIA' | 'ALBUM' | 'BATCH'; id?: string; ids?: string[] } | null;
  openShareModal: (target: { type: 'MEDIA' | 'ALBUM' | 'BATCH'; id?: string; ids?: string[] }) => void;
  closeShareModal: () => void;

  isAddToAlbumModalOpen: boolean;
  albumTargetMediaIds: string[];
  openAddToAlbumModal: (mediaIds: string[]) => void;
  closeAddToAlbumModal: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  zoomLevel: 3, // Default 5 columns
  setZoomLevel: (zoomLevel) => set({ zoomLevel }),
  gridMode: 'square',
  toggleGridMode: () =>
    set((state) => ({ gridMode: state.gridMode === 'square' ? 'aspect' : 'square' })),
  setGridMode: (gridMode) => set({ gridMode }),

  selectedMediaIds: [],

  toggleSelect: (id) => {
    set((state) => {
      const exists = state.selectedMediaIds.includes(id);
      return {
        selectedMediaIds: exists
          ? state.selectedMediaIds.filter((item) => item !== id)
          : [...state.selectedMediaIds, id],
      };
    });
  },

  setSelectedMediaIds: (ids) => set({ selectedMediaIds: ids }),
  selectAll: (ids) => set({ selectedMediaIds: ids }),
  clearSelection: () => set({ selectedMediaIds: [] }),

  viewerMedia: null,
  viewerMediaList: [],

  setViewerMedia: (media, list = []) => {
    set({ viewerMedia: media, viewerMediaList: list });
  },

  nextMedia: () => {
    const { viewerMedia, viewerMediaList } = get();
    if (!viewerMedia || viewerMediaList.length === 0) return;
    const currentIndex = viewerMediaList.findIndex((m) => m._id === viewerMedia._id);
    if (currentIndex !== -1 && currentIndex < viewerMediaList.length - 1) {
      set({ viewerMedia: viewerMediaList[currentIndex + 1] });
    }
  },

  prevMedia: () => {
    const { viewerMedia, viewerMediaList } = get();
    if (!viewerMedia || viewerMediaList.length === 0) return;
    const currentIndex = viewerMediaList.findIndex((m) => m._id === viewerMedia._id);
    if (currentIndex > 0) {
      set({ viewerMedia: viewerMediaList[currentIndex - 1] });
    }
  },

  searchQuery: '',
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  dateFilter: null,
  setDateFilter: (dateFilter) => set({ dateFilter }),

  theme: (localStorage.getItem('cv_theme') as 'dark' | 'light') || 'light',
  toggleTheme: () => {
    set((state) => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('cv_theme', nextTheme);
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
      return { theme: nextTheme };
    });
  },

  isShareModalOpen: false,
  shareTarget: null,
  openShareModal: (target) => set({ isShareModalOpen: true, shareTarget: target }),
  closeShareModal: () => set({ isShareModalOpen: false, shareTarget: null }),

  isAddToAlbumModalOpen: false,
  albumTargetMediaIds: [],
  openAddToAlbumModal: (mediaIds) =>
    set({ isAddToAlbumModalOpen: true, albumTargetMediaIds: mediaIds }),
  closeAddToAlbumModal: () =>
    set({ isAddToAlbumModalOpen: false, albumTargetMediaIds: [] }),
}));
