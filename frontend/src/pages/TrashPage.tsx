import React, { useEffect, useState } from 'react';
import {
  Trash2,
  RotateCcw,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Check,
  X,
  ShieldAlert,
} from 'lucide-react';
import { Media } from '../types';
import { api } from '../services/api';
import { useUIStore } from '../stores/uiStore';

export const TrashPage: React.FC = () => {
  const { gridMode, zoomLevel } = useUIStore();

  const [trashItems, setTrashItems] = useState<Media[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Apple Confirmation Dialog States
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    isOpen: boolean;
    isAll: boolean;
    count: number;
  }>({ isOpen: false, isAll: false, count: 0 });

  const [confirmRestoreModal, setConfirmRestoreModal] = useState<{
    isOpen: boolean;
    isAll: boolean;
    count: number;
  }>({ isOpen: false, isAll: false, count: 0 });

  const fetchTrash = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/trash');
      if (res.data?.success) {
        setTrashItems(res.data.data);
      }
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, []);

  // Selection handlers
  const toggleSelectItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllToggle = () => {
    if (selectedIds.length === trashItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(trashItems.map((item) => item._id));
    }
  };

  // Execute Restore
  const executeRestore = async () => {
    const isAll = confirmRestoreModal.isAll;
    const idsToRestore = isAll ? trashItems.map((i) => i._id) : selectedIds;
    if (idsToRestore.length === 0) return;

    setIsProcessing(true);
    try {
      if (isAll) {
        await api.post('/trash/bulk-restore', { mediaIds: idsToRestore });
        setTrashItems([]);
        setSelectedIds([]);
      } else {
        await api.post('/trash/bulk-restore', { mediaIds: idsToRestore });
        setTrashItems((prev) => prev.filter((i) => !idsToRestore.includes(i._id)));
        setSelectedIds([]);
      }
      setConfirmRestoreModal({ isOpen: false, isAll: false, count: 0 });
      window.dispatchEvent(new Event('cv_media_uploaded'));
    } catch {
      // Ignore
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute Permanent Delete from iCloud
  const executePermanentDelete = async () => {
    const isAll = confirmDeleteModal.isAll;
    const idsToDelete = isAll ? trashItems.map((i) => i._id) : selectedIds;
    if (idsToDelete.length === 0) return;

    setIsProcessing(true);
    try {
      if (isAll) {
        await api.post('/trash/empty', {});
        setTrashItems([]);
        setSelectedIds([]);
      } else {
        await api.post('/trash/bulk-delete', { mediaIds: idsToDelete });
        setTrashItems((prev) => prev.filter((i) => !idsToDelete.includes(i._id)));
        setSelectedIds([]);
      }
      setConfirmDeleteModal({ isOpen: false, isAll: false, count: 0 });
      window.dispatchEvent(new Event('cv_media_uploaded'));
    } catch {
      // Ignore
    } finally {
      setIsProcessing(false);
    }
  };

  const hasSelection = selectedIds.length > 0;
  const isAllSelected = trashItems.length > 0 && selectedIds.length === trashItems.length;

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-[#000000] font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Icons','Helvetica_Neue',Helvetica,Arial,sans-serif] text-[#1D1D1F] dark:text-[#F5F5F7] select-none pb-28">
      {/* Sticky Apple Top Action Toolbar */}
      <div className="sticky top-0 z-30 px-6 md:px-8 py-3.5 bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-xl border-b border-[#E5E5EA] dark:border-[#2C2C2E] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-[#1D1D1F] dark:text-white">
            Recently Deleted
          </h1>
          <p className="text-[12px] text-[#86868B] mt-0.5">
            {trashItems.length} {trashItems.length === 1 ? 'item' : 'items'}
            {hasSelection && ` · ${selectedIds.length} Selected`}
            {' · '}Items are permanently deleted after 30 days.
          </p>
        </div>

        {/* Dynamic Action Buttons */}
        {trashItems.length > 0 && (
          <div className="flex items-center space-x-2 shrink-0">
            {/* Select All Toggle */}
            <button
              onClick={handleSelectAllToggle}
              className="px-3.5 py-1.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] text-[#1D1D1F] dark:text-white text-[12px] font-semibold transition-all"
            >
              {isAllSelected ? 'Deselect All' : 'Select All'}
            </button>

            {/* Dynamic Restore / Recover Button */}
            <button
              onClick={() => {
                if (hasSelection) {
                  setConfirmRestoreModal({ isOpen: true, isAll: false, count: selectedIds.length });
                } else {
                  setConfirmRestoreModal({ isOpen: true, isAll: true, count: trashItems.length });
                }
              }}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[12px] font-semibold transition-all shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5 stroke-[2]" />
              <span>{hasSelection ? `Recover (${selectedIds.length})` : 'Recover All'}</span>
            </button>

            {/* Dynamic Delete from iCloud Button */}
            <button
              onClick={() => {
                if (hasSelection) {
                  setConfirmDeleteModal({ isOpen: true, isAll: false, count: selectedIds.length });
                } else {
                  setConfirmDeleteModal({ isOpen: true, isAll: true, count: trashItems.length });
                }
              }}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-[#FF3B30] hover:bg-[#D70015] text-white text-[12px] font-semibold transition-all shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
              <span>{hasSelection ? `Delete from iCloud (${selectedIds.length})` : 'Delete All'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Grid Area */}
      <main className="p-6 md:p-8 max-w-7xl mx-auto w-full">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] animate-pulse" />
            ))}
          </div>
        ) : trashItems.length === 0 ? (
          <div className="text-center py-28 space-y-3">
            <div className="w-16 h-16 rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#86868B] mx-auto flex items-center justify-center">
              <Trash2 className="w-8 h-8 stroke-[1.25]" />
            </div>
            <h3 className="font-bold text-[18px] text-[#1D1D1F] dark:text-white">
              Recently Deleted is Empty
            </h3>
            <p className="text-[13px] text-[#86868B] max-w-sm mx-auto">
              Photos and videos you delete will stay here for 30 days before being permanently removed from iCloud.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {trashItems.map((item) => {
              const isSelected = selectedIds.includes(item._id);
              const daysLeft = item.daysRemaining !== undefined ? item.daysRemaining : 30;

              return (
                <div
                  key={item._id}
                  onClick={(e) => toggleSelectItem(item._id, e)}
                  className={`group relative rounded-2xl overflow-hidden cursor-pointer select-none transition-all duration-200 aspect-square bg-[#F2F2F7] dark:bg-[#1C1C1E] border ${
                    isSelected
                      ? 'border-[#0071E3] ring-2 ring-[#0071E3] ring-offset-2 ring-offset-white dark:ring-offset-[#1C1C1E] scale-[0.98]'
                      : 'border-[#E5E5EA] dark:border-[#2C2C2E] hover:shadow-md hover:scale-[1.01]'
                  }`}
                >
                  <img
                    src={item.thumbnailUrl || item.previewUrl}
                    alt={item.originalName}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />

                  {/* Days Left Apple Pill Badge (Top Left) */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-semibold text-white shadow-xs">
                    {daysLeft}d left
                  </div>

                  {/* Selection Checkmark Circle (Top Right) */}
                  <button
                    onClick={(e) => toggleSelectItem(item._id, e)}
                    className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-150 ${
                      isSelected
                        ? 'opacity-100 bg-[#0071E3] text-white shadow-sm'
                        : 'opacity-0 group-hover:opacity-100 bg-black/40 text-white/90 hover:bg-black/60 backdrop-blur-md'
                    }`}
                  >
                    {isSelected ? (
                      <CheckCircle2 className="w-5 h-5 fill-[#0071E3] text-white" />
                    ) : (
                      <Circle className="w-4 h-4 stroke-[1.5]" />
                    )}
                  </button>

                  {/* Hover Quick Action Buttons */}
                  <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-between">
                    <span className="text-[10px] font-medium text-white truncate max-w-[55%]">
                      {item.originalName}
                    </span>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIds([item._id]);
                          setConfirmRestoreModal({ isOpen: true, isAll: false, count: 1 });
                        }}
                        className="p-1.5 rounded-lg bg-white/20 hover:bg-[#0071E3] text-white transition-colors"
                        title="Recover Photo"
                      >
                        <RotateCcw className="w-3.5 h-3.5 stroke-[2]" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIds([item._id]);
                          setConfirmDeleteModal({ isOpen: true, isAll: false, count: 1 });
                        }}
                        className="p-1.5 rounded-lg bg-white/20 hover:bg-[#FF3B30] text-white transition-colors"
                        title="Delete from iCloud"
                      >
                        <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Apple Confirmation Modal: DELETE FROM ICLOUD */}
      {confirmDeleteModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Icons','Helvetica_Neue',Helvetica,Arial,sans-serif]">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#1C1C1E] p-6 shadow-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] text-center space-y-4 animate-scale-in text-[#1D1D1F] dark:text-[#F5F5F7]">
            <div className="w-12 h-12 rounded-full bg-[#FF3B30]/10 text-[#FF3B30] mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <h3 className="font-bold text-[17px] tracking-tight">
                Delete {confirmDeleteModal.count} {confirmDeleteModal.count === 1 ? 'Item' : 'Items'} from iCloud?
              </h3>
              <p className="text-[12px] text-[#86868B] mt-1.5 leading-relaxed">
                {confirmDeleteModal.count === 1 ? 'This item' : 'These items'} will be permanently deleted from iCloud Photos on all your devices. This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteModal({ isOpen: false, isAll: false, count: 0 })}
                className="flex-1 py-2.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[13px] font-semibold text-[#1D1D1F] dark:text-white hover:bg-[#E5E5EA]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executePermanentDelete}
                disabled={isProcessing}
                className="flex-1 py-2.5 rounded-xl bg-[#FF3B30] hover:bg-[#D70015] text-[13px] font-semibold text-white shadow-sm transition-all disabled:opacity-50"
              >
                {isProcessing ? 'Deleting...' : 'Delete from iCloud'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Apple Confirmation Modal: RECOVER PHOTOS */}
      {confirmRestoreModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Icons','Helvetica_Neue',Helvetica,Arial,sans-serif]">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#1C1C1E] p-6 shadow-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] text-center space-y-4 animate-scale-in text-[#1D1D1F] dark:text-[#F5F5F7]">
            <div className="w-12 h-12 rounded-full bg-[#0071E3]/10 text-[#0071E3] mx-auto flex items-center justify-center">
              <RotateCcw className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <h3 className="font-bold text-[17px] tracking-tight">
                Recover {confirmRestoreModal.count} {confirmRestoreModal.count === 1 ? 'Item' : 'Items'}?
              </h3>
              <p className="text-[12px] text-[#86868B] mt-1.5 leading-relaxed">
                {confirmRestoreModal.count === 1 ? 'This item' : 'These items'} will be restored back to your Photos Library and visible across all albums.
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmRestoreModal({ isOpen: false, isAll: false, count: 0 })}
                className="flex-1 py-2.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[13px] font-semibold text-[#1D1D1F] dark:text-white hover:bg-[#E5E5EA]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeRestore}
                disabled={isProcessing}
                className="flex-1 py-2.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-[13px] font-semibold text-white shadow-sm transition-all disabled:opacity-50"
              >
                {isProcessing ? 'Recovering...' : 'Recover Photos'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
