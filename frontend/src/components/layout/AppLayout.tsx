import React, { useEffect, useState, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';
import { UploadQueueTray } from '../uploader/UploadQueueTray';
import { SelectionActionBar } from '../gallery/SelectionActionBar';
import { MediaViewerModal } from '../viewer/MediaViewerModal';
import { ShareDialog } from '../sharing/ShareDialog';
import { AddToAlbumModal } from '../albums/AddToAlbumModal';
import { useAuthStore } from '../../stores/authStore';
import { useUploadStore } from '../../stores/uploadStore';
import { UploadCloud } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { fetchMe } = useAuthStore();
  const { addFiles } = useUploadStore();
  const location = useLocation();
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragCounter = useRef(0);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      setIsDraggingOver(false);
      dragCounter.current = 0;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    dragCounter.current = 0;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const match = location.pathname.match(/\/albums\/([a-f0-9]+)/i);
      const currentAlbumId = match ? match[1] : undefined;
      const isHiddenRoute = location.pathname === '/hidden';
      addFiles(Array.from(e.dataTransfer.files), currentAlbumId, isHiddenRoute);
    }
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="flex h-screen w-screen overflow-hidden bg-background text-foreground relative"
    >
      {/* Visual Drag & Drop Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-[#0071E3]/15 dark:bg-[#0071E3]/25 backdrop-blur-md border-2 border-dashed border-[#0071E3] flex flex-col items-center justify-center pointer-events-none animate-enter">
          <div className="p-6 rounded-3xl bg-white/95 dark:bg-[#1C1C1E]/95 shadow-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] flex flex-col items-center text-center max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-[#0071E3]/10 dark:bg-[#0071E3]/20 flex items-center justify-center text-[#0071E3] mb-4">
              <UploadCloud className="w-9 h-9 stroke-[1.75]" />
            </div>
            <h3 className="text-lg font-bold text-[#1D1D1F] dark:text-white">
              Drop Photos and Videos
            </h3>
            <p className="text-xs text-[#86868B] dark:text-[#A1A1A6] mt-1">
              Add directly to {location.pathname === '/hidden' ? 'Hidden Vault' : 'iCloud Library'} with high-speed parallel upload
            </p>
          </div>
        </div>
      )}

      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <Topbar />

        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>

        <MobileNav />
      </div>

      {/* Global Modals & Floating Components */}
      <UploadQueueTray />
      <SelectionActionBar />
      <MediaViewerModal />
      <ShareDialog />
      <AddToAlbumModal />
    </div>
  );
};

