import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Info,
  Download,
  Heart,
  Share2,
  Trash2,
  Eye,
  EyeOff,
  FolderPlus,
  Camera,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { api, resolveMediaUrl } from '../../services/api';
import { format } from 'date-fns';


export const MediaViewerModal: React.FC = () => {
  const {
    viewerMedia,
    setViewerMedia,
    nextMedia,
    prevMedia,
    openShareModal,
    openAddToAlbumModal,
  } = useUIStore();

  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isHideConfirmOpen, setIsHideConfirmOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Keyboard navigation handler
  useEffect(() => {
    if (!viewerMedia) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isHideConfirmOpen) {
          setIsHideConfirmOpen(false);
        } else {
          setViewerMedia(null);
        }
      }
      if (e.key === 'ArrowRight' && !isHideConfirmOpen) {
        setZoom(1);
        setRotation(0);
        nextMedia();
      }
      if (e.key === 'ArrowLeft' && !isHideConfirmOpen) {
        setZoom(1);
        setRotation(0);
        prevMedia();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewerMedia, isHideConfirmOpen, nextMedia, prevMedia, setViewerMedia]);

  if (!viewerMedia) return null;

  const isVideo = viewerMedia.mediaType === 'VIDEO';

  const handleFavoriteToggle = async () => {
    try {
      const nextFav = !viewerMedia.isFavorite;
      await api.patch(`/media/${viewerMedia._id}`, { isFavorite: nextFav });
      setViewerMedia({ ...viewerMedia, isFavorite: nextFav });
      window.dispatchEvent(new Event('cv_media_uploaded'));
    } catch {
      // Ignore
    }
  };

  const handleHideToggle = async () => {
    if (viewerMedia.isHidden) {
      // Unhide directly
      try {
        await api.patch(`/media/${viewerMedia._id}`, { isHidden: false });
        setViewerMedia({ ...viewerMedia, isHidden: false });
        window.dispatchEvent(new Event('cv_media_uploaded'));
      } catch {}
    } else {
      // Open Apple confirmation modal
      setIsHideConfirmOpen(true);
    }
  };

  const confirmHide = async () => {
    try {
      await api.patch(`/media/${viewerMedia._id}`, { isHidden: true });
      setIsHideConfirmOpen(false);
      setViewerMedia(null);
      window.dispatchEvent(new Event('cv_media_uploaded'));
    } catch {
      // Ignore
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/media/${viewerMedia._id}`);
      setViewerMedia(null);
      window.dispatchEvent(new Event('cv_media_uploaded'));
    } catch {
      // Ignore
    }
  };

  const handleDownload = () => {
    if (viewerMedia.originalUrl || viewerMedia.previewUrl) {
      const link = document.createElement('a');
      link.href = viewerMedia.originalUrl || viewerMedia.previewUrl!;
      link.download = viewerMedia.originalName;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-[#161618] flex flex-col select-none animate-fade-in font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Icons','Helvetica_Neue',Helvetica,Arial,sans-serif] text-[#1D1D1F] dark:text-[#F5F5F7]">
      {/* Top Controls Header */}
      <header className="h-16 px-4 md:px-6 flex items-center justify-between z-20 bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-xl border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setViewerMedia(null)}
            className="w-9 h-9 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] text-[#1D1D1F] dark:text-white flex items-center justify-center transition-all"
            title="Close (Esc)"
          >
            <X className="w-5 h-5 stroke-[2]" />
          </button>
          <div>
            <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-white truncate max-w-xs md:max-w-md">
              {viewerMedia.originalName}
            </h3>
            <p className="text-[11px] text-[#86868B]">
              {format(new Date(viewerMedia.capturedAt), 'PPP p')}
            </p>
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="flex items-center space-x-1.5">
          {!isVideo && (
            <>
              <button
                onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
                className="w-9 h-9 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] text-[#1D1D1F] dark:text-white flex items-center justify-center transition-all"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4 stroke-[1.75]" />
              </button>
              <button
                onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
                className="w-9 h-9 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] text-[#1D1D1F] dark:text-white flex items-center justify-center transition-all"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4 stroke-[1.75]" />
              </button>
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="w-9 h-9 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] text-[#1D1D1F] dark:text-white flex items-center justify-center transition-all"
                title="Rotate 90°"
              >
                <RotateCw className="w-4 h-4 stroke-[1.75]" />
              </button>
            </>
          )}

          <button
            onClick={handleFavoriteToggle}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              viewerMedia.isFavorite
                ? 'bg-[#FF2D55]/10 text-[#FF2D55]'
                : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] text-[#1D1D1F] dark:text-white'
            }`}
            title="Favorite"
          >
            <Heart className={`w-4 h-4 stroke-[1.75] ${viewerMedia.isFavorite ? 'fill-[#FF2D55]' : ''}`} />
          </button>

          <button
            onClick={handleHideToggle}
            className="w-9 h-9 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] text-[#1D1D1F] dark:text-white flex items-center justify-center transition-all"
            title={viewerMedia.isHidden ? 'Unhide Photo' : 'Hide from Library'}
          >
            {viewerMedia.isHidden ? <Eye className="w-4 h-4 text-[#34C759]" /> : <EyeOff className="w-4 h-4 stroke-[1.75]" />}
          </button>

          <button
            onClick={() => openShareModal({ type: 'MEDIA', id: viewerMedia._id })}
            className="w-9 h-9 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] text-[#1D1D1F] dark:text-white flex items-center justify-center transition-all"
            title="Share"
          >
            <Share2 className="w-4 h-4 stroke-[1.75]" />
          </button>

          <button
            onClick={() => openAddToAlbumModal([viewerMedia._id])}
            className="w-9 h-9 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] text-[#1D1D1F] dark:text-white flex items-center justify-center transition-all"
            title="Add to Album"
          >
            <FolderPlus className="w-4 h-4 stroke-[1.75]" />
          </button>

          <button
            onClick={handleDownload}
            className="w-9 h-9 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] text-[#0071E3] flex items-center justify-center transition-all"
            title="Download Original"
          >
            <Download className="w-4 h-4 stroke-[1.75]" />
          </button>

          <button
            onClick={() => setIsInfoOpen(!isInfoOpen)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              isInfoOpen
                ? 'bg-[#0071E3] text-white shadow-sm'
                : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] text-[#1D1D1F] dark:text-white'
            }`}
            title="Info"
          >
            <Info className="w-4 h-4 stroke-[1.75]" />
          </button>

          <button
            onClick={handleDelete}
            className="w-9 h-9 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#FF3B30]/10 text-[#86868B] hover:text-[#FF3B30] flex items-center justify-center transition-all"
            title="Move to Trash"
          >
            <Trash2 className="w-4 h-4 stroke-[1.75]" />
          </button>
        </div>
      </header>

      {/* Main View Area with Clean Light Apple Backdrop */}
      <div className="flex-1 flex relative overflow-hidden bg-[#F5F5F7] dark:bg-[#161618]">
        {/* Left Arrow Navigation */}
        <button
          onClick={() => {
            setZoom(1);
            setRotation(0);
            prevMedia();
          }}
          className="absolute left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/95 dark:bg-[#2C2C2E]/95 hover:bg-white shadow-xl border border-[#E5E5EA] dark:border-[#3A3A3C] flex items-center justify-center text-[#1D1D1F] dark:text-white z-20 transition-all hover:scale-105"
        >
          <ChevronLeft className="w-6 h-6 stroke-[2]" />
        </button>

        {/* Media Container */}
        <div className="flex-1 flex items-center justify-center p-6 md:p-10 overflow-hidden">
          {isVideo ? (
            <video
              src={resolveMediaUrl(viewerMedia.originalUrl || viewerMedia.previewUrl)}
              controls
              autoPlay
              className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain"
            />
          ) : (
            <img
              src={resolveMediaUrl(viewerMedia.previewUrl || viewerMedia.thumbnailUrl || viewerMedia.originalUrl)}
              alt={viewerMedia.originalName}
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transition: 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
              }}
              className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain select-none cursor-grab active:cursor-grabbing"
              draggable={false}
            />
          )}
        </div>

        {/* Right Arrow Navigation */}
        <button
          onClick={() => {
            setZoom(1);
            setRotation(0);
            nextMedia();
          }}
          className="absolute right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/95 dark:bg-[#2C2C2E]/95 hover:bg-white shadow-xl border border-[#E5E5EA] dark:border-[#3A3A3C] flex items-center justify-center text-[#1D1D1F] dark:text-white z-20 transition-all hover:scale-105"
        >
          <ChevronRight className="w-6 h-6 stroke-[2]" />
        </button>

        {/* Sliding EXIF Info Drawer (Clean Apple White Card) */}
        {isInfoOpen && (
          <aside className="w-80 md:w-96 bg-white dark:bg-[#1C1C1E] border-l border-[#E5E5EA] dark:border-[#2C2C2E] p-6 overflow-y-auto z-30 animate-enter text-[#1D1D1F] dark:text-white shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#E5E5EA] dark:border-[#2C2C2E] mb-6">
              <h4 className="font-bold text-[16px] text-[#1D1D1F] dark:text-white flex items-center space-x-2">
                <Info className="w-4 h-4 text-[#0071E3]" />
                <span>Information</span>
              </h4>
              <button
                onClick={() => setIsInfoOpen(false)}
                className="w-7 h-7 rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-6 text-[12px]">
              {/* File Specs */}
              <div>
                <span className="font-semibold uppercase tracking-wider text-[10px] text-[#86868B] block mb-2">
                  File Details
                </span>
                <div className="space-y-2">
                  <div className="flex justify-between py-1.5 border-b border-[#F2F2F7] dark:border-[#2C2C2E]">
                    <span className="text-[#86868B]">Original Name</span>
                    <span className="font-medium truncate max-w-[180px] text-[#1D1D1F] dark:text-white">
                      {viewerMedia.originalName}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#F2F2F7] dark:border-[#2C2C2E]">
                    <span className="text-[#86868B]">File Size</span>
                    <span className="font-medium text-[#1D1D1F] dark:text-white">
                      {(viewerMedia.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#F2F2F7] dark:border-[#2C2C2E]">
                    <span className="text-[#86868B]">Dimensions</span>
                    <span className="font-medium text-[#1D1D1F] dark:text-white">
                      {viewerMedia.width || '-'} × {viewerMedia.height || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#F2F2F7] dark:border-[#2C2C2E]">
                    <span className="text-[#86868B]">Format</span>
                    <span className="font-medium uppercase text-[#1D1D1F] dark:text-white">
                      {viewerMedia.mimeType.split('/')[1]}
                    </span>
                  </div>
                </div>
              </div>

              {/* Camera & Lens EXIF */}
              {viewerMedia.metadata?.make && (
                <div>
                  <span className="font-semibold uppercase tracking-wider text-[10px] text-[#86868B] flex items-center space-x-1 mb-2">
                    <Camera className="w-3.5 h-3.5 text-[#0071E3]" />
                    <span>Camera & Optics</span>
                  </span>
                  <div className="p-3.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#3A3A3C] space-y-1.5">
                    <div className="font-semibold text-[#1D1D1F] dark:text-white">
                      {viewerMedia.metadata.make} {viewerMedia.metadata.model}
                    </div>
                    {viewerMedia.metadata.lens && (
                      <div className="text-[#86868B] text-[11px]">{viewerMedia.metadata.lens}</div>
                    )}
                    <div className="flex items-center space-x-3 text-[#86868B] font-mono text-[11px] pt-1">
                      {viewerMedia.metadata.focalLength && (
                        <span>{viewerMedia.metadata.focalLength}mm</span>
                      )}
                      {viewerMedia.metadata.fNumber && <span>ƒ/{viewerMedia.metadata.fNumber}</span>}
                      {viewerMedia.metadata.exposureTime && (
                        <span>{viewerMedia.metadata.exposureTime}s</span>
                      )}
                      {viewerMedia.metadata.iso && <span>ISO {viewerMedia.metadata.iso}</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* Color Palette */}
              {viewerMedia.metadata?.colorPalette && viewerMedia.metadata.colorPalette.length > 0 && (
                <div>
                  <span className="font-semibold uppercase tracking-wider text-[10px] text-[#86868B] flex items-center space-x-1 mb-2">
                    <Layers className="w-3.5 h-3.5 text-[#0071E3]" />
                    <span>Dominant Palette</span>
                  </span>
                  <div className="flex space-x-2">
                    {viewerMedia.metadata.colorPalette.map((color, idx) => (
                      <div
                        key={idx}
                        className="w-8 h-8 rounded-lg border border-[#E5E5EA] dark:border-[#3A3A3C] shadow-sm"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* AI Tags */}
              {viewerMedia.aiMetadata?.tags && viewerMedia.aiMetadata.tags.length > 0 && (
                <div>
                  <span className="font-semibold uppercase tracking-wider text-[10px] text-[#86868B] flex items-center space-x-1 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#0071E3]" />
                    <span>AI Detected Categories</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {viewerMedia.aiMetadata.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#3A3A3C] text-[#1D1D1F] dark:text-white font-medium text-[11px]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Apple Hide Confirmation Dialog */}
      {isHideConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 animate-enter">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#2C2C2E] p-6 shadow-2xl border border-[#E5E5EA] dark:border-[#3A3A3C] text-center">
            <div className="w-12 h-12 rounded-full bg-[#0071E3]/10 text-[#0071E3] mx-auto flex items-center justify-center mb-3">
              <EyeOff className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-[16px] text-[#1D1D1F] dark:text-white mb-1.5">
              Hide Photo?
            </h3>
            <p className="text-[13px] text-[#86868B] mb-5 leading-relaxed">
              This photo will be hidden from your Library and Albums. You can find and unhide it anytime in your password-protected Hidden album.
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
                onClick={confirmHide}
                className="flex-1 py-2.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-[13px] font-medium text-white shadow-sm"
              >
                Hide Photo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
