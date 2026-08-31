import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Plus,
  X,
  Trash2,
  Minus,
  Check,
} from 'lucide-react';
import { SharedAlbum } from '../types';
import { api } from '../services/api';
import { useUIStore } from '../stores/uiStore';

/* ── Apple iCloud Shared Albums Official Empty State SVG Icon ── */
const SharedAlbumsEmptyIcon: React.FC<{ className?: string }> = ({
  className = 'w-24 h-24 text-[#86868B]',
}) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Back photo card 1 */}
    <rect
      x="18"
      y="12"
      width="34"
      height="26"
      rx="3.5"
      stroke="currentColor"
      strokeWidth="2"
      className="opacity-40"
    />
    {/* Back photo card 2 */}
    <rect
      x="14"
      y="16"
      width="36"
      height="28"
      rx="4"
      stroke="currentColor"
      strokeWidth="2"
      className="opacity-70"
    />
    {/* Front photo card */}
    <rect
      x="10"
      y="20"
      width="38"
      height="30"
      rx="4.5"
      fill="white"
      className="dark:fill-[#1C1C1E]"
      stroke="currentColor"
      strokeWidth="2.2"
    />
    {/* Person Avatar Badge in Front */}
    <circle
      cx="24"
      cy="40"
      r="8.5"
      fill="white"
      className="dark:fill-[#1C1C1E]"
      stroke="currentColor"
      strokeWidth="2.2"
    />
    <circle cx="24" cy="37.5" r="3.2" fill="currentColor" />
    <path
      d="M17.5 45.5C18.2 43 20.9 41.8 24 41.8C27.1 41.8 29.8 43 30.5 45.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

