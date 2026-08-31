import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Folder, Trash2, Minus, X } from 'lucide-react';
import { Album } from '../types';
import { api } from '../services/api';
import { useUIStore } from '../stores/uiStore';

export const AlbumsPage: React.FC = () => {
  const navigate = useNavigate();
  const { zoomLevel, setZoomLevel } = useUIStore();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Album | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAlbums = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/albums');
      if (res.data?.success) {
        setAlbums(res.data.data);
      }
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlbums();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      await api.post('/albums', {
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
      });
      setNewTitle('');
      setNewDescription('');
      setIsCreateOpen(false);
      fetchAlbums();
      window.dispatchEvent(new Event('cv_media_uploaded'));
    } catch {
      // Ignore
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.delete(`/albums/${deleteTarget._id}`);
      setDeleteTarget(null);
      fetchAlbums();
      window.dispatchEvent(new Event('cv_media_uploaded'));
    } catch {
      // Ignore
    } finally {
      setIsDeleting(false);
    }
  };

  // Dynamic grid class based on zoom slider (1 to 5)
  const getGridClass = () => {
    switch (zoomLevel) {
      case 1:
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3';
      case 2:
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4';
      case 3:
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5'; // standard
      case 4:
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6';
      case 5:
        return 'grid-cols-1 sm:grid-cols-2 gap-8';
      default:
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#1C1C1E] select-none font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Icons','Helvetica_Neue',Helvetica,Arial,sans-serif]">
      {/* ── Apple Subheader Toolbar (Zoom Slider on Left, + and 🗑 on Right) ── */}
      <div className="h-11 px-4 md:px-8 flex items-center justify-between border-b border-[#E5E5EA] dark:border-[#2C2C2E] flex-shrink-0">
        {/* Left: Zoom Slider (— ━━━━🔘━━━━ +) */}
        <div className="flex items-center space-x-1.5 text-[#86868B]">
          <button
            onClick={() => setZoomLevel(Math.max(1, zoomLevel - 1))}
            className="w-5 h-5 flex items-center justify-center hover:text-[#1D1D1F] dark:hover:text-white transition-colors"
            title="Zoom Out"
          >
            <Minus className="w-3 h-3 stroke-[2]" />
          </button>

          <input
            type="range"
            min="1"
            max="5"
            step="1"
            value={zoomLevel}
            onChange={(e) => setZoomLevel(Number(e.target.value))}
            className="w-20 h-1 bg-[#E5E5EA] dark:bg-[#3A3A3C] rounded-lg appearance-none cursor-pointer accent-[#0071E3]"
          />

          <button
            onClick={() => setZoomLevel(Math.min(5, zoomLevel + 1))}
            className="w-5 h-5 flex items-center justify-center hover:text-[#1D1D1F] dark:hover:text-white transition-colors"
            title="Zoom In"
          >
            <Plus className="w-3 h-3 stroke-[2]" />
          </button>
        </div>

        {/* Right: + (New Album) & 🗑 (Delete action) */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#0071E3] hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E] transition-colors"
            title="New Album"
          >
            <Plus className="w-5 h-5 stroke-[2]" />
          </button>

          <button
            onClick={() => {
              if (albums.length > 0) {
                setDeleteTarget(albums[0]);
              }
            }}
            disabled={albums.length === 0}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              albums.length > 0
                ? 'text-[#86868B] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10'
                : 'text-[#C7C7CC] dark:text-[#48484A] cursor-not-allowed'
            }`}
            title="Delete Album"
          >
            <Trash2 className="w-4 h-4 stroke-[1.75]" />
          </button>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-[26px] font-bold text-[#1D1D1F] dark:text-white tracking-tight">
            Albums
          </h1>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] animate-pulse"
              />
            ))}
          </div>
        ) : albums.length === 0 ? (
          /* ── Official Apple iCloud Albums Empty State: Exactly "No Albums or Folders" ── */
          <div className="h-[calc(100vh-20rem)] flex flex-col items-center justify-center text-center p-6 select-none animate-fade-in">
            <h2 className="font-semibold text-[18px] text-[#86868B] dark:text-[#86868B]">
              No Albums or Folders
            </h2>
          </div>
        ) : (
          /* ── Albums Grid ── */
          <div className={`grid ${getGridClass()} pb-24`}>
            {albums.map((album) => (
              <div
                key={album._id}
                onClick={() => navigate(`/albums/${album._id}`)}
                className="group cursor-pointer select-none space-y-2"
              >
                {/* Album Cover Card */}
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-sm hover:shadow-lg transition-all duration-300 transform group-hover:scale-[1.02]">
                  {album.coverUrl ? (
                    album.coverUrl.includes('.mp4') ? (
                      <video
                        src={album.coverUrl}
                        preload="metadata"
                        muted
                        playsInline
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none"
                      />
                    ) : (
                      <img
                        src={album.coverUrl}
                        alt={album.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    )
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[#86868B] space-y-2">
                      <Folder className="w-12 h-12 text-[#0071E3]/40 stroke-[1.25]" />
                      <span className="text-[11px] font-medium">Empty Album</span>
                    </div>
                  )}

                  {/* Delete Button on Hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(album);
                    }}
                    className="absolute bottom-2.5 right-2.5 w-7 h-7 rounded-full bg-black/60 hover:bg-[#FF3B30] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-md"
                    title="Delete Album"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Album Title & Metadata */}
                <div>
                  <h3 className="font-semibold text-[14px] text-[#1D1D1F] dark:text-white truncate group-hover:text-[#0071E3] transition-colors">
                    {album.title}
                  </h3>
                  <p className="text-[12px] text-[#86868B] truncate">
                    {album.itemCount || 0} {album.itemCount === 1 ? 'item' : 'items'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Official Apple iCloud New Album Modal (matching reference screenshot) ── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Icons','Helvetica_Neue',Helvetica,Arial,sans-serif]">
          <div className="w-full max-w-[420px] rounded-2xl bg-white dark:bg-[#1C1C1E] p-6 shadow-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] animate-scale-in relative">
            {/* Top-Left Close (✕) Button */}
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-4 left-4 w-7 h-7 rounded-full flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white transition-colors"
              title="Close"
            >
              <X className="w-4 h-4 stroke-[2]" />
            </button>

            {/* Centered Apple New Album Icon */}
            <div className="flex flex-col items-center justify-center pt-2 pb-1">
              <svg
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-12 h-12 text-[#0071E3] mb-2"
              >
                {/* Back card */}
                <rect
                  x="14"
                  y="8"
                  width="22"
                  height="16"
                  rx="2.5"
                  stroke="currentColor"
                  strokeWidth="2.2"
                />
                {/* Front main card */}
                <rect
                  x="10"
                  y="12"
                  width="24"
                  height="18"
                  rx="3"
                  fill="white"
                  className="dark:fill-[#1C1C1E]"
                  stroke="currentColor"
                  strokeWidth="2.2"
                />
                {/* Plus circle badge */}
                <circle
                  cx="15"
                  cy="27"
                  r="5"
                  fill="white"
                  className="dark:fill-[#1C1C1E]"
                  stroke="currentColor"
                  strokeWidth="2.2"
                />
                <path
                  d="M15 24.5V29.5M12.5 27H17.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>

              {/* Title */}
              <h3 className="font-semibold text-[19px] text-[#1D1D1F] dark:text-white tracking-tight mb-5">
                New Album
              </h3>
            </div>

            {/* Form */}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Album Name"
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-[#1C1C1E] border border-[#D8D8DC] dark:border-[#3A3A3C] text-[#1D1D1F] dark:text-white placeholder-[#86868B] outline-none focus:border-[#0071E3] focus:ring-1 focus:ring-[#0071E3] text-[14px]"
                />
              </div>

              {/* Centered Create Button */}
              <div className="flex justify-center pt-1">
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className={`w-36 py-2 rounded-lg font-medium text-[14px] text-white transition-all shadow-xs ${
                    newTitle.trim()
                      ? 'bg-[#0071E3] hover:bg-[#0077ED] cursor-pointer'
                      : 'bg-[#B3D7FF] dark:bg-[#0071E3]/40 cursor-not-allowed'
                  }`}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Apple Confirmation Modal: DELETE ALBUM ── */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-fade-in"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-[#E5E5EA] dark:border-[#2C2C2E] animate-scale-in text-center space-y-4 text-[#1D1D1F] dark:text-[#F5F5F7]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-[#FF3B30]/10 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 text-[#FF3B30] stroke-[2]" />
            </div>
            <div>
              <h3 className="text-[17px] font-bold tracking-tight">
                Delete "{deleteTarget.title}"?
              </h3>
              <p className="text-[12px] text-[#86868B] mt-1.5 leading-relaxed">
                This album will be permanently deleted. The photos and videos inside won't be
                deleted.
              </p>
            </div>
            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[13px] font-medium text-[#1D1D1F] dark:text-white hover:bg-[#E5E5EA] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-[#FF3B30] text-[13px] font-semibold text-white hover:bg-[#D70015] transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting…' : 'Delete Album'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
