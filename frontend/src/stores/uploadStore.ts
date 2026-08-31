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

// Helper to read blob chunk as Base64
function readChunkAsBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(blob);
  });
}

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
    get().updateItem(item.id, { status: 'UPLOADING', progress: 5 });

    try {
      const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunk (well under Vercel's 4.5MB limit)
      let mediaResult: any = null;

      if (item.file.size <= 3.5 * 1024 * 1024) {
        // Direct Fast Upload
        const formData = new FormData();
        formData.append('file', item.file);
        if (item.albumId) formData.append('albumId', item.albumId);
        if (item.isHidden) formData.append('isHidden', 'true');

        const res = await api.post('/uploads/direct', formData, {
          onUploadProgress: (progressEvent: any) => {
            if (progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              get().updateItem(item.id, { progress: Math.min(percent, 98) });
            }
          },
        });

        if (res.data?.success) {
          mediaResult = res.data.data.media;
        }
      } else {
        // Large File Chunked Upload (for large videos / high-res photos)
        const totalParts = Math.ceil(item.file.size / CHUNK_SIZE);
        const uploadId = Math.random().toString(36).substring(2, 11) + '-' + Date.now();

        for (let part = 1; part <= totalParts; part++) {
          const start = (part - 1) * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, item.file.size);
          const chunkBlob = item.file.slice(start, end);
          const chunkBase64 = await readChunkAsBase64(chunkBlob);

          const res = await api.post('/uploads/chunk', {
            uploadId,
            originalName: item.file.name,
            mimeType: item.file.type || 'application/octet-stream',
            size: item.file.size,
            partNumber: part,
            totalParts,
            chunkBase64,
            albumId: item.albumId,
            isHidden: item.isHidden,
          });

          const currentProgress = Math.round((part / totalParts) * 98);
          get().updateItem(item.id, { progress: currentProgress });

          if (res.data?.data?.isComplete) {
            mediaResult = res.data.data.media;
          }
        }
      }

      if (mediaResult) {
        get().updateItem(item.id, {
          progress: 100,
          status: 'COMPLETED',
          media: mediaResult,
        });
        window.dispatchEvent(
          new CustomEvent('cv_media_uploaded', {
            detail: { media: mediaResult, albumId: item.albumId, isHidden: item.isHidden },
          })
        );
      }
    } catch (err: any) {
      get().updateItem(item.id, {
        status: 'FAILED',
        error: err.response?.data?.error?.message || err.message || 'Upload failed',
      });
    } finally {
      set((state) => ({ activeUploadsCount: Math.max(0, state.activeUploadsCount - 1) }));
      // Process next in queue immediately
      get().processQueue();
    }
  },
}));

