import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Video,
  Camera,
  Smartphone,
  Compass,
  Image as ImageIcon,
  ChevronRight,
  EyeOff,
  Trash2,
  Copy,
  Layers,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';

interface TypeSummary {
  count: number;
  coverUrl: string | null;
}

export const MediaTypesPage: React.FC = () => {
  const navigate = useNavigate();
  const [summaries, setSummaries] = useState<Record<string, TypeSummary>>({
    videos: { count: 0, coverUrl: null },
    photos: { count: 0, coverUrl: null },
    selfies: { count: 0, coverUrl: null },
    screenshots: { count: 0, coverUrl: null },
    panoramas: { count: 0, coverUrl: null },
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchSummary = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/media/types-summary');
      if (res.data?.success) {
        setSummaries(res.data.data);
      }
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    const handleUpdate = () => fetchSummary();
    window.addEventListener('cv_media_uploaded', handleUpdate);
    return () => window.removeEventListener('cv_media_uploaded', handleUpdate);
  }, []);

  const mediaTypes = [
    {
      id: 'photos',
      title: 'Photos',
      subtitle: 'All standard captures & pictures',
      icon: ImageIcon,
      count: summaries.photos?.count || 0,
      coverUrl: summaries.photos?.coverUrl,
      path: '/media-types/photos',
      iconColor: 'text-[#0071E3]',
      bgColor: 'bg-[#0071E3]/10 dark:bg-[#0071E3]/20',
      gradient: 'from-blue-500 to-blue-600',
    },
    {
      id: 'videos',
      title: 'Videos',
      subtitle: 'High-definition video clips',
      icon: Video,
      count: summaries.videos?.count || 0,
      coverUrl: summaries.videos?.coverUrl,
      path: '/media-types/videos',
      iconColor: 'text-[#34C759]',
      bgColor: 'bg-[#34C759]/10 dark:bg-[#34C759]/20',
      gradient: 'from-emerald-500 to-green-600',
    },
    {
      id: 'selfies',
      title: 'Selfies & Portraits',
      subtitle: 'Front camera shots & portrait photos',
      icon: Camera,
      count: summaries.selfies?.count || 0,
      coverUrl: summaries.selfies?.coverUrl,
      path: '/media-types/selfies',
      iconColor: 'text-[#AF52DE]',
      bgColor: 'bg-[#AF52DE]/10 dark:bg-[#AF52DE]/20',
      gradient: 'from-purple-500 to-indigo-600',
    },
    {
      id: 'screenshots',
      title: 'Screenshots',
      subtitle: 'Screen captures & documents',
      icon: Smartphone,
      count: summaries.screenshots?.count || 0,
      coverUrl: summaries.screenshots?.coverUrl,
      path: '/media-types/screenshots',
      iconColor: 'text-[#5856D6]',
      bgColor: 'bg-[#5856D6]/10 dark:bg-[#5856D6]/20',
      gradient: 'from-indigo-500 to-blue-700',
    },
    {
      id: 'panoramas',
      title: 'Panoramas',
      subtitle: 'Wide-angle ultra panoramic landscapes',
      icon: Compass,
      count: summaries.panoramas?.count || 0,
      coverUrl: summaries.panoramas?.coverUrl,
      path: '/media-types/panoramas',
      iconColor: 'text-[#FF9500]',
      bgColor: 'bg-[#FF9500]/10 dark:bg-[#FF9500]/20',
      gradient: 'from-amber-500 to-orange-600',
    },
  ];

  const utilityTypes = [
    {
      id: 'hidden',
      title: 'Hidden',
      subtitle: 'Password-protected private media',
      icon: EyeOff,
      path: '/hidden',
      iconColor: 'text-[#8E8E93]',
      bgColor: 'bg-[#8E8E93]/10 dark:bg-[#8E8E93]/20',
    },
    {
      id: 'trash',
      title: 'Recently Deleted',
      subtitle: 'Recoverable for 30 days',
      icon: Trash2,
      path: '/trash',
      iconColor: 'text-[#FF3B30]',
      bgColor: 'bg-[#FF3B30]/10 dark:bg-[#FF3B30]/20',
    },
  ];

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-6xl font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Icons','Helvetica_Neue',Helvetica,Arial,sans-serif] select-none pb-28">
      {/* Apple Header */}
      <div>
        <h1 className="text-[28px] font-bold text-[#1D1D1F] dark:text-white tracking-tight">
          Media Types
        </h1>
        <p className="text-[13px] text-[#86868B] mt-1">
          Explore your media organized by camera modes, formats, and media classifications.
        </p>
      </div>

      {/* Section 1: Media Types Cards Grid */}
      <div className="space-y-3">
        <h2 className="text-[14px] font-semibold text-[#86868B] uppercase tracking-wider px-1">
          Categories & Formats
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mediaTypes.map((t) => {
            const Icon = t.icon;
            const isVideoCard = t.id === 'videos';

            return (
              <div
                key={t.id}
                onClick={() => navigate(t.path)}
                className="group relative flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-[#1C1C1E] hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E] cursor-pointer transition-all duration-200 border border-[#E5E5EA] dark:border-[#2C2C2E] hover:border-[#0071E3]/40 hover:shadow-md"
              >
                <div className="flex items-center space-x-4 min-w-0">
                  {/* Thumbnail / High-Res SF Icon Container */}
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-[#F2F2F7] dark:bg-[#2C2C2E] shrink-0 relative flex items-center justify-center border border-[#E5E5EA] dark:border-[#3A3A3C] shadow-sm">
                    {t.coverUrl && !isVideoCard ? (
                      <img
                        src={t.coverUrl}
                        alt={t.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : isVideoCard && t.coverUrl ? (
                      <video
                        src={t.coverUrl}
                        preload="metadata"
                        muted
                        playsInline
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                      />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center ${t.bgColor}`}>
                        <Icon className={`w-6 h-6 ${t.iconColor} stroke-[2]`} />
                      </div>
                    )}

                    {/* Overlay SF Icon Badge */}
                    <div className="absolute bottom-1 right-1 w-5 h-5 rounded-md bg-black/60 backdrop-blur-md flex items-center justify-center text-white">
                      <Icon className="w-3 h-3 stroke-[2]" />
                    </div>
                  </div>

                  {/* Title & Item Count */}
                  <div className="min-w-0">
                    <h3 className="font-semibold text-[15px] text-[#1D1D1F] dark:text-white truncate group-hover:text-[#0071E3] transition-colors">
                      {t.title}
                    </h3>
                    <p className="text-[12px] text-[#86868B] mt-0.5 font-medium">
                      {isLoading ? '...' : `${t.count} ${t.count === 1 ? 'item' : 'items'}`}
                    </p>
                  </div>
                </div>

                {/* Right Arrow */}
                <ChevronRight className="w-4 h-4 text-[#C7C7CC] dark:text-[#636366] group-hover:text-[#0071E3] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Utilities (Apple macOS Photos Group) */}
      <div className="space-y-3 pt-2">
        <h2 className="text-[14px] font-semibold text-[#86868B] uppercase tracking-wider px-1">
          Utilities
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {utilityTypes.map((u) => {
            const Icon = u.icon;
            return (
              <div
                key={u.id}
                onClick={() => navigate(u.path)}
                className="group relative flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-[#1C1C1E] hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E] cursor-pointer transition-all duration-200 border border-[#E5E5EA] dark:border-[#2C2C2E] hover:border-[#0071E3]/40 hover:shadow-md"
              >
                <div className="flex items-center space-x-4 min-w-0">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${u.bgColor} border border-[#E5E5EA] dark:border-[#3A3A3C]`}>
                    <Icon className={`w-5 h-5 ${u.iconColor} stroke-[2]`} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-[15px] text-[#1D1D1F] dark:text-white truncate group-hover:text-[#0071E3] transition-colors">
                      {u.title}
                    </h3>
                    <p className="text-[12px] text-[#86868B] mt-0.5">{u.subtitle}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#C7C7CC] dark:text-[#636366] group-hover:text-[#0071E3] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
