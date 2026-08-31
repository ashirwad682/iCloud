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
  retryItem: (id: string) => void;
  clearCompleted: () => void;
  setIsOpen: (isOpen: boolean) => void;
  setIsMinimized: (isMinimized: boolean) => void;
  processQueue: () => void;
  startUpload: (item: UploadItem) => Promise<void>;
}

// 4 Parallel File Upload Workers
const MAX_CONCURRENT_FILES = 4;
// 3 Parallel Chunk Upload Streams per large file
const MAX_CONCURRENT_CHUNKS = 3;
// 2.5MB Chunk size (optimal throughput under Vercel 4.5MB ceiling)
const CHUNK_SIZE = 2.5 * 1024 * 1024;

function detectMimeType(file: File): string {
  if (file.type && file.type !== 'application/octet-stream' && file.type !== 'binary/octet-stream') {
    return file.type;
  }
  const name = file.name.toLowerCase();
  if (/\.(mp4|m4v)$/i.test(name)) return 'video/mp4';
  if (/\.mov$/i.test(name)) return 'video/quicktime';
  if (/\.webm$/i.test(name)) return 'video/webm';
  if (/\.mkv$/i.test(name)) return 'video/x-matroska';
  if (/\.avi$/i.test(name)) return 'video/x-msvideo';
  if (/\.3gp$/i.test(name)) return 'video/3gpp';
  if (/\.flv$/i.test(name)) return 'video/x-flv';
  if (/\.(jpg|jpeg)$/i.test(name)) return 'image/jpeg';
  if (/\.png$/i.test(name)) return 'image/png';
  if (/\.webp$/i.test(name)) return 'image/webp';
  if (/\.gif$/i.test(name)) return 'image/gif';
  if (/\.svg$/i.test(name)) return 'image/svg+xml';
  if (/\.(heic|heif)$/i.test(name)) return 'image/heic';
  if (/\.avif$/i.test(name)) return 'image/avif';
  return file.type || 'application/octet-stream';
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
      uploadedBytes: 0,
      status: 'PENDING',
      albumId,
      isHidden,
    }));

    set((state) => ({
      queue: [...state.queue, ...newItems],
      isOpen: true,
      isMinimized: false,
    }));

    get().processQueue();
  },

  processQueue: () => {
    const { queue, activeUploadsCount, startUpload } = get();
    if (activeUploadsCount >= MAX_CONCURRENT_FILES) return;

    const pendingItems = queue.filter((item) => item.status === 'PENDING');
    const availableSlots = MAX_CONCURRENT_FILES - activeUploadsCount;
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

  retryItem: (id) => {
    const item = get().queue.find((i) => i.id === id);
    if (item) {
      get().updateItem(id, { status: 'PENDING', progress: 0, error: undefined });
      get().processQueue();
    }
  },

  clearCompleted: () => {
    set((state) => ({
      queue: state.queue.filter((item) => item.status !== 'COMPLETED' && item.status !== 'FAILED'),
    }));
  },

  startUpload: async (item: UploadItem) => {
    set((state) => ({ activeUploadsCount: state.activeUploadsCount + 1 }));
    get().updateItem(item.id, {
      status: 'UPLOADING',
      progress: 2,
      uploadedBytes: 0,
      error: undefined,
    });

    const startTime = Date.now();
    const mimeType = detectMimeType(item.file);

    try {
      let mediaResult: any = null;

      // Mode 1: Fast Direct Upload for smaller media (<= 3.5MB)
      if (item.file.size <= 3.5 * 1024 * 1024) {
        const formData = new FormData();
        formData.append('file', item.file);
        if (item.albumId) formData.append('albumId', item.albumId);
        if (item.isHidden) formData.append('isHidden', 'true');

        const res = await api.post('/uploads/direct', formData, {
          onUploadProgress: (progressEvent: any) => {
            if (progressEvent.total) {
              const loaded = progressEvent.loaded || 0;
              const percent = Math.min(Math.round((loaded * 100) / progressEvent.total), 98);
              const elapsedSec = (Date.now() - startTime) / 1000;
              const speed = elapsedSec > 0 ? loaded / elapsedSec : 0;
              const remainingBytes = Math.max(0, item.file.size - loaded);
              const timeRemaining = speed > 0 ? Math.round(remainingBytes / speed) : 0;

              get().updateItem(item.id, {
                progress: percent,
                uploadedBytes: loaded,
                speedBytesPerSec: speed,
                timeRemainingSec: timeRemaining,
              });
            }
          },
        });

        if (res.data?.success) {
          mediaResult = res.data.data.media;
        }
      } else {
        // Mode 2: High-Speed Multi-Chunk Parallel Streaming (for large videos / high-res RAW photos)
        const totalParts = Math.ceil(item.file.size / CHUNK_SIZE);
        const uploadId = Math.random().toString(36).substring(2, 11) + '-' + Date.now();
        const partBytesLoaded: { [part: number]: number } = {};

        // Helper for single chunk upload with automatic retry
        const uploadSingleChunk = async (part: number, retriesLeft = 3): Promise<any> => {
          const start = (part - 1) * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, item.file.size);
          const chunkBlob = item.file.slice(start, end);
          const chunkSize = end - start;

          const chunkFormData = new FormData();
          chunkFormData.append('chunk', chunkBlob, `chunk-${part}.bin`);
          chunkFormData.append('uploadId', uploadId);
          chunkFormData.append('originalName', item.file.name);
          chunkFormData.append('mimeType', mimeType);
          chunkFormData.append('size', item.file.size.toString());
          chunkFormData.append('partNumber', part.toString());
          chunkFormData.append('totalParts', totalParts.toString());
          if (item.albumId) chunkFormData.append('albumId', item.albumId);
          if (item.isHidden) chunkFormData.append('isHidden', 'true');

          try {
            const res = await api.post('/uploads/chunk', chunkFormData, {
              onUploadProgress: (progressEvent: any) => {
                const loaded = progressEvent.loaded || 0;
                partBytesLoaded[part] = Math.min(loaded, chunkSize);

                // Aggregate across all parts in progress
                const totalLoaded = Object.values(partBytesLoaded).reduce((a, b) => a + b, 0);
                const percent = Math.min(Math.round((totalLoaded / item.file.size) * 98), 98);
                const elapsedSec = (Date.now() - startTime) / 1000;
                const speed = elapsedSec > 0 ? totalLoaded / elapsedSec : 0;
                const remainingBytes = Math.max(0, item.file.size - totalLoaded);
                const timeRemaining = speed > 0 ? Math.round(remainingBytes / speed) : 0;

                get().updateItem(item.id, {
                  progress: percent,
                  uploadedBytes: totalLoaded,
                  speedBytesPerSec: speed,
                  timeRemainingSec: timeRemaining,
                });
              },
            });
            return res.data;
          } catch (err) {
            if (retriesLeft > 0) {
              await new Promise((r) => setTimeout(r, 600 * (4 - retriesLeft)));
              return uploadSingleChunk(part, retriesLeft - 1);
            }
            throw err;
          }
        };

        // Execute chunks using parallel worker pool
        const partsQueue = Array.from({ length: totalParts }, (_, i) => i + 1);

        const worker = async () => {
          while (partsQueue.length > 0) {
            const part = partsQueue.shift();
            if (part !== undefined) {
              await uploadSingleChunk(part);
            }
          }
        };

        const activeWorkers = Array.from(
          { length: Math.min(MAX_CONCURRENT_CHUNKS, totalParts) },
          () => worker()
        );
        await Promise.all(activeWorkers);

        // Mark as processing while assembling
        get().updateItem(item.id, {
          status: 'PROCESSING',
          progress: 99,
        });

        // Finalize assembly on backend
        const completeRes = await api.post('/uploads/complete-chunked', {
          uploadId,
          originalName: item.file.name,
          mimeType,
          size: item.file.size,
          albumId: item.albumId,
          isHidden: item.isHidden,
        });

        if (completeRes.data?.success && completeRes.data?.data?.media) {
          mediaResult = completeRes.data.data.media;
        } else {
          throw new Error('Upload finalization failed on server.');
        }
      }

      if (mediaResult) {
        get().updateItem(item.id, {
          progress: 100,
          uploadedBytes: item.file.size,
          speedBytesPerSec: undefined,
          timeRemainingSec: 0,
          status: 'COMPLETED',
          media: mediaResult,
        });

        // Trigger optimistic refresh across active gallery & album views
        window.dispatchEvent(
          new CustomEvent('cv_media_uploaded', {
            detail: { media: mediaResult, albumId: item.albumId, isHidden: item.isHidden },
          })
        );
      } else {
        throw new Error('Upload completed without media response.');
      }
    } catch (err: any) {
      get().updateItem(item.id, {
        status: 'FAILED',
        error: err.response?.data?.error?.message || err.message || 'Upload failed',
      });
    } finally {
      set((state) => ({ activeUploadsCount: Math.max(0, state.activeUploadsCount - 1) }));
      get().processQueue();
    }
  },
}));


