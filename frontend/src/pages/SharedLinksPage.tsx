import React, { useEffect, useState } from 'react';
import {
  Link2,
  Lock,
  Calendar,
  Eye,
  Download,
  Trash2,
  Copy,
  Check,
  QrCode,
  X,
  ExternalLink,
  ShieldAlert,
  Activity,
  Globe,
  Monitor,
  Smartphone,
  Clock,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { Share } from '../types';
import { api } from '../services/api';
import { format } from 'date-fns';

interface ShareActivityLog {
  _id: string;
  action: 'VIEW' | 'DOWNLOAD' | 'PASSWORD_ATTEMPT' | 'ZIP_ARCHIVE';
  ipAddress: string;
  userAgent?: string;
  device?: string;
  browser?: string;
  isSuccessful: boolean;
  timestamp: string;
}

interface ShareAnalytics {
  shareId: string;
  title: string;
  views: number;
  downloads: number;
  createdAt: string;
  expiresAt?: string;
  lastAccessedAt?: string;
  recentActivity: ShareActivityLog[];
}

export const SharedLinksPage: React.FC = () => {
  const [shares, setShares] = useState<Share[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [qrModalUrl, setQrModalUrl] = useState<string | null>(null);

  const [activeAnalyticsShare, setActiveAnalyticsShare] = useState<Share | null>(null);
  const [analyticsData, setAnalyticsData] = useState<ShareAnalytics | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  const fetchShares = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/shares');
      if (res.data?.success) {
        setShares(res.data.data);
      }
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShares();
  }, []);

  const handleCopy = (token: string, id: string) => {
    const fullUrl = `${window.location.origin}/s/${token}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRevoke = async (id: string) => {
    try {
      await api.delete(`/shares/${id}`);
      setShares((prev) => prev.filter((s) => s._id !== id));
      if (activeAnalyticsShare?._id === id) {
        setActiveAnalyticsShare(null);
      }
    } catch {
      // Ignore
    }
  };

  const handleOpenAnalytics = async (share: Share) => {
    setActiveAnalyticsShare(share);
    setIsLoadingAnalytics(true);
    try {
      const res = await api.get(`/shares/${share._id}/analytics`);
      if (res.data?.success) {
        setAnalyticsData(res.data.data);
      }
    } catch {
      // Ignore
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  return (
    <div className="p-6 md:p-10 space-y-6 max-w-6xl font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Icons','Helvetica_Neue',Helvetica,Arial,sans-serif] select-none pb-28 text-[#1D1D1F] dark:text-[#F5F5F7]">
      {/* Header */}
      <div>
        <h1 className="text-[28px] font-bold tracking-tight text-[#1D1D1F] dark:text-white">
          Secure Cloud Links
        </h1>
        <p className="text-[13px] text-[#86868B] mt-0.5">
          Manage your temporary and permanent sharing links, track views, and see detailed visitor access.
        </p>
      </div>

      {/* Cloud Links List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] animate-pulse" />
          ))}
        </div>
      ) : shares.length === 0 ? (
        <div className="text-center py-24 space-y-3">
          <div className="w-14 h-14 rounded-full bg-[#0071E3]/10 text-[#0071E3] mx-auto flex items-center justify-center">
            <Link2 className="w-7 h-7 stroke-[1.5]" />
          </div>
          <h3 className="font-bold text-[16px] text-[#1D1D1F] dark:text-white">
            No Active Cloud Links
          </h3>
          <p className="text-[13px] text-[#86868B] max-w-sm mx-auto">
            Select any photo, video, or album in your library and click "Share" to generate a secure link.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {shares.map((share) => {
            const shareUrl = `${window.location.origin}/s/${share.token}`;
            return (
              <div
                key={share._id}
                className="p-4 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all text-[12px]"
              >
                {/* Info Left */}
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-[15px] text-[#1D1D1F] dark:text-white truncate">
                      {share.title || 'Shared Media Link'}
                    </span>
                    {share.isPasswordProtected && (
                      <span className="px-2 py-0.5 rounded-md bg-[#FF9500]/10 text-[#FF9500] text-[10px] font-semibold flex items-center space-x-1">
                        <Lock className="w-2.5 h-2.5" />
                        <span>Protected</span>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[#86868B] text-[11px]">
                    <span className="font-medium uppercase tracking-wider text-[10px] bg-[#F2F2F7] dark:bg-[#2C2C2E] px-2 py-0.5 rounded-md">
                      {share.targetType}
                    </span>
                    <span>·</span>

                    {/* Clickable Views badge opening Activity Log */}
                    <button
                      onClick={() => handleOpenAnalytics(share)}
                      className="flex items-center space-x-1 text-[#0071E3] hover:underline font-medium cursor-pointer"
                      title="Click to view who saw this link"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{share.accessCount} views</span>
                    </button>
                    <span>·</span>

                    {/* Clickable Downloads badge */}
                    <button
                      onClick={() => handleOpenAnalytics(share)}
                      className="flex items-center space-x-1 text-[#34C759] hover:underline font-medium cursor-pointer"
                      title="Click to view who downloaded this link"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{share.downloadCount || 0} downloads</span>
                    </button>
                    <span>·</span>

                    <span>
                      {share.expiresAt
                        ? `Expires ${format(new Date(share.expiresAt), 'MMM d, yyyy')}`
                        : 'Never expires'}
                    </span>
                  </div>
                </div>

                {/* Actions Right */}
                <div className="flex items-center space-x-2 shrink-0">
                  {/* Detailed Activity Button */}
                  <button
                    onClick={() => handleOpenAnalytics(share)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#0071E3]/10 hover:bg-[#0071E3]/20 text-[#0071E3] font-semibold transition-all"
                    title="See detailed view and download activity"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Activity Log</span>
                  </button>

                  <button
                    onClick={() => handleCopy(share.token, share._id)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] text-[#1D1D1F] dark:text-white font-semibold transition-all"
                  >
                    {copiedId === share._id ? (
                      <Check className="w-3.5 h-3.5 text-[#34C759]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedId === share._id ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    onClick={() => setQrModalUrl(shareUrl)}
                    className="w-8 h-8 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F]"
                    title="View QR Code"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>

                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-8 h-8 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] flex items-center justify-center text-[#86868B] hover:text-[#0071E3]"
                    title="Open Link in New Tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  <button
                    onClick={() => handleRevoke(share._id)}
                    className="w-8 h-8 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#FF3B30]/10 flex items-center justify-center text-[#86868B] hover:text-[#FF3B30] transition-colors"
                    title="Revoke Link"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Visitor Activity & Analytics Modal (Who Saw & Who Downloaded) ── */}
      {activeAnalyticsShare && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Icons','Helvetica_Neue',Helvetica,Arial,sans-serif]">
          <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-[#1C1C1E] p-6 shadow-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] space-y-5 animate-scale-in text-[#1D1D1F] dark:text-[#F5F5F7] max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E] shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[17px] text-[#1D1D1F] dark:text-white leading-tight">
                    Visitor Activity & Insights
                  </h3>
                  <p className="text-[12px] text-[#86868B]">
                    {activeAnalyticsShare.title || 'Cloud Link Activity'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveAnalyticsShare(null);
                  setAnalyticsData(null);
                }}
                className="w-7 h-7 rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metrics Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
              <div className="p-3.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] space-y-1">
                <div className="flex items-center space-x-1.5 text-[11px] font-medium text-[#86868B]">
                  <Eye className="w-3.5 h-3.5 text-[#0071E3]" />
                  <span>Total Views</span>
                </div>
                <div className="text-[20px] font-bold text-[#1D1D1F] dark:text-white">
                  {analyticsData ? analyticsData.views : activeAnalyticsShare.accessCount}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] space-y-1">
                <div className="flex items-center space-x-1.5 text-[11px] font-medium text-[#86868B]">
                  <Download className="w-3.5 h-3.5 text-[#34C759]" />
                  <span>Total Downloads</span>
                </div>
                <div className="text-[20px] font-bold text-[#1D1D1F] dark:text-white">
                  {analyticsData ? analyticsData.downloads : (activeAnalyticsShare.downloadCount || 0)}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] space-y-1 col-span-2 sm:col-span-1">
                <div className="flex items-center space-x-1.5 text-[11px] font-medium text-[#86868B]">
                  <Lock className="w-3.5 h-3.5 text-[#FF9500]" />
                  <span>Access Mode</span>
                </div>
                <div className="text-[13px] font-semibold text-[#1D1D1F] dark:text-white pt-1">
                  {activeAnalyticsShare.isPasswordProtected ? 'Password Protected' : 'Public Link'}
                </div>
              </div>
            </div>

            {/* Activity Logs Table */}
            <div className="flex-1 overflow-y-auto min-h-[220px] space-y-2 pr-1">
              <h4 className="font-semibold text-[13px] text-[#86868B] uppercase tracking-wider mb-2">
                Detailed Access History (Who Viewed & Downloaded)
              </h4>

              {isLoadingAnalytics ? (
                <div className="space-y-2 py-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-12 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] animate-pulse" />
                  ))}
                </div>
              ) : !analyticsData || analyticsData.recentActivity.length === 0 ? (
                <div className="text-center py-12 text-[#86868B] space-y-2 bg-[#F9FAFB] dark:bg-[#2C2C2E]/40 rounded-2xl p-6">
                  <Globe className="w-8 h-8 text-[#86868B] mx-auto stroke-[1.25]" />
                  <p className="text-[13px] font-medium text-[#1D1D1F] dark:text-white">
                    No Visitor Activity Logged Yet
                  </p>
                  <p className="text-[11px]">
                    When someone opens or downloads from this link, their device and timestamp will appear here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-2xl overflow-hidden text-[12px]">
                  {analyticsData.recentActivity.map((log) => (
                    <div
                      key={log._id}
                      className="p-3 bg-white dark:bg-[#1C1C1E] hover:bg-[#F9FAFB] dark:hover:bg-[#2C2C2E]/60 flex items-center justify-between transition-colors gap-3"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        {log.action === 'VIEW' ? (
                          <div className="w-8 h-8 rounded-full bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center shrink-0" title="Viewed Link">
                            <Eye className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#34C759]/10 text-[#34C759] flex items-center justify-center shrink-0" title="Downloaded Files">
                            <Download className="w-4 h-4" />
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-[#1D1D1F] dark:text-white">
                              {log.action === 'VIEW' ? 'Viewed Link' : 'Downloaded Media'}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#86868B] font-mono">
                              {log.ipAddress}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#86868B] truncate">
                            {log.device} · {log.browser}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[11px] font-medium text-[#1D1D1F] dark:text-white flex items-center space-x-1 justify-end">
                          <Clock className="w-3 h-3 text-[#86868B]" />
                          <span>{format(new Date(log.timestamp), 'MMM d, h:mm a')}</span>
                        </div>
                        <span className="text-[10px] text-[#34C759] font-medium">
                          ✓ Authorized
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-[#E5E5EA] dark:border-[#2C2C2E] flex justify-end shrink-0">
              <button
                onClick={() => {
                  setActiveAnalyticsShare(null);
                  setAnalyticsData(null);
                }}
                className="px-5 py-2 rounded-xl bg-[#0071E3] text-white text-[13px] font-semibold hover:bg-[#0077ED] transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {qrModalUrl && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Icons','Helvetica_Neue',Helvetica,Arial,sans-serif]">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#1C1C1E] p-6 shadow-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] text-center space-y-4 animate-scale-in text-[#1D1D1F] dark:text-[#F5F5F7]">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
              <h3 className="font-bold text-[15px]">Cloud Link QR Code</h3>
              <button
                onClick={() => setQrModalUrl(null)}
                className="w-6 h-6 rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center text-[#86868B]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                qrModalUrl
              )}`}
              alt="QR Code"
              className="w-48 h-48 mx-auto rounded-2xl shadow-sm border border-[#E5E5EA]"
            />
            <p className="text-[11px] text-[#86868B]">
              Scan with camera on iOS or Android to view photos.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
