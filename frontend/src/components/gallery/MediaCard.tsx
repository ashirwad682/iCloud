import React, { useState } from 'react';
import { Play, Heart, CheckCircle2, Circle, Loader2, Image as ImageIcon } from 'lucide-react';
import { Media } from '../../types';
import { useUIStore } from '../../stores/uiStore';
import { api, resolveMediaUrl } from '../../services/api';

interface MediaCardProps {
  media: Media;
  allMedia: Media[];
  onFavoriteToggle?: (mediaId: string, isFavorite: boolean) => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  media,
  allMedia,
  onFavoriteToggle,
}) => {
  const {
    selectedMediaIds,
    toggleSelect,
    setViewerMedia,
    gridMode,
  } = useUIStore();

  const [hasImgError, setHasImgError] = useState(false);
  const isSelected = selectedMediaIds.includes(media._id);
  const isVideo = media.mediaType === 'VIDEO' || media.mimeType?.startsWith('video/') || media.originalName?.toLowerCase().endsWith('.mp4');
  const isProcessing = media.status === 'UPLOADING' || media.status === 'PROCESSING';

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const newFav = !media.isFavorite;
      await api.patch(`/media/${media._id}`, { isFavorite: newFav });
      if (onFavoriteToggle) onFavoriteToggle(media._id, newFav);
    } catch {
      // Ignore
    }
  };

  const handleSelectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSelect(media._id);
  };

  const handleCardClick = () => {
    if (selectedMediaIds.length > 0) {
      toggleSelect(media._id);
    } else {
      setViewerMedia(media, allMedia);
    }
  };

  const mediaUrl = resolveMediaUrl(media.thumbnailUrl || media.previewUrl || media.originalUrl);

  return (
    <div
      onClick={handleCardClick}
      className={`group relative overflow-hidden cursor-pointer select-none transition-all duration-200 bg-[#E5E5EA] dark:bg-[#2C2C2E] ${
        // Square (default) vs Aspect-ratio mode (toggled by ↕ button)
        gridMode === 'aspect'
          ? media.aspectRatio && media.aspectRatio < 0.9
            ? 'aspect-[3/4]'
            : media.aspectRatio && media.aspectRatio > 1.4
            ? 'aspect-[16/9]'
            : 'aspect-square'
          : 'aspect-square'
      } ${
        isSelected
          ? 'ring-2 ring-inset ring-[#0071E3] opacity-90'
          : 'hover:opacity-95'
      }`}
    >
      {/* Media Rendering: Image or Video */}
      {isProcessing ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-[#F2F2F7] dark:bg-[#2C2C2E]">
          <Loader2 className="w-5 h-5 text-[#0071E3] animate-spin mb-1.5" />
          <span className="text-[11px] font-medium text-[#86868B]">Processing...</span>
        </div>
      ) : hasImgError ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-[#F2F2F7] dark:bg-[#2C2C2E]">
          <div className="w-9 h-9 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center mb-1.5 text-[#86868B]">
            <ImageIcon className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-medium text-[#86868B] truncate max-w-[90%]">
            {media.originalName}
          </span>
        </div>
      ) : isVideo ? (
        <div className="w-full h-full relative bg-black/80 flex items-center justify-center overflow-hidden">
          <video
            src={mediaUrl}
            preload="metadata"
            muted
            playsInline
            onError={() => setHasImgError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 pointer-events-none"
          />
          <div className="absolute inset-0 bg-black/25 flex items-center justify-center group-hover:bg-black/10 transition-colors pointer-events-none">
            <div className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white shadow-lg border border-white/20">
              <Play className="w-3.5 h-3.5 fill-white translate-x-0.5" />
            </div>
          </div>
        </div>
      ) : (
        <img
          src={mediaUrl}
          alt={media.originalName}
          loading="lazy"
          onError={() => setHasImgError(true)}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      )}



      {/* Video Indicator */}
      {isVideo && (
        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md flex items-center space-x-1 text-white text-[10px] font-medium pointer-events-none">
          <Play className="w-2.5 h-2.5 fill-white" />
          <span>{media.duration ? `${Math.round(media.duration)}s` : 'Video'}</span>
        </div>
      )}

      {/* Selection Checkbox (Top Right) */}
      <button
        onClick={handleSelectClick}
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

      {/* Favorite Heart (Bottom Left) */}
      <button
        onClick={handleFavoriteClick}
        className={`absolute bottom-2 left-2 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-150 ${
          media.isFavorite
            ? 'opacity-100 text-[#FF2D55] bg-black/40 backdrop-blur-md'
            : 'opacity-0 group-hover:opacity-100 bg-black/40 text-white/90 hover:text-[#FF2D55] backdrop-blur-md'
        }`}
      >
        <Heart className={`w-3.5 h-3.5 ${media.isFavorite ? 'fill-[#FF2D55]' : ''}`} />
      </button>

      {/* Bottom Subtitle / Add Title on Hover */}
      <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none text-center">
        <span className="text-[10px] font-medium text-white/90 truncate block max-w-[90%] mx-auto">
          {media.originalName}
        </span>
      </div>
    </div>
  );
};
