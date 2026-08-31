import React, { useEffect } from 'react';
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
import { socketService } from '../../services/socket';

export const AppLayout: React.FC = () => {
  const { fetchMe } = useAuthStore();
  const { addFiles } = useUploadStore();
  const location = useLocation();

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  // Global Drag & Drop Handler for uploading media anywhere on the screen
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const match = location.pathname.match(/\/albums\/([a-f0-9]+)/i);
      const currentAlbumId = match ? match[1] : undefined;
      const isHiddenRoute = location.pathname === '/hidden';
      addFiles(Array.from(e.dataTransfer.files), currentAlbumId, isHiddenRoute);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="flex h-screen w-screen overflow-hidden bg-background text-foreground"
    >
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
