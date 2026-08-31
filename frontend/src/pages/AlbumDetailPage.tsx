import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Trash2, Share } from 'lucide-react';
import { Album, Media } from '../types';
import { api } from '../services/api';
import { MediaCard } from '../components/gallery/MediaCard';
import { GalleryToolbar } from '../components/gallery/GalleryToolbar';
import { useUIStore } from '../stores/uiStore';

export const AlbumDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { openShareModal, zoomLevel, selectAll } = useUIStore();

  const [album, setAlbum] = useState<Album | null>(null);
  const [items, setItems] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAlbum = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await api.get(`/albums/${id}`);
      if (res.data?.success) {
        setAlbum(res.data.data.album);
        setItems(res.data.data.items);
      }
    } catch {
      navigate('/albums');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlbum();

    const handleUploaded = () => {
      fetchAlbum();
    };
    const handleSelectAll = () => {
      selectAll(items.map((m) => m._id));
    };

    window.addEventListener('cv_media_uploaded', handleUploaded);
    window.addEventListener('cv_select_all_media', handleSelectAll);
    return () => {
      window.removeEventListener('cv_media_uploaded', handleUploaded);
      window.removeEventListener('cv_select_all_media', handleSelectAll);
    };
  }, [id, items, selectAll]);

  const handleDeleteAlbum = async () => {
    if (!id || !window.confirm('Are you sure you want to delete this album? Photos will remain in your library.')) {
      return;
    }
    try {
      await api.delete(`/albums/${id}`);
      navigate('/albums');
    } catch {
      // Ignore
    }
  };

  const getGridColsClass = () => {
    switch (zoomLevel) {
      case 1:
        return 'grid-cols-4 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8 gap-2';
      case 2:
        return 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3';
      case 3:
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4';
      case 4:
        return 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5';
      case 5:
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6';
      default:
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4';
    }
  };

  if (isLoading && !album) {
    return <div className="p-8 text-[13px] text-[#86868B]">Loading album...</div>;
  }

  if (!album) return null;

  return (
    <div className="flex flex-col h-full font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Icons','Helvetica_Neue',Helvetica,Arial,sans-serif]">
      <GalleryToolbar albumId={id} allMediaIds={items.map((m) => m._id)} allMedia={items} title={album.title} />

      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 pb-28">
        {/* Apple iCloud Album Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/albums')}
              className="w-8 h-8 rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] flex items-center justify-center text-[#0071E3] transition-colors"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2]" />
            </button>
            <div>
              <h1 className="font-bold text-[24px] text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
                {album.title}
              </h1>
              <p className="text-[12px] text-[#86868B]">
                {items.length} {items.length === 1 ? 'item' : 'items'}
                {album.description && ` · ${album.description}`}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => openShareModal({ type: 'ALBUM', id: album._id })}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] text-[13px] font-medium text-[#0071E3] transition-all"
            >
              <Share className="w-4 h-4 stroke-[1.75]" />
              <span>Share Album</span>
            </button>
            <button
              onClick={handleDeleteAlbum}
              className="w-8 h-8 rounded-lg bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#FF3B30]/10 text-[#86868B] hover:text-[#FF3B30] flex items-center justify-center transition-colors"
              title="Delete Album"
            >
              <Trash2 className="w-4 h-4 stroke-[1.75]" />
            </button>
          </div>
        </div>

        {/* Media Grid */}
        {items.length === 0 ? (
          <div className="text-center py-20 text-[13px] text-[#86868B]">
            No photos in this album yet. Drag and drop photos here or click the upload icon above.
          </div>
        ) : (
          <div className={`grid ${getGridColsClass()}`}>
            {items.map((item) => (
              <MediaCard key={item._id} media={item} allMedia={items} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
