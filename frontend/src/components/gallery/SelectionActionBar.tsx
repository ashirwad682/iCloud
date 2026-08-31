import React, { useState } from 'react';
import {
  Download,
  Heart,
  FolderPlus,
  Share2,
  Trash2,
  EyeOff,
  X,
} from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { api } from '../../services/api';

interface SelectionActionBarProps {
  onRefetch?: () => void;
}

export const SelectionActionBar: React.FC<SelectionActionBarProps> = ({ onRefetch }) => {
  const {
    selectedMediaIds,
    clearSelection,
    openShareModal,
    openAddToAlbumModal,
  } = useUIStore();

  const [isHideConfirmOpen, setIsHideConfirmOpen] = useState(false);

  if (selectedMediaIds.length === 0) return null;

  const count = selectedMediaIds.length;

  const handleBulkFavorite = async () => {
    try {
      await api.post('/media/bulk-favorite', {
        mediaIds: selectedMediaIds,
        isFavorite: true,
      });
      clearSelection();
      window.dispatchEvent(new Event('cv_media_uploaded'));
      onRefetch?.();
    } catch {
      // Ignore
    }
  };

  const confirmBulkHide = async () => {
    try {
      for (const id of selectedMediaIds) {
        await api.patch(`/media/${id}`, { isHidden: true });
      }
      setIsHideConfirmOpen(false);
      clearSelection();
      window.dispatchEvent(new Event('cv_media_uploaded'));
      onRefetch?.();
    } catch {
      // Ignore
    }
  };

  const handleBulkDelete = async () => {
    try {
      await api.post('/media/bulk-delete', {
        mediaIds: selectedMediaIds,
      });
      clearSelection();
      window.dispatchEvent(new Event('cv_media_uploaded'));
      onRefetch?.();
    } catch {
      // Ignore
    }
  };

  const handleBulkDownload = async () => {
    try {
      const response = await api.post(
        '/media/bulk-download',
        { mediaIds: selectedMediaIds },
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `CloudVault-Selection-${count}-items.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      // Ignore
    }
  };

  return (
    <>
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 animate-slide-up select-none">
        <div className="flex items-center space-x-1.5 p-2 rounded-2xl bg-white/95 dark:bg-[#2C2C2E]/95 backdrop-blur-2xl shadow-2xl border border-[#E5E7EB] dark:border-[#3A3A3C] text-[#1D1D1F] dark:text-white text-[13px] font-[-apple-system]">
          <div className="px-3.5 py-1.5 flex items-center space-x-2 border-r border-[#E5E7EB] dark:border-[#3A3A3C]">
            <span className="text-xs font-bold text-[#0071E3]">{count}</span>
            <span className="text-xs font-medium text-[#86868B]">selected</span>
          </div>

          <button
            onClick={handleBulkDownload}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] transition-all"
            title="Download as ZIP"
          >
            <Download className="w-3.5 h-3.5 text-[#0071E3]" />
            <span className="hidden sm:inline">Download</span>
          </button>

          <button
            onClick={() => openAddToAlbumModal(selectedMediaIds)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] transition-all"
            title="Add to Album"
          >
            <FolderPlus className="w-3.5 h-3.5 text-[#0071E3]" />
            <span className="hidden sm:inline">Add to Album</span>
          </button>

          <button
            onClick={handleBulkFavorite}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] text-[#FF2D55] transition-all"
            title="Favorite"
          >
            <Heart className="w-3.5 h-3.5 fill-[#FF2D55]" />
            <span className="hidden sm:inline">Favorite</span>
          </button>

          <button
            onClick={() => setIsHideConfirmOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white transition-all"
            title="Hide from Library"
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Hide</span>
          </button>

          <button
            onClick={() => openShareModal({ type: 'BATCH', ids: selectedMediaIds })}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] transition-all"
            title="Share"
          >
            <Share2 className="w-3.5 h-3.5 text-[#0071E3]" />
            <span className="hidden sm:inline">Share</span>
          </button>

          <button
            onClick={handleBulkDelete}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-[#FF3B30]/10 text-[#FF3B30] transition-all"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Delete</span>
          </button>

          <button
            onClick={clearSelection}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] transition-all ml-1"
            title="Deselect all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Apple Bulk Hide Confirmation Dialog */}
      {isHideConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-enter">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#2C2C2E] p-6 shadow-2xl border border-[#E5E5EA] dark:border-[#3A3A3C] text-center">
            <div className="w-12 h-12 rounded-full bg-[#0071E3]/10 text-[#0071E3] mx-auto flex items-center justify-center mb-3">
              <EyeOff className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-[16px] text-[#1D1D1F] dark:text-white mb-1.5">
              Hide {count} {count === 1 ? 'Item' : 'Items'}?
            </h3>
            <p className="text-[13px] text-[#86868B] mb-5 leading-relaxed">
              These items will be hidden from your Library, Albums, and Search. You can find and unhide them anytime in your password-protected Hidden album.
            </p>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsHideConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#F2F2F7] dark:bg-[#3A3A3C] text-[13px] font-medium text-[#1D1D1F] dark:text-white hover:bg-[#E5E5EA]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmBulkHide}
                className="flex-1 py-2.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-[13px] font-medium text-white shadow-sm"
              >
                Hide {count === 1 ? 'Item' : 'Items'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
