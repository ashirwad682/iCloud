import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Check, X, Shield, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../stores/authStore';

export const SharedAlbumInvitePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const [inviteData, setInviteData] = useState<{
    albumTitle: string;
    albumDescription?: string;
    itemCount: number;
    inviterName: string;
    recipientEmail: string;
    role: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!token) return;
    api
      .get(`/shared-album-invitations/${token}`)
      .then((res: any) => {
        if (res.data?.success) {
          setInviteData(res.data.data);
        }
      })
      .catch((err: any) => {
        setError(err.response?.data?.error?.message || 'Invalid or expired invitation.');
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const handleAccept = async () => {
    if (!isAuthenticated) {
      // Save invite token in session storage for post-login redirect
      sessionStorage.setItem('pending_invite_token', token || '');
      navigate('/login');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await api.post(`/shared-album-invitations/${token}/accept`);
      if (res.data?.success) {
        navigate(`/shared-albums/${res.data.albumId}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to accept invitation.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    setIsProcessing(true);
    try {
      await api.post(`/shared-album-invitations/${token}/decline`);
      navigate('/photos');
    } catch {
      navigate('/photos');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7] dark:bg-[#000000] text-[13px] text-[#86868B]">
        Verifying Shared Album Invitation...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7] dark:bg-[#000000] p-4 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Icons','Helvetica_Neue',Helvetica,Arial,sans-serif] select-none text-[#1D1D1F] dark:text-[#F5F5F7]">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#1C1C1E] p-8 shadow-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] text-center space-y-6 animate-scale-in">
        {error ? (
          <div className="space-y-4 py-4">
            <div className="w-14 h-14 rounded-full bg-[#FF3B30]/10 text-[#FF3B30] mx-auto flex items-center justify-center">
              <X className="w-7 h-7 stroke-[2]" />
            </div>
            <h2 className="text-[20px] font-bold">Invitation Unavailable</h2>
            <p className="text-[13px] text-[#86868B]">{error}</p>
            <button
              onClick={() => navigate('/photos')}
              className="px-5 py-2.5 rounded-xl bg-[#0071E3] text-white text-[13px] font-semibold"
            >
              Go to Photos
            </button>
          </div>
        ) : (
          inviteData && (
            <>
              {/* Header Icon */}
              <div className="w-16 h-16 rounded-3xl bg-[#0071E3]/10 text-[#0071E3] mx-auto flex items-center justify-center shadow-sm">
                <Users className="w-8 h-8 stroke-[1.5]" />
              </div>

              {/* Title & Inviter Info */}
              <div className="space-y-1">
                <span className="text-[12px] font-semibold text-[#0071E3] uppercase tracking-wider">
                  Shared Album Invitation
                </span>
                <h2 className="text-[24px] font-bold tracking-tight text-[#1D1D1F] dark:text-white">
                  {inviteData.albumTitle}
                </h2>
                <p className="text-[13px] text-[#86868B]">
                  Shared by <span className="font-semibold text-[#1D1D1F] dark:text-white">{inviteData.inviterName}</span>
                </p>
              </div>

              {/* Details Pill Box */}
              <div className="p-4 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#3A3A3C] text-[12px] text-[#515154] dark:text-[#A1A1A6] space-y-1 text-left">
                <div className="flex justify-between">
                  <span>Role:</span>
                  <span className="font-semibold text-[#1D1D1F] dark:text-white">{inviteData.role}</span>
                </div>
                <div className="flex justify-between">
                  <span>Content:</span>
                  <span className="font-semibold text-[#1D1D1F] dark:text-white">
                    {inviteData.itemCount} {inviteData.itemCount === 1 ? 'item' : 'items'}
                  </span>
                </div>
                {inviteData.albumDescription && (
                  <p className="pt-2 border-t border-[#E5E5EA] dark:border-[#3A3A3C] text-[11px] italic">
                    "{inviteData.albumDescription}"
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={handleDecline}
                  disabled={isProcessing}
                  className="flex-1 py-3 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[13px] font-semibold text-[#86868B] hover:text-[#FF3B30] hover:bg-[#E5E5EA] transition-all"
                >
                  Decline
                </button>
                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={isProcessing}
                  className="flex-1 py-3 rounded-2xl bg-[#0071E3] hover:bg-[#0077ED] text-[13px] font-semibold text-white shadow-sm transition-all flex items-center justify-center space-x-1.5"
                >
                  <span>{isAuthenticated ? 'Join Album' : 'Sign in to Join'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
};
