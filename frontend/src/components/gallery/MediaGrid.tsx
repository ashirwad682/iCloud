import React from 'react';
import { MediaCard } from './MediaCard';
import { TimelineSection, Media } from '../../types';
import { UploadCloud } from 'lucide-react';
import { useUploadStore } from '../../stores/uploadStore';
import { useUIStore } from '../../stores/uiStore';
import { format } from 'date-fns';

interface MediaGridProps {
  timelineSections: TimelineSection[];
  allMedia: Media[];
  isLoading: boolean;
  onFavoriteToggle?: (mediaId: string, isFavorite: boolean) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  totalPhotos?: number;
  totalVideos?: number;
}

export const MediaGrid: React.FC<MediaGridProps> = ({
  timelineSections,
  allMedia,
  isLoading,
  onFavoriteToggle,
  emptyTitle = 'No Photos or Videos',
  emptyDescription = 'Upload photos and videos to access them across all your devices with iCloud.',
  totalPhotos,
  totalVideos,
}) => {
  const { zoomLevel, selectAll } = useUIStore();

  React.useEffect(() => {
    const handleSelectAll = () => {
      selectAll(allMedia.map((m) => m._id));
    };
    window.addEventListener('cv_select_all_media', handleSelectAll);
    return () => window.removeEventListener('cv_select_all_media', handleSelectAll);
  }, [allMedia, selectAll]);

  /**
   * Zoom level 1-5 maps to column count:
   * 1 = many small columns (densest)
   * 3 = default (medium)
   * 5 = large (fewest columns)
   */
  const getGridClass = () => {
    switch (zoomLevel) {
      case 1: return 'grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1 px-5 md:px-7';
      case 2: return 'grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-1.5 px-5 md:px-7';
      case 3: return 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 px-5 md:px-7'; // default (matching 6-column screenshot)
      case 4: return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-2.5 px-5 md:px-7';
      case 5: return 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 px-5 md:px-7';
      default: return 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 px-5 md:px-7';
    }
  };

  const nowFormatted = format(new Date(), 'p');
  const photoCount =
    totalPhotos !== undefined
      ? totalPhotos
      : allMedia.filter((m) => m.mediaType !== 'VIDEO').length;
  const videoCount =
    totalVideos !== undefined
      ? totalVideos
      : allMedia.filter((m) => m.mediaType === 'VIDEO').length;

  const countSummary = () => {
    const parts = [];
    if (photoCount > 0) parts.push(`${photoCount} ${photoCount === 1 ? 'Photo' : 'Photos'}`);
    if (videoCount > 0) parts.push(`${videoCount} ${videoCount === 1 ? 'Video' : 'Videos'}`);
    return parts.length > 0 ? parts.join(', ') : `${allMedia.length} Items`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6 pt-6 pb-20 select-none font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',Helvetica,Arial,sans-serif]">
        <div className="mx-5 md:mx-7 w-44 h-6 bg-[#E5E5EA] dark:bg-[#2C2C2E] rounded-md animate-pulse" />
        <div className={`grid ${getGridClass()}`}>
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-none bg-[#F2F2F7] dark:bg-[#2C2C2E] animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (allMedia.length === 0) {
    return (
      <div className="h-[calc(100vh-9rem)] flex flex-col justify-between items-center text-center p-8 select-none font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Icons','Helvetica_Neue',Helvetica,Arial,sans-serif]">
        <div className="flex-1 flex items-center justify-center">
          <h2 className="font-semibold text-[18px] text-[#86868B] dark:text-[#86868B]">
            {emptyTitle}
          </h2>
        </div>

        {/* Apple iCloud Bottom Footer */}
        <div className="pb-4 text-center text-[#86868B] text-[12px] space-y-0.5 select-none">
          <div className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
            {countSummary()}
          </div>
          <div>Updated {nowFormatted}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-32 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',Helvetica,Arial,sans-serif]">
      {timelineSections.map((section) => (
        <section key={section.dateKey} className="mb-6">
          {/* Section date heading — large bold title + gray subtitle */}
          <div className="px-5 md:px-7 pt-6 pb-3">
            <h2 className="font-bold text-[22px] text-[#1D1D1F] dark:text-[#F5F5F7] tracking-[-0.3px] leading-tight">
              {section.title}
            </h2>
            {section.formattedDate && section.formattedDate !== section.title && (
              <p className="text-[13px] text-[#86868B] mt-0.5 font-normal">{section.formattedDate}</p>
            )}
          </div>

          {/* Uniform square photo grid — all items same size, perfectly aligned */}
          <div className={`grid ${getGridClass()}`}>
            {section.items.map((item) => (
              <MediaCard
                key={item._id}
                media={item}
                allMedia={allMedia}
                onFavoriteToggle={onFavoriteToggle}
              />
            ))}
          </div>
        </section>
      ))}

      {/* Footer count */}
      <div className="pt-10 pb-8 text-center text-[#86868B] text-[12px] space-y-0.5 select-none border-t border-[#F2F2F7] dark:border-[#2C2C2E]/60 mx-4 md:mx-6">
        <div className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
          {countSummary()}
        </div>
        <div>Updated {nowFormatted}</div>
      </div>
    </div>
  );
};
