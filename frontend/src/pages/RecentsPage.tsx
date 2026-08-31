import React, { useEffect, useState } from 'react';
import { MediaGrid } from '../components/gallery/MediaGrid';
import { GalleryToolbar } from '../components/gallery/GalleryToolbar';
import { Media, TimelineSection } from '../types';
import { api } from '../services/api';

export const RecentsPage: React.FC = () => {
  const [timelineSections, setTimelineSections] = useState<TimelineSection[]>([]);
  const [allMedia, setAllMedia] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRecents = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/media?filter=recents&limit=200');
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
    fetchRecents();
    const handleUpdate = () => fetchRecents();
    window.addEventListener('cv_media_uploaded', handleUpdate);
    return () => window.removeEventListener('cv_media_uploaded', handleUpdate);
  }, []);

  return (
    <div className="flex flex-col h-full font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Icons','Helvetica_Neue',Helvetica,Arial,sans-serif]">
      <GalleryToolbar allMediaIds={allMedia.map((m) => m._id)} allMedia={allMedia} title="Recents" />
      <div className="flex-1 overflow-y-auto">
        <MediaGrid
          timelineSections={timelineSections}
          allMedia={allMedia}
          isLoading={isLoading}
          onFavoriteToggle={fetchRecents}
          emptyTitle="No Recent Uploads"
          emptyDescription="Photos and videos added in the last 30 days appear here in the order they were uploaded."
        />
      </div>
    </div>
  );
};