export const SharedAlbumsPage: React.FC = () => {
  const navigate = useNavigate();
  const { zoomLevel, setZoomLevel } = useUIStore();
  const [albums, setAlbums] = useState<SharedAlbum[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [allowContributions, setAllowContributions] = useState(true);
  const [allowComments, setAllowComments] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Shared Album Confirmation State
  const [albumToDelete, setAlbumToDelete] = useState<SharedAlbum | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSharedAlbums = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/shared-albums');
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
    fetchSharedAlbums();
    const handleUpdate = () => fetchSharedAlbums();
    window.addEventListener('cv_media_uploaded', handleUpdate);
    return () => window.removeEventListener('cv_media_uploaded', handleUpdate);
  }, []);

  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await api.post('/shared-albums', {
        title: title.trim(),
        description: description.trim() || undefined,
        settings: {
          allowContributions,
          allowComments,
          allowReactions: true,
          allowDownloads: true,
        },
      });

      if (res.data?.success) {
        setIsCreateModalOpen(false);
        setTitle('');
        setDescription('');
        fetchSharedAlbums();
        window.dispatchEvent(new Event('cv_media_uploaded'));
        navigate(`/shared-albums/${res.data.data._id}`);
      }
    } catch {
      // Ignore
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteDelete = async () => {
    if (!albumToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/shared-albums/${albumToDelete._id}`);
      setAlbums((prev) => prev.filter((a) => a._id !== albumToDelete._id));
      setAlbumToDelete(null);
      window.dispatchEvent(new Event('cv_media_uploaded'));
    } catch {
      // Ignore
    } finally {
      setIsDeleting(false);
    }
  };

  // Dynamic grid class based on zoom slider
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
      {/* ── Apple Subheader Toolbar (Zoom on Left, + and 🗑 on Right) ── */}
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

        {/* Right: + (New Shared Album) & 🗑 (Delete action) */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#0071E3] hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E] transition-colors"
            title="New Shared Album"
          >
            <Plus className="w-5 h-5 stroke-[2]" />
          </button>

          <button
            onClick={() => {
              if (albums.length > 0) {
                setAlbumToDelete(albums[0]);
              }
            }}
            disabled={albums.length === 0}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              albums.length > 0
                ? 'text-[#86868B] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10'
                : 'text-[#C7C7CC] dark:text-[#48484A] cursor-not-allowed'
            }`}
            title="Delete Shared Album"
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
            Shared Albums
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
          /* ── Authentic Apple iCloud Shared Albums Empty State ── */
          <div className="h-[calc(100vh-20rem)] flex flex-col items-center justify-center text-center p-6 select-none animate-fade-in">
            <div className="mb-4">
              <SharedAlbumsEmptyIcon className="w-24 h-24 text-[#86868B] dark:text-[#6E6E73]" />
            </div>
            <h2 className="font-semibold text-[20px] text-[#1D1D1F] dark:text-white mb-2">
              Shared Albums
            </h2>
            <p className="text-[13px] text-[#86868B] dark:text-[#86868B] max-w-sm leading-relaxed mb-6">
              Share photos and videos with just the people you choose, and let them add photos,
              videos, and comments.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-2 rounded-lg bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-medium transition-all shadow-sm flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create Shared Album</span>
            </button>
          </div>
        ) : (
          /* ── Shared Albums Grid ── */
          <div className={`grid ${getGridClass()} pb-24`}>
            {albums.map((album) => (
              <div
                key={album._id}
                onClick={() => navigate(`/shared-albums/${album._id}`)}
                className="group cursor-pointer select-none space-y-2"
              >
                {/* Album Cover Card */}
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-sm hover:shadow-lg transition-all duration-300 transform group-hover:scale-[1.02]">
                  {album.coverUrl ? (
                    <img
                      src={album.coverUrl}
                      alt={album.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[#86868B] space-y-2">
                      <Users className="w-10 h-10 stroke-[1.25]" />
                      <span className="text-[11px] font-medium">Empty Album</span>
                    </div>
                  )}

                  {/* Member Badge Overlay */}
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-medium flex items-center space-x-1 shadow-sm">
                    <Users className="w-3 h-3" />
                    <span>{album.memberCount || 1}</span>
                  </div>

                  {/* Delete Button on Hover */}
                  {album.isOwner && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAlbumToDelete(album);
                      }}
                      className="absolute bottom-2.5 right-2.5 w-7 h-7 rounded-full bg-black/60 hover:bg-[#FF3B30] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-md"
                      title="Delete Shared Album"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Album Title & Metadata */}
                <div>
                  <h3 className="font-semibold text-[14px] text-[#1D1D1F] dark:text-white truncate group-hover:text-[#0071E3] transition-colors">
                    {album.title}
                  </h3>
                  <p className="text-[12px] text-[#86868B] truncate">
                    {album.itemCount || 0} {album.itemCount === 1 ? 'item' : 'items'}
                    {album.isOwner ? ' · Created by you' : ' · Shared with you'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Apple Confirmation Modal: DELETE SHARED ALBUM ── */}
      {albumToDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#1C1C1E] p-6 shadow-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] text-center space-y-4 animate-scale-in text-[#1D1D1F] dark:text-[#F5F5F7]">
            <div className="w-12 h-12 rounded-full bg-[#FF3B30]/10 text-[#FF3B30] mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <h3 className="font-bold text-[17px] tracking-tight">
                Delete "{albumToDelete.title}"?
              </h3>
              <p className="text-[12px] text-[#86868B] mt-1.5 leading-relaxed">
                Deleting this shared album will remove it from all collaborators. Photos in this
                shared album will no longer be accessible.
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setAlbumToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[13px] font-semibold text-[#1D1D1F] dark:text-white hover:bg-[#E5E5EA]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-[#FF3B30] hover:bg-[#D70015] text-[13px] font-semibold text-white shadow-sm transition-all disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Album'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Shared Album Modal ── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#1C1C1E] p-6 shadow-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E] mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center">
                  <Users className="w-4 h-4 stroke-[2]" />
                </div>
                <h3 className="font-bold text-[16px]">New Shared Album</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="w-7 h-7 rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAlbum} className="space-y-4 text-[12px]">
              <div>
                <label className="font-medium text-[#1D1D1F] dark:text-white block mb-1">
                  Album Name
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Europe Trip, Family Memories"
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#3A3A3C] text-[#1D1D1F] dark:text-white outline-none focus:border-[#0071E3] text-[13px]"
                />
              </div>

              <div>
                <label className="font-medium text-[#1D1D1F] dark:text-white block mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a note or description for collaborators..."
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#3A3A3C] text-[#1D1D1F] dark:text-white outline-none focus:border-[#0071E3] text-[12px]"
                />
              </div>

              {/* Collaborative Permissions */}
              <div className="space-y-2 pt-2 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
                <span className="font-semibold text-[#86868B] uppercase tracking-wider text-[10px] block">
                  Member Permissions
                </span>
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowContributions}
                    onChange={(e) => setAllowContributions(e.target.checked)}
                    className="rounded text-[#0071E3] focus:ring-[#0071E3]"
                  />
                  <span>Allow members to add photos & videos</span>
                </label>

                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowComments}
                    onChange={(e) => setAllowComments(e.target.checked)}
                    className="rounded text-[#0071E3] focus:ring-[#0071E3]"
                  />
                  <span>Allow comments and emoji reactions</span>
                </label>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[13px] font-medium text-[#1D1D1F] dark:text-white hover:bg-[#E5E5EA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !title.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-[13px] font-semibold text-white shadow-sm transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Album'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
