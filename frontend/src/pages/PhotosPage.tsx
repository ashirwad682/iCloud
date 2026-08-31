import React, { useEffect, useState, useCallback } from 'react';
import { MediaGrid } from '../components/gallery/MediaGrid';
import { GalleryToolbar } from '../components/gallery/GalleryToolbar';
import { Media, TimelineSection } from '../types';
import { api } from '../services/api';
import { useUIStore } from '../stores/uiStore';
import { socketService } from '../services/socket';
const filterItemsByDate = (items: Media[], filter: string): Media[] => {
  const now = Date.now();
  return items.filter((m) => {
    const rawDate = m.capturedAt || m.uploadedAt;
    if (!rawDate) return false;
    const itemDate = new Date(rawDate);
    if (isNaN(itemDate.getTime())) return false;

    if (filter === 'LAST_7_DAYS') {
      return now - itemDate.getTime() <= 7 * 24 * 60 * 60 * 1000;
    }
    if (filter === 'LAST_30_DAYS') {
      return now - itemDate.getTime() <= 30 * 24 * 60 * 60 * 1000;
    }
    // Specific date string format (YYYY-MM-DD)
    const dateStr = itemDate.toISOString().split('T')[0];
    return dateStr === filter;
  });
};

export const PhotosPage: React.FC = () => {
  const { searchQuery, dateFilter } = useUIStore();
  const [timelineSections, setTimelineSections] = useState<TimelineSection[]>([]);
  const [allMedia, setAllMedia] = useState<Media[]>([]);
  const [counts, setCounts] = useState<{ totalPhotos: number; totalVideos: number }>({
    totalPhotos: 0,
    totalVideos: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchMedia = useCallback(async () => {
    setIsLoading(true);
    try {
      if (searchQuery.trim()) {
        const res = await api.get(`/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.data?.success) {
          let items: Media[] = res.data.data;
          if (dateFilter) {
            items = filterItemsByDate(items, dateFilter);
          }
          setAllMedia(items);
          setCounts({
            totalPhotos: items.filter((m) => m.mediaType !== 'VIDEO').length,
            totalVideos: items.filter((m) => m.mediaType === 'VIDEO').length,
          });
          setTimelineSections([
            {
              dateKey: 'search-results',
              title: `Search Results for "${searchQuery}"`,
              formattedDate: `${items.length} matches found`,
              items,
            },
          ]);
        }
      } else {
        const res = await api.get('/media?limit=1000');
        if (res.data?.success) {
          let items: Media[] = res.data.data.items;
          let sections: TimelineSection[] = res.data.data.timelineSections;

          if (dateFilter) {
            items = filterItemsByDate(items, dateFilter);
            // Re-group or filter sections
            sections = sections
              .map((sec) => ({
                ...sec,
                items: filterItemsByDate(sec.items, dateFilter),
              }))
              .filter((sec) => sec.items.length > 0);

            // If custom specific day, label cleanly
            if (sections.length === 0 && items.length > 0) {
              sections = [
                {
                  dateKey: dateFilter,
                  title: dateFilter,
                  formattedDate: `${items.length} ${items.length === 1 ? 'item' : 'items'}`,
                  items,
                },
              ];
            }
          }

          setTimelineSections(sections);
          setAllMedia(items);
          setCounts({
            totalPhotos: items.filter((m) => m.mediaType !== 'VIDEO').length,
            totalVideos: items.filter((m) => m.mediaType === 'VIDEO').length,
          });
        }
      }
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, dateFilter]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  // Listen for real-time media updates via Socket.IO & upload events
  useEffect(() => {
    const socket = socketService.getSocket();
    if (socket) {
      const handleMediaStatus = (event: any) => {
        if (event.status === 'READY') {
          fetchMedia();
        }
      };
      socket.on('media:status', handleMediaStatus);
    }

    const handleCustomUpload = () => {
      fetchMedia();
    };
    window.addEventListener('cv_media_uploaded', handleCustomUpload);

    return () => {
      if (socket) socket.off('media:status');
      window.removeEventListener('cv_media_uploaded', handleCustomUpload);
    };
  }, [fetchMedia]);

  const handleFavoriteToggle = (mediaId: string, isFavorite: boolean) => {
    setAllMedia((prev) =>
      prev.map((m) => (m._id === mediaId ? { ...m, isFavorite } : m))
    );
    setTimelineSections((prev) =>
      prev.map((sec) => ({
        ...sec,
        items: sec.items.map((m) => (m._id === mediaId ? { ...m, isFavorite } : m)),
      }))
    );
  };

  return (
    <div className="flex flex-col h-full">
      <GalleryToolbar allMediaIds={allMedia.map((m) => m._id)} allMedia={allMedia} />
      <div className="flex-1 overflow-y-auto">
        <MediaGrid
          timelineSections={timelineSections}
          allMedia={allMedia}
          isLoading={isLoading}
          onFavoriteToggle={handleFavoriteToggle}
          totalPhotos={counts.totalPhotos}
          totalVideos={counts.totalVideos}
        />
      </div>
    </div>
  );
};
