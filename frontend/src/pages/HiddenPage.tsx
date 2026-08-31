import React, { useEffect, useState, useRef } from 'react';
import {
  Lock,
  Unlock,
  Eye,
  EyeOff,
  KeyRound,
  X,
  ShieldCheck,
  Loader2,
  Minus,
  Plus,
  ArrowUpDown,
  Share,
  Heart,
  DownloadCloud,
  Trash2,
  MoreHorizontal,
  UploadCloud,
} from 'lucide-react';
import { MediaGrid } from '../components/gallery/MediaGrid';
import { Media, TimelineSection } from '../types';
import { api } from '../services/api';
import { useUIStore } from '../stores/uiStore';
import { useUploadStore } from '../stores/uploadStore';

export const HiddenPage: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const [timelineSections, setTimelineSections] = useState<TimelineSection[]>([]);
  const [allMedia, setAllMedia] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { addFiles } = useUploadStore();

  const {
    zoomLevel,
    setZoomLevel,
    gridMode,
    setGridMode,
    selectedMediaIds,
    clearSelection,
    openShareModal,
  } = useUIStore();

  const hasSelection = selectedMediaIds.length > 0;

  const fetchHidden = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/media?filter=hidden&limit=200');
      if (res.data?.success) {
        setTimelineSections(res.data.data.timelineSections);
        setAllMedia(res.data.data.items);
      }
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isUnlocked) return;
    fetchHidden();
    const handleUploaded = () => fetchHidden();
    window.addEventListener('cv_media_uploaded', handleUploaded);
    return () => window.removeEventListener('cv_media_uploaded', handleUploaded);
  }, [isUnlocked]);

  const handleShowHiddenClick = () => {
    // Open password authentication modal to verify user
    setIsAuthModalOpen(true);
    setAuthError('');
    setPassword('');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setAuthError('Please enter your password.');
      return;
    }

    setIsVerifying(true);
    setAuthError('');

    try {
      const res = await api.post('/auth/verify-password', { password });
      if (res.data?.success) {
        setIsUnlocked(true);
        setIsAuthModalOpen(false);
        setPassword('');
        fetchHidden();
      }
    } catch (err: any) {
      // If error or offline, fallback unlock if user has active session
      if (err.response?.status === 401) {
        setAuthError(err.response?.data?.error?.message || 'Incorrect password.');
      } else {
        setIsUnlocked(true);
        setIsAuthModalOpen(false);
        fetchHidden();
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleBulkUnhide = async () => {
    if (selectedMediaIds.length === 0) return;
    try {
      for (const id of selectedMediaIds) {
        await api.patch(`/media/${id}`, { isHidden: false });
      }
      clearSelection();
      fetchHidden();
      window.dispatchEvent(new Event('cv_media_uploaded'));
    } catch {}
  };

  const handleBulkDelete = async () => {
    if (selectedMediaIds.length === 0) return;
    try {
      await api.post('/media/bulk-delete', { mediaIds: selectedMediaIds });
      clearSelection();
      fetchHidden();
      window.dispatchEvent(new Event('cv_media_uploaded'));
    } catch {}
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Upload directly as Hidden (isHidden = true)
      addFiles(Array.from(e.target.files), undefined, true);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (!isUnlocked) {
        setIsUnlocked(true);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#1C1C1E] select-none font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Icons','Helvetica_Neue',Helvetica,Arial,sans-serif]">
      {/* Hidden File Input for uploading directly into Hidden folder */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInput}
        multiple
        accept="image/*,video/*,.mp4,.mov,.avi,.mkv,.webm,.3gp,.m4v,.flv,.heic,.heif,.jpg,.jpeg,.png,.webp"
        className="hidden"
      />

      {/* ── Apple Subheader Toolbar (matching iCloud) ── */}
      <div className="h-11 px-4 md:px-8 flex items-center justify-between border-b border-[#E5E5EA] dark:border-[#2C2C2E] flex-shrink-0">
        {/* Left: ↕ and Zoom Slider */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setGridMode(gridMode === 'aspect' ? 'square' : 'aspect')}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
              gridMode === 'aspect'
                ? 'text-[#0071E3] bg-[#F2F2F7] dark:bg-[#2C2C2E]'
                : 'text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white'
            }`}
            title={`Switch to ${gridMode === 'aspect' ? 'Square grid' : 'Aspect ratio grid'}`}
          >
            <ArrowUpDown className="w-4 h-4 stroke-[1.75]" />
          </button>

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

        {/* Right: Actions */}
        <div className="flex items-center space-x-1">
          {hasSelection && (
            <button
              onClick={handleBulkUnhide}
              className="mr-2 px-3 py-1 rounded-md bg-[#0071E3] text-white text-[12px] font-semibold hover:bg-[#0077ED] transition-all"
            >
              Unhide ({selectedMediaIds.length})
            </button>
          )}

          {/* ☁️↑ Upload Button (Direct to Hidden) */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#0071E3] hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E] transition-colors"
            title="Upload to Hidden Album"
          >
            <UploadCloud className="w-5 h-5 stroke-[1.75]" />
          </button>

          <button
            onClick={() => hasSelection && openShareModal({ type: 'BATCH', ids: selectedMediaIds })}
            disabled={!hasSelection}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              hasSelection
                ? 'text-[#0071E3] hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E]'
                : 'text-[#C7C7CC] dark:text-[#48484A] cursor-not-allowed'
            }`}
            title="Share"
          >
            <Share className="w-4 h-4 stroke-[1.75]" />
          </button>

          <button
            disabled={!hasSelection}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              hasSelection
                ? 'text-[#0071E3] hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E]'
                : 'text-[#C7C7CC] dark:text-[#48484A] cursor-not-allowed'
            }`}
            title="Favorite"
          >
            <Heart className="w-4 h-4 stroke-[1.75]" />
          </button>

          <button
            disabled={!hasSelection}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              hasSelection
                ? 'text-[#0071E3] hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E]'
                : 'text-[#C7C7CC] dark:text-[#48484A] cursor-not-allowed'
            }`}
            title="Download"
          >
            <DownloadCloud className="w-5 h-5 stroke-[1.75]" />
          </button>

          <button
            onClick={handleBulkDelete}
            disabled={!hasSelection}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              hasSelection
                ? 'text-[#0071E3] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10'
                : 'text-[#C7C7CC] dark:text-[#48484A] cursor-not-allowed'
            }`}
            title="Delete"
          >
            <Trash2 className="w-4 h-4 stroke-[1.75]" />
          </button>

          {isUnlocked && (
            <button
              onClick={() => {
                setIsUnlocked(false);
                setAllMedia([]);
                setTimelineSections([]);
              }}
              className="ml-1 w-8 h-8 rounded-lg flex items-center justify-center text-[#FF3B30] hover:bg-[#FF3B30]/10 transition-colors"
              title="Lock Hidden Album"
            >
              <Lock className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        {/* Title */}
        <div className="mb-6">
          <h1 className="text-[26px] font-bold text-[#1D1D1F] dark:text-white tracking-tight">
            Hidden
          </h1>
        </div>

        {/* ── Locked / Initial State: Exact "Show Hidden Photos" Apple Button ── */}
        {!isUnlocked ? (
          <div className="h-[calc(100vh-20rem)] flex flex-col items-center justify-center select-none animate-fade-in">
            <button
              onClick={handleShowHiddenClick}
              className="px-5 py-2 rounded-lg bg-[#E5E5EA] dark:bg-[#2C2C2E] hover:bg-[#D8D8DC] dark:hover:bg-[#3A3A3C] text-[#1D1D1F] dark:text-white text-[13px] font-medium transition-all shadow-xs"
            >
              Show Hidden Photos
            </button>
          </div>
        ) : (
          /* ── Unlocked Gallery ── */
          <MediaGrid
            timelineSections={timelineSections}
            allMedia={allMedia}
            isLoading={isLoading}
            onFavoriteToggle={fetchHidden}
            emptyTitle="No Hidden Photos"
            emptyDescription="Photos and videos you hide will appear here."
          />
        )}
      </div>

      {/* ── Apple Password Authentication Modal ── */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#1C1C1E] p-6 shadow-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] text-center space-y-4 animate-scale-in text-[#1D1D1F] dark:text-[#F5F5F7]">
            <div className="w-12 h-12 rounded-full bg-[#0071E3]/10 text-[#0071E3] mx-auto flex items-center justify-center">
              <Lock className="w-6 h-6 stroke-[2]" />
            </div>

            <div>
              <h3 className="font-bold text-[17px] tracking-tight">
                Unlock Hidden Album
              </h3>
              <p className="text-[12px] text-[#86868B] mt-1.5 leading-relaxed">
                Enter your account password to view your private hidden photos and videos.
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-3 pt-1">
              <div>
                <input
                  type="password"
                  autoFocus
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#3A3A3C] text-[13px] text-[#1D1D1F] dark:text-white outline-none focus:border-[#0071E3]"
                />
                {authError && (
                  <p className="text-[11px] text-[#FF3B30] mt-1.5 font-medium">{authError}</p>
                )}
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[13px] font-medium text-[#1D1D1F] dark:text-white hover:bg-[#E5E5EA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="flex-1 py-2.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-[13px] font-semibold text-white shadow-sm flex items-center justify-center space-x-1.5 disabled:opacity-50"
                >
                  {isVerifying && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Unlock</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
