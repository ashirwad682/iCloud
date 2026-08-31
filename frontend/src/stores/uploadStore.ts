import { create } from 'zustand';
import { UploadItem, Media } from '../types';
import { api } from '../services/api';

interface UploadState {
  queue: UploadItem[];
  isOpen: boolean;
  isMinimized: boolean;
  activeUploadsCount: number;
  addFiles: (files: File[], albumId?: string, isHidden?: boolean) => void;
  updateItem: (id: string, updates: Partial<UploadItem>) => void;
  removeItem: (id: string) => void;
  clearCompleted: () => void;
  setIsOpen: (isOpen: boolean) => void;
  setIsMinimized: (isMinimized: boolean) => void;
  processQueue: () => void;
  startUpload: (item: UploadItem) => Promise<void>;
}

// 6 Parallel Upload Workers for Maximum Throughput
const MAX_CONCURRENT_UPLOADS = 6;

export const useUploadStore = create<UploadState>((set, get) => ({
  queue: [],
  isOpen: false,
  isMinimized: false,
  activeUploadsCount: 0,

  setIsOpen: (isOpen) => set({ isOpen }),
  setIsMinimized: (isMinimized) => set({ isMinimized }),

  addFiles: (files, albumId, isHidden) => {
    const newItems: UploadItem[] = files.map((file) => ({
      id: Math.random().toString(36).substring(2, 9) + '-' + Date.now(),
      file,
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'PENDING',
      albumId,
      isHidden,
    }));

    set((state) => ({
      queue: [...state.queue, ...newItems],
      isOpen: true,
      isMinimized: false,
    }));

    // Trigger concurrent queue processor
    get().processQueue();
  },

  processQueue: () => {
    const { queue, activeUploadsCount, startUpload } = get();
    if (activeUploadsCount >= MAX_CONCURRENT_UPLOADS) return;

    const pendingItems = queue.filter((item) => item.status === 'PENDING');
    const availableSlots = MAX_CONCURRENT_UPLOADS - activeUploadsCount;
    const itemsToStart = pendingItems.slice(0, availableSlots);

    itemsToStart.forEach((item) => {
      startUpload(item);
    });
  },

  updateItem: (id, updates) => {
    set((state) => ({
      queue: state.queue.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    }));
  },

  removeItem: (id) => {
    set((state) => ({
      queue: state.queue.filter((item) => item.id !== id),
    }));
  },

  clearCompleted: () => {
    set((state) => ({
      queue: state.queue.filter((item) => item.status !== 'COMPLETED' && item.status !== 'FAILED'),
    }));
  },

  startUpload: async (item: UploadItem) => {
    set((state) => ({ activeUploadsCount: state.activeUploadsCount + 1 }));
    get().updateItem(item.id, { status: 'UPLOADING', progress: 10 });

    try {
      const formData = new FormData();
      formData.append('file', item.file);
      if (item.albumId) {
        formData.append('albumId', item.albumId);
      }
      if (item.isHidden) {
        formData.append('isHidden', 'true');
      }

      const res = await api.post('/uploads/direct', formData, {
        onUploadProgress: (progressEvent: any) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            get().updateItem(item.id, { progress: Math.min(percent, 98) });
          }
        },
      });



      if (res.data?.success) {
        get().updateItem(item.id, {
          progress: 100,
          status: 'COMPLETED',
          media: res.data.data.media,
        });
        window.dispatchEvent(
          new CustomEvent('cv_media_uploaded', {
            detail: { media: res.data.data.media, albumId: item.albumId, isHidden: item.isHidden },
          })
        );
      }
    } catch (err: any) {
      get().updateItem(item.id, {
        status: 'FAILED',
        error: err.response?.data?.error?.message || 'Upload failed',
      });
    } finally {
      set((state) => ({ activeUploadsCount: Math.max(0, state.activeUploadsCount - 1) }));
      // Process next in queue immediately
      get().processQueue();
    }
  },
}));
