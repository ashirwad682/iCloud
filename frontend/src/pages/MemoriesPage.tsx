import React, { useEffect, useState } from 'react';
import { Play, Heart, X, ChevronRight, ChevronLeft, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { Media } from '../types';
import { api } from '../services/api';

/* ── Official Apple iCloud Memories Circular Icon (Clockwise Arrow + Play) ── */
const AppleMemoriesIcon: React.FC<{ className?: string }> = ({
  className = 'w-16 h-16 text-[#86868B]',
}) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Circular clockwise arrow */}
    <path
      d="M32 10C44.1503 10 54 19.8497 54 32C54 44.1503 44.1503 54 32 54C19.8497 54 10 44.1503 10 32C10 22.4244 16.126 14.2818 24.7 11.35"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
    />
    {/* Arrowhead */}
    <path
      d="M23 5.5L25.8 11.8L19.2 14.5"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Centered Play Triangle */}
    <path
      d="M28 24.5V39.5L40 32L28 24.5Z"
      fill="currentColor"
    />
  </svg>
);

export const MemoriesPage: React.FC = () => {
  const [tab, setTab] = useState<'ALL' | 'FAVORITES'>('ALL');
  const [allMedia, setAllMedia] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [favoriteMemoryTitles, setFavoriteMemoryTitles] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('cv_fav_memories') || '[]');
    } catch {
      return [];
    }
  });

  const [activeMemory, setActiveMemory] = useState<{
    id: string;
    title: string;
    subtitle: string;
    items: Media[];
  } | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    api
      .get('/media?limit=200')
      .then((res: any) => {
        if (res.data?.success) {
          setAllMedia(res.data.data.items);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Generate dynamic memories from photos
  const allMemories = React.useMemo(() => {
    if (allMedia.length === 0) return [];
    return [
      {
        id: 'season-highlights',
        title: 'Highlights of the Season',
        subtitle: 'Memories from your recent adventures',
        items: allMedia.slice(0, 15),
        cover: allMedia[0]?.previewUrl || allMedia[0]?.thumbnailUrl || allMedia[0]?.originalUrl,
      },
      {
        id: 'best-moments',
        title: 'Best Moments',
        subtitle: 'Your top moments and favorites',
        items:
          allMedia.filter((m) => m.isFavorite).length > 0
            ? allMedia.filter((m) => m.isFavorite)
            : allMedia.slice(3, 18),
        cover:
          allMedia[3]?.previewUrl || allMedia[3]?.thumbnailUrl || allMedia[1]?.originalUrl,
      },
      {
        id: 'over-the-years',
        title: 'Over the Years',
        subtitle: 'Rediscover captured memories',
        items: allMedia.slice(8, 25),
        cover:
          allMedia[7]?.previewUrl || allMedia[7]?.thumbnailUrl || allMedia[2]?.originalUrl,
      },
    ].filter((m) => m.items.length > 0);
  }, [allMedia]);

  const displayedMemories =
    tab === 'FAVORITES'
      ? allMemories.filter((m) => favoriteMemoryTitles.includes(m.id))
      : allMemories;

  const toggleFavoriteMemory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavoriteMemoryTitles((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      localStorage.setItem('cv_fav_memories', JSON.stringify(next));
      return next;
    });
  };

  // Auto-advance memory slideshow
  useEffect(() => {
    if (!activeMemory || !isPlaying) return;
    const interval = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % activeMemory.items.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [activeMemory, isPlaying]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#1C1C1E] select-none font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Icons','Helvetica_Neue',Helvetica,Arial,sans-serif]">
      {/* ── Apple Segmented Control at Top ── */}
      <div className="h-12 flex items-center justify-center border-b border-[#E5E5EA] dark:border-[#2C2C2E] flex-shrink-0">
        <div className="flex p-0.5 rounded-[8px] bg-[#EBEBEF] dark:bg-[#2C2C2E] text-[13px]">
          <button
            onClick={() => setTab('ALL')}
            className={`px-4 py-1 rounded-[7px] font-medium transition-all ${
              tab === 'ALL'
                ? 'bg-white dark:bg-[#3A3A3C] text-[#1D1D1F] dark:text-white shadow-xs font-semibold'
                : 'text-[#6E6E73] dark:text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            Memories
          </button>
          <button
            onClick={() => setTab('FAVORITES')}
            className={`px-4 py-1 rounded-[7px] font-medium transition-all ${
              tab === 'FAVORITES'
                ? 'bg-white dark:bg-[#3A3A3C] text-[#1D1D1F] dark:text-white shadow-xs font-semibold'
                : 'text-[#6E6E73] dark:text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            Favorite Memories
          </button>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-80 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] animate-pulse"
              />
            ))}
          </div>
        ) : displayedMemories.length === 0 ? (
          /* ── Official Apple Empty State ── */
          <div className="h-[calc(100vh-16rem)] flex flex-col items-center justify-center text-center p-6 select-none animate-fade-in">
            <div className="mb-4">
              <AppleMemoriesIcon className="w-16 h-16 text-[#86868B] dark:text-[#6E6E73]" />
            </div>
            <h2 className="font-semibold text-[18px] text-[#86868B] dark:text-[#86868B] mb-1">
              {tab === 'FAVORITES' ? 'No Favorite Memories' : 'No Memories'}
            </h2>
            <p className="text-[13px] text-[#86868B] dark:text-[#86868B] max-w-sm leading-relaxed">
              {tab === 'FAVORITES'
                ? 'Favorite Memories will appear here when you click the heart on a Memory.'
                : 'Memories will appear here as your photo library grows.'}
            </p>
          </div>
        ) : (
          /* ── Memories Grid ── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-24">
            {displayedMemories.map((mem) => {
              const isFav = favoriteMemoryTitles.includes(mem.id);
              return (
                <div
                  key={mem.id}
                  onClick={() => {
                    setActiveMemory(mem);
                    setSlideIndex(0);
                  }}
                  className="group relative h-80 rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300 transform group-hover:scale-[1.02] bg-[#F2F2F7] dark:bg-[#2C2C2E]"
                >
                  {/* Cover image with zoom on hover */}
                  {mem.cover ? (
                    <img
                      src={mem.cover}
                      alt={mem.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-blue-600 to-indigo-800" />
                  )}

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                  {/* Content Container */}
                  <div className="absolute inset-0 p-6 flex flex-col justify-between text-white">
                    {/* Top Row: Memory Badge & Favorite Heart */}
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md text-[11px] font-medium flex items-center space-x-1">
                        <Sparkles className="w-3 h-3 text-amber-300" />
                        <span>Memory</span>
                      </span>

                      {/* Favorite Heart Button */}
                      <button
                        onClick={(e) => toggleFavoriteMemory(mem.id, e)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all ${
                          isFav
                            ? 'bg-black/50 text-[#FF2D55]'
                            : 'bg-black/40 text-white/80 hover:text-white hover:bg-black/60'
                        }`}
                        title={isFav ? 'Remove from Favorite Memories' : 'Favorite this Memory'}
                      >
                        <Heart className={`w-4 h-4 ${isFav ? 'fill-[#FF2D55]' : ''}`} />
                      </button>
                    </div>

                    {/* Bottom Row: Title, Subtitle & Play Action */}
                    <div>
                      <h3 className="text-[22px] font-bold tracking-tight leading-snug drop-shadow-md">
                        {mem.title}
                      </h3>
                      <p className="text-[12px] text-white/80 mt-1">{mem.subtitle}</p>

                      <div className="mt-4 flex items-center space-x-2 text-[12px] font-medium text-white/90 group-hover:text-white">
                        <div className="w-7 h-7 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center">
                          <Play className="w-3.5 h-3.5 fill-white" />
                        </div>
                        <span>Play Memory</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Cinematic Fullscreen Memory Slideshow ── */}
      {activeMemory && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none animate-enter">
          {/* Close button */}
          <button
            onClick={() => setActiveMemory(null)}
            className="absolute top-6 right-6 z-50 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/30 transition-all"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Current Slide with Ken Burns Effect */}
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            {activeMemory.items[slideIndex] && (
              <img
                key={slideIndex}
                src={
                  activeMemory.items[slideIndex].previewUrl ||
                  activeMemory.items[slideIndex].thumbnailUrl ||
                  activeMemory.items[slideIndex].originalUrl
                }
                alt=""
                className="max-h-full max-w-full object-contain animate-fade-in transition-all duration-1000 scale-100"
              />
            )}

            {/* Title & Progress Overlay */}
            <div className="absolute bottom-12 inset-x-0 text-center text-white pointer-events-none drop-shadow-lg">
              <h2 className="text-2xl font-bold">{activeMemory.title}</h2>
              <p className="text-xs text-white/70 mt-1">
                {slideIndex + 1} of {activeMemory.items.length}
              </p>
            </div>
          </div>

          {/* Controls: Prev / Next */}
          <button
            onClick={() =>
              setSlideIndex(
                (prev) => (prev - 1 + activeMemory.items.length) % activeMemory.items.length
              )
            }
            className="absolute left-6 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/30"
            title="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={() => setSlideIndex((prev) => (prev + 1) % activeMemory.items.length)}
            className="absolute right-6 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/30"
            title="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};
