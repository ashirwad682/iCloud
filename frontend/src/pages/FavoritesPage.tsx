import React, { useEffect, useState } from 'react';
import { MediaGrid } from '../components/gallery/MediaGrid';
import { GalleryToolbar } from '../components/gallery/GalleryToolbar';
import { Media, TimelineSection } from '../types';
import { api } from '../services/api';

export const FavoritesPage: React.FC = () => {
  const [timelineSections, setTimelineSections] = useState<TimelineSection[]>([]);
  const [allMedia, setAllMedia] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFavorites = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/media?favorite=true');
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
    fetchFavorites();
    const handleUpdate = () => fetchFavorites();
    window.addEventListener('cv_media_uploaded', handleUpdate);
    return () => window.removeEventListener('cv_media_uploaded', handleUpdate);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <GalleryToolbar allMediaIds={allMedia.map((m) => m._id)} allMedia={allMedia} title="Favorites" />
      <div className="flex-1 overflow-y-auto">
        <MediaGrid
          timelineSections={timelineSections}
          allMedia={allMedia}
          isLoading={isLoading}
          onFavoriteToggle={fetchFavorites}
          emptyTitle="No Favorites"
          emptyDescription="Photos and videos you mark as favorite appear here."
        />
      </div>
    </div>
  );
};
