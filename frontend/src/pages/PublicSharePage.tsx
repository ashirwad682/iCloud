import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Download,
  Lock,
  Calendar,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Play,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../services/api';
import { format } from 'date-fns';

interface PublicMediaItem {
  _id: string;
  originalName: string;
  mediaType: 'PHOTO' | 'VIDEO';
  thumbnailUrl: string;
  previewUrl: string;
  downloadUrl?: string;
  width?: number;
  height?: number;
  capturedAt?: string;
  metadata?: any;
}

export const PublicSharePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [items, setItems] = useState<PublicMediaItem[]>([]);
  const [shareTitle, setShareTitle] = useState<string>('Shared Media');
  const [allowDownload, setAllowDownload] = useState<boolean>(true);
  const [expiresAt, setExpiresAt] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Password Protection State
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Fullscreen Viewer State
  const [activeMedia, setActiveMedia] = useState<PublicMediaItem | null>(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  const fetchPublicShare = async (authPassword?: string) => {
    if (!token) return;
    setIsLoading(true);
    setPasswordError(null);

    try {
      const headers: Record<string, string> = {};
      if (authPassword) {
        headers['x-share-password'] = authPassword;
      }

      const res = await api.get(`/shares/public/${token}`, { headers });
      if (res.data?.success) {
        if (res.data.requiresPassword) {
          setRequiresPassword(true);
          setShareTitle(res.data.title || 'Password Protected Link');
        } else {
          setRequiresPassword(false);
          setItems(res.data.data.items);
          setShareTitle(res.data.data.title || 'Shared Media');
          setAllowDownload(res.data.data.allowDownload);
          setExpiresAt(res.data.data.expiresAt);
        }
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        setPasswordError('Incorrect password. Please try again.');
      } else {
        setError(err.response?.data?.error?.message || 'This share link is unavailable or expired.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicShare();
  }, [token]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    fetchPublicShare(password.trim());
  };

  // Download All ZIP
  const handleDownloadAll = async () => {
    if (!token || !allowDownload) return;
    setIsDownloadingAll(true);

    try {
      const headers: Record<string, string> = {};
      if (password) {
        headers['x-share-password'] = password;
      }

      const response = await api.post(
        `/shares/public/${token}/download-all`,
        {},
        {
          headers,
          responseType: 'blob',
        }
      );

      const blob = new Blob([response.data], { type: 'application/zip' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${shareTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch {
      // Ignore
    } finally {
      setIsDownloadingAll(false);
    }
  };

  // Download Single Media Item and Track Download in Analytics
  const handleDownloadSingle = async (media: PublicMediaItem) => {
    if (!token || !allowDownload) return;
    try {
      api.post(`/shares/public/${token}/track-download`).catch(() => {});
    } catch {}

    const targetUrl = media.downloadUrl || media.previewUrl;
    if (targetUrl) {
      const a = document.createElement('a');
      a.href = targetUrl;
      a.download = media.originalName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7] dark:bg-[#000000] text-[13px] text-[#86868B]">
        Loading Secure Cloud Link...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7] dark:bg-[#000000] p-4 text-center font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Icons','Helvetica_Neue',Helvetica,Arial,sans-serif]">
        <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#1C1C1E] p-8 shadow-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] space-y-3">
          <div className="w-14 h-14 rounded-full bg-[#FF3B30]/10 text-[#FF3B30] mx-auto flex items-center justify-center">
            <X className="w-7 h-7 stroke-[2]" />
          </div>
          <h2 className="text-[20px] font-bold text-[#1D1D1F] dark:text-white">
            Link Unavailable
          </h2>
          <p className="text-[13px] text-[#86868B]">{error}</p>
        </div>
      </div>
    );
  }

  if (requiresPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7] dark:bg-[#000000] p-4 select-none font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Icons','Helvetica_Neue',Helvetica,Arial,sans-serif]">
        <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#1C1C1E] p-8 shadow-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] text-center space-y-4 animate-scale-in text-[#1D1D1F] dark:text-[#F5F5F7]">
          <div className="w-14 h-14 rounded-3xl bg-[#0071E3]/10 text-[#0071E3] mx-auto flex items-center justify-center shadow-sm">
            <Lock className="w-7 h-7 stroke-[2]" />
          </div>
          <div>
            <h2 className="text-[20px] font-bold tracking-tight">{shareTitle}</h2>
            <p className="text-[12px] text-[#86868B] mt-0.5">
              This link is protected with a password.
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-3 pt-2">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              className="w-full px-4 py-2.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#3A3A3C] outline-none text-[13px] focus:border-[#0071E3] text-[#1D1D1F] dark:text-white text-center"
            />
            {passwordError && (
              <p className="text-[11px] text-[#FF3B30] font-medium">{passwordError}</p>
            )}
            <button
              type="submit"
              className="w-full py-2.5 rounded-2xl bg-[#0071E3] hover:bg-[#0077ED] text-white font-semibold text-[13px] shadow-sm transition-all"
            >
              Unlock & View
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#000000] font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Icons','Helvetica_Neue',Helvetica,Arial,sans-serif] text-[#1D1D1F] dark:text-[#F5F5F7] select-none">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 px-6 py-4 bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl border-b border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-[#1D1D1F] dark:text-white">
            {shareTitle}
          </h1>
          <p className="text-[12px] text-[#86868B]">
            {items.length} {items.length === 1 ? 'item' : 'items'}
            {expiresAt && ` · Expires ${format(new Date(expiresAt), 'MMM d')}`}
          </p>
        </div>

        {allowDownload && items.length > 0 && (
          <button
            onClick={handleDownloadAll}
            disabled={isDownloadingAll}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-2xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[12px] font-semibold transition-all shadow-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4 stroke-[2]" />
            <span>{isDownloadingAll ? 'Creating ZIP...' : 'Download All'}</span>
          </button>
        )}
      </header>

      {/* Media Grid */}
      <main className="max-w-7xl mx-auto p-6 md:p-8">
        {items.length === 0 ? (
          <div className="text-center py-24 text-[13px] text-[#86868B]">
            No photos in this shared link.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {items.map((media) => (
              <div
                key={media._id}
                onClick={() => setActiveMedia(media)}
                className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-sm hover:shadow-lg transition-all"
              >
                {media.mediaType === 'VIDEO' ? (
                  <video
                    src={media.thumbnailUrl || media.previewUrl}
                    preload="metadata"
                    muted
                    playsInline
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                  />
                ) : (
                  <img
                    src={media.thumbnailUrl || media.previewUrl}
                    alt={media.originalName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}

                {media.mediaType === 'VIDEO' && (
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-white text-[10px] font-medium flex items-center space-x-1">
                    <Play className="w-2.5 h-2.5 fill-white" />
                    <span>Video</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Fullscreen Public Modal Viewer */}
      {activeMedia && (
        <div className="fixed inset-0 z-50 bg-white/98 dark:bg-[#1C1C1E]/98 backdrop-blur-2xl flex flex-col select-none animate-fade-in text-[#1D1D1F] dark:text-white">
          <div className="h-14 px-6 flex items-center justify-between border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
            <span className="font-semibold text-[14px] truncate max-w-sm">
              {activeMedia.originalName}
            </span>
            <div className="flex items-center space-x-2">
              {allowDownload && (
                <button
                  onClick={() => handleDownloadSingle(activeMedia)}
                  className="w-8 h-8 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center text-[#0071E3] hover:bg-[#E5E5EA]"
                  title="Download Photo"
                >
                  <Download className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setActiveMedia(null)}
                className="w-8 h-8 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center p-6 overflow-hidden bg-[#F5F5F7] dark:bg-[#161618]">
            {activeMedia.mediaType === 'VIDEO' ? (
              <video
                src={activeMedia.previewUrl || activeMedia.thumbnailUrl}
                controls
                autoPlay
                className="max-h-[80vh] max-w-full rounded-2xl shadow-2xl bg-black"
              />
            ) : (
              <img
                src={activeMedia.previewUrl || activeMedia.thumbnailUrl}
                alt={activeMedia.originalName}
                className="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
