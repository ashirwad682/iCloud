import React, { useRef, useState, useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import {
  UploadCloud,
  Share,
  Heart,
  DownloadCloud,
  Trash2,
  MoreHorizontal,
  Minus,
  Plus,
  ArrowUpDown,
  Calendar,
  FolderPlus,
  EyeOff,
  RefreshCw,
  X,
  Check,
  Search,
} from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useUploadStore } from '../../stores/uploadStore';
import { api } from '../../services/api';
import { Media } from '../../types';

interface GalleryToolbarProps {
  albumId?: string;
  allMediaIds?: string[];
  allMedia?: Media[];
  title?: string;
  subtitle?: string;
}

export const GalleryToolbar: React.FC<GalleryToolbarProps> = ({
  albumId: propAlbumId,
  allMediaIds,
  allMedia = [],
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const params = useParams<{ id: string }>();
  const { addFiles } = useUploadStore();
  const {
    zoomLevel,
    setZoomLevel,
    gridMode,
    setGridMode,
    selectedMediaIds,
    selectAll,
    clearSelection,
    openShareModal,
    openAddToAlbumModal,
    dateFilter,
    setDateFilter,
    searchQuery,
    setSearchQuery,
  } = useUIStore();

  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const hasSelection = selectedMediaIds.length > 0;

  // Extract distinct dates from media list for quick picking
  const availableDates = useMemo(() => {
    const map = new Map<string, { count: number; label: string }>();
    allMedia.forEach((m) => {
      const rawDate = m.capturedAt || m.uploadedAt;
      if (!rawDate) return;
      try {
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) return;
        const key = d.toISOString().split('T')[0]; // YYYY-MM-DD
        const label = d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        const current = map.get(key) || { count: 0, label };
        map.set(key, { count: current.count + 1, label });
      } catch {}
    });
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 10);
  }, [allMedia]);

  // Active album ID
  const currentAlbumId =
    propAlbumId ||
    (location.pathname.startsWith('/albums/') && params.id ? params.id : undefined);

  const isHiddenRoute = location.pathname === '/hidden';

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files), currentAlbumId, isHiddenRoute);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleBulkDownload = async () => {
    if (!hasSelection) return;
    try {
      const response = await api.post(
        '/media/bulk-download',
        { mediaIds: selectedMediaIds },
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `iCloud-Photos-${selectedMediaIds.length}-items.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      // Ignore
    }
  };

  const handleBulkFavorite = async () => {
    if (!hasSelection) return;
    try {
      await api.post('/media/bulk-favorite', {
        mediaIds: selectedMediaIds,
        isFavorite: true,
      });
      window.dispatchEvent(new Event('cv_media_uploaded'));
    } catch {}
  };

  const handleBulkDelete = async () => {
    if (!hasSelection) return;
    try {
      await api.post('/media/bulk-delete', { mediaIds: selectedMediaIds });
      clearSelection();
      window.dispatchEvent(new Event('cv_media_uploaded'));
    } catch {}
  };

  const handleBulkHide = async () => {
    if (!hasSelection) return;
    try {
      for (const id of selectedMediaIds) {
        await api.patch(`/media/${id}`, { isHidden: true });
      }
      clearSelection();
      window.dispatchEvent(new Event('cv_media_uploaded'));
    } catch {}
  };

  return (
    <div className="h-11 px-4 md:px-6 flex items-center justify-between bg-white dark:bg-[#1C1C1E] border-b border-[#E5E5EA] dark:border-[#2C2C2E] select-none text-[13px] font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Icons','Helvetica_Neue',Helvetica,Arial,sans-serif]">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInput}
        multiple
        accept="image/*,video/*"
        className="hidden"
      />

      {/* Left Controls: ↕ Aspect/Square, 📅 Calendar, Zoom Slider */}
      <div className="flex items-center space-x-3">
        {/* ↕ Aspect Ratio Toggle */}
        <button
          onClick={() => setGridMode(gridMode === 'aspect' ? 'square' : 'aspect')}
          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
            gridMode === 'aspect'
              ? 'text-[#0071E3] bg-[#F2F2F7] dark:bg-[#2C2C2E]'
              : 'text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white'
          }`}
          title={`Switch to ${gridMode === 'aspect' ? 'Square grid' : 'Aspect ratio grid'}`}
        >
          <ArrowUpDown className="w-4 h-4 stroke-[1.75]" />
        </button>

        {/* 📅 Calendar Date Selector & Filter */}
        <div className="relative" ref={calendarRef}>
          <button
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
              dateFilter || isCalendarOpen
                ? 'text-[#0071E3] bg-[#0071E3]/10 dark:bg-[#0071E3]/20 font-semibold'
                : 'text-[#0071E3] hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E]'
            }`}
            title="Filter by Date or Timeline"
          >
            <Calendar className="w-4 h-4 stroke-[1.75]" />
          </button>

          {isCalendarOpen && (
            <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-white dark:bg-[#2C2C2E] p-3 shadow-2xl border border-[#E5E5EA] dark:border-[#3A3A3C] z-50 text-[13px] animate-scale-in">
              <div className="flex items-center justify-between pb-2 border-b border-[#E5E5EA] dark:border-[#3A3A3C] mb-2">
                <span className="font-semibold text-[13px] text-[#1D1D1F] dark:text-white">
                  Filter by Date
                </span>
                {dateFilter && (
                  <button
                    onClick={() => {
                      setDateFilter(null);
                      setIsCalendarOpen(false);
                    }}
                    className="text-[11px] text-[#0071E3] font-medium hover:underline"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              {/* Custom Date Input */}
              <div className="mb-3">
                <label className="block text-[11px] font-medium text-[#86868B] mb-1">
                  Pick a Specific Day
                </label>
                <input
                  type="date"
                  value={dateFilter && dateFilter.length === 10 ? dateFilter : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      setDateFilter(e.target.value);
                      setIsCalendarOpen(false);
                    }
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#F2F2F7] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#3A3A3C] text-[12px] text-[#1D1D1F] dark:text-white outline-none focus:border-[#0071E3]"
                />
              </div>

              {/* Quick Presets */}
              <div className="space-y-1">
                <div className="text-[10px] font-semibold text-[#86868B] uppercase tracking-wider px-1">
                  Quick Filters
                </div>
                <button
                  onClick={() => {
                    setDateFilter(null);
                    setIsCalendarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[12px] transition-colors ${
                    !dateFilter
                      ? 'bg-[#0071E3] text-white font-semibold'
                      : 'text-[#1D1D1F] dark:text-white hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C]'
                  }`}
                >
                  <span>All Photos & Videos</span>
                  {!dateFilter && <Check className="w-3.5 h-3.5" />}
                </button>

                <button
                  onClick={() => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    setDateFilter(todayStr);
                    setIsCalendarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[12px] transition-colors ${
                    dateFilter === new Date().toISOString().split('T')[0]
                      ? 'bg-[#0071E3] text-white font-semibold'
                      : 'text-[#1D1D1F] dark:text-white hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C]'
                  }`}
                >
                  <span>Today</span>
                  {dateFilter === new Date().toISOString().split('T')[0] && (
                    <Check className="w-3.5 h-3.5" />
                  )}
                </button>

                <button
                  onClick={() => {
                    setDateFilter('LAST_7_DAYS');
                    setIsCalendarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[12px] transition-colors ${
                    dateFilter === 'LAST_7_DAYS'
                      ? 'bg-[#0071E3] text-white font-semibold'
                      : 'text-[#1D1D1F] dark:text-white hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C]'
                  }`}
                >
                  <span>Past 7 Days</span>
                  {dateFilter === 'LAST_7_DAYS' && <Check className="w-3.5 h-3.5" />}
                </button>

                <button
                  onClick={() => {
                    setDateFilter('LAST_30_DAYS');
                    setIsCalendarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[12px] transition-colors ${
                    dateFilter === 'LAST_30_DAYS'
                      ? 'bg-[#0071E3] text-white font-semibold'
                      : 'text-[#1D1D1F] dark:text-white hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C]'
                  }`}
                >
                  <span>Past 30 Days</span>
                  {dateFilter === 'LAST_30_DAYS' && <Check className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Distinct Photo Dates */}
              {availableDates.length > 0 && (
                <div className="space-y-1 pt-2 border-t border-[#E5E5EA] dark:border-[#3A3A3C] mt-2 max-h-36 overflow-y-auto">
                  <div className="text-[10px] font-semibold text-[#86868B] uppercase tracking-wider px-1">
                    Dates in Library
                  </div>
                  {availableDates.map(([key, info]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setDateFilter(key);
                        setIsCalendarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[12px] transition-colors ${
                        dateFilter === key
                          ? 'bg-[#0071E3] text-white font-semibold'
                          : 'text-[#1D1D1F] dark:text-white hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C]'
                      }`}
                    >
                      <span>{info.label}</span>
                      <span className="text-[10px] opacity-70">
                        {info.count} {info.count === 1 ? 'item' : 'items'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Active Date Filter Chip */}
        {dateFilter && (
          <div className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-[#0071E3]/10 text-[#0071E3] text-[11px] font-semibold animate-scale-in">
            <span>
              {dateFilter === 'LAST_7_DAYS'
                ? 'Past 7 Days'
                : dateFilter === 'LAST_30_DAYS'
                ? 'Past 30 Days'
                : dateFilter}
            </span>
            <button
              onClick={() => setDateFilter(null)}
              className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-[#0071E3]/20"
              title="Clear date filter"
            >
              <X className="w-3 h-3 stroke-[2]" />
            </button>
          </div>
        )}

        {/* Zoom Slider (— ━━━━━🔘━━━━━ +) */}
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
      </div>

      {/* Right Controls: count + Select All + Deselect All (when ≥1 selected) + action icons */}
      <div className="flex items-center space-x-1">
        {/* ── Selection Controls (only visible when ≥ 1 item selected) ── */}
        {hasSelection && (
          <div className="flex items-center space-x-1.5 mr-2 animate-scale-in">
            {/* Count chip */}
            <span className="px-2.5 py-1 rounded-full bg-[#0071E3] text-white text-[11px] font-semibold tabular-nums leading-none shadow-xs">
              {selectedMediaIds.length} Selected
            </span>

            {/* Select All */}
            <button
              onClick={() => {
                if (allMediaIds && allMediaIds.length > 0) {
                  selectAll(allMediaIds);
                } else {
                  window.dispatchEvent(new Event('cv_select_all_media'));
                }
              }}
              disabled={allMediaIds ? selectedMediaIds.length === allMediaIds.length : false}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium transition-all bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-white hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] disabled:opacity-40 disabled:cursor-not-allowed"
              title="Select All Photos & Videos"
            >
              Select All
            </button>

            {/* Deselect All */}
            <button
              onClick={clearSelection}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium transition-all bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#FF3B30] hover:bg-[#FF3B30]/10"
              title="Deselect All"
            >
              Deselect All
            </button>
          </div>
        )}

        {/* ☁️↑ Upload (Cloud with Up Arrow) */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#0071E3] hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E] transition-colors"
          title="Upload to iCloud"
        >
          <UploadCloud className="w-5 h-5 stroke-[1.75]" />
        </button>

        {/* ⎋ Share (iOS Share Box with Arrow) */}
        <button
          onClick={() => hasSelection && openShareModal({ type: 'BATCH', ids: selectedMediaIds })}
          disabled={!hasSelection}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            hasSelection
              ? 'text-[#0071E3] hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E]'
              : 'text-[#C7C7CC] dark:text-[#48484A] cursor-not-allowed'
          }`}
          title="Share Selection"
        >
          <Share className="w-4 h-4 stroke-[1.75]" />
        </button>

        {/* ♡ Favorite (Heart) */}
        <button
          onClick={handleBulkFavorite}
          disabled={!hasSelection}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            hasSelection
              ? 'text-[#0071E3] hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E]'
              : 'text-[#C7C7CC] dark:text-[#48484A] cursor-not-allowed'
          }`}
          title="Favorite Selection"
        >
          <Heart className="w-4 h-4 stroke-[1.75]" />
        </button>

        {/* ☁️↓ Download (Cloud with Down Arrow - Hover background) */}
        <button
          onClick={handleBulkDownload}
          disabled={!hasSelection}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            hasSelection
              ? 'text-[#0071E3] bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] shadow-xs'
              : 'text-[#C7C7CC] dark:text-[#48484A] cursor-not-allowed'
          }`}
          title="Download Selection (ZIP)"
        >
          <DownloadCloud className="w-5 h-5 stroke-[1.75]" />
        </button>

        {/* 🗑 Delete (Trash) */}
        <button
          onClick={handleBulkDelete}
          disabled={!hasSelection}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            hasSelection
              ? 'text-[#0071E3] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10'
              : 'text-[#C7C7CC] dark:text-[#48484A] cursor-not-allowed'
          }`}
          title="Delete Selection"
        >
          <Trash2 className="w-4 h-4 stroke-[1.75]" />
        </button>

        {/* ⊙ More Actions (...) */}
        <div className="relative">
          <button
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#0071E3] hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E] transition-colors"
            title="More Options"
          >
            <MoreHorizontal className="w-4 h-4 stroke-[1.75]" />
          </button>

          {isMoreOpen && (
            <div className="absolute right-0 mt-1 w-52 rounded-2xl bg-white dark:bg-[#2C2C2E] p-1.5 shadow-2xl border border-[#E5E5EA] dark:border-[#3A3A3C] z-50 text-[13px] animate-scale-in">
              {hasSelection && (
                <>
                  <button
                    onClick={() => {
                      openAddToAlbumModal(selectedMediaIds);
                      setIsMoreOpen(false);
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-[#1D1D1F] dark:text-white hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] transition-colors"
                  >
                    <FolderPlus className="w-4 h-4 text-[#0071E3]" />
                    <span>Add to Album</span>
                  </button>

                  <button
                    onClick={() => {
                      handleBulkHide();
                      setIsMoreOpen(false);
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-[#1D1D1F] dark:text-white hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] transition-colors"
                  >
                    <EyeOff className="w-4 h-4 text-[#86868B]" />
                    <span>Hide from Library</span>
                  </button>

                  <div className="my-1 border-t border-[#E5E5EA] dark:border-[#3A3A3C]" />
                </>
              )}

              <button
                onClick={() => {
                  window.dispatchEvent(new Event('cv_media_uploaded'));
                  setIsMoreOpen(false);
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-[#1D1D1F] dark:text-white hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] transition-colors"
              >
                <RefreshCw className="w-4 h-4 text-[#0071E3]" />
                <span>Refresh View</span>
              </button>
            </div>
          )}
        </div>

        {/* 🔍 Search Photos Box (matching Apple iCloud Library toolbar) */}
        <div className="relative ml-2">
          <Search className="w-3.5 h-3.5 text-[#86868B] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Photos"
            className="w-36 sm:w-44 pl-8 pr-7 py-1 rounded-lg bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-transparent focus:border-[#0071E3] text-[12px] text-[#1D1D1F] dark:text-white placeholder-[#86868B] outline-none transition-all focus:w-52"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
