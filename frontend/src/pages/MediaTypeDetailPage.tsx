import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Video, Camera, Smartphone, Compass, Image as ImageIcon } from 'lucide-react';
import { MediaGrid } from '../components/gallery/MediaGrid';
import { GalleryToolbar } from '../components/gallery/GalleryToolbar';
import { Media, TimelineSection } from '../types';
import { api } from '../services/api';

const TYPE_CONFIG: Record<
  string,
  { title: string; icon: any; emptyTitle: string; emptyDescription: string }
> = {
  videos: {
    title: 'Videos',
    icon: Video,
    emptyTitle: 'No Videos',
    emptyDescription: 'Videos uploaded to your iCloud library will appear here.',
  },
  photos: {
    title: 'Photos',
    icon: ImageIcon,
    emptyTitle: 'No Photos',
    emptyDescription: 'Photos uploaded to your iCloud library will appear here.',
  },
  selfies: {
    title: 'Selfies & Portraits',
    icon: Camera,
    emptyTitle: 'No Selfies or Portraits',
    emptyDescription: 'Photos recognized as portraits, selfies, or people appear here.',
  },
  screenshots: {
    title: 'Screenshots',
    icon: Smartphone,
    emptyTitle: 'No Screenshots',
    emptyDescription: 'Screenshots saved to your devices appear here.',
  },
  panoramas: {
    title: 'Panoramas',
    icon: Compass,
    emptyTitle: 'No Panoramas',
    emptyDescription: 'Panoramic and wide-angle photos appear here.',
  },
};

export const MediaTypeDetailPage: React.FC = () => {
  const { type = 'photos' } = useParams<{ type: string }>();
  const navigate = useNavigate();

  const [timelineSections, setTimelineSections] = useState<TimelineSection[]>([]);
  const [allMedia, setAllMedia] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const config = TYPE_CONFIG[type.toLowerCase()] || {
    title: type.charAt(0).toUpperCase() + type.slice(1),
    icon: ImageIcon,
    emptyTitle: `No ${type}`,
    emptyDescription: `Items matching this media type will appear here.`,
  };

  const fetchMediaType = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/media?filter=${type.toLowerCase()}&limit=300`);
      if (res.data?.success) {
        setTimelineSections(res.data.data.timelineSections);
        setAllMedia(res.data.data.items);
      }
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetchMediaType();
    const handleUpdate = () => fetchMediaType();
    window.addEventListener('cv_media_uploaded', handleUpdate);
    return () => window.removeEventListener('cv_media_uploaded', handleUpdate);
  }, [fetchMediaType]);

  return (
    <div className="flex flex-col h-full font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Icons','Helvetica_Neue',Helvetica,Arial,sans-serif]">
      <GalleryToolbar allMediaIds={allMedia.map((m) => m._id)} allMedia={allMedia} title={config.title} />

      {/* Header bar */}
      <div className="px-6 md:px-8 pt-6 pb-2 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/media-types')}
            className="w-8 h-8 rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] flex items-center justify-center text-[#0071E3] transition-colors"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2]" />
          </button>
          <div>
            <h1 className="font-bold text-[24px] text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
              {config.title}
            </h1>
            <p className="text-[12px] text-[#86868B]">
              {allMedia.length} {allMedia.length === 1 ? 'item' : 'items'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <MediaGrid
          timelineSections={timelineSections}
          allMedia={allMedia}
          isLoading={isLoading}
          onFavoriteToggle={fetchMediaType}
          emptyTitle={config.emptyTitle}
          emptyDescription={config.emptyDescription}
        />
      </div>
    </div>
  );
};
