import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Lock,
  Calendar,
  Download,
  EyeOff,
  Users,
  Link2,
  FolderPlus,
  QrCode,
  ShieldCheck,
  Mail,
  UserPlus,
} from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { api } from '../../services/api';
import { SharedAlbum } from '../../types';

export const ShareDialog: React.FC = () => {
  const { isShareModalOpen, shareTarget, closeShareModal } = useUIStore();

  const [activeTab, setActiveTab] = useState<'LINK' | 'ALBUM'>('LINK');

  // Cloud Link State
  const [password, setPassword] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<number | undefined>(undefined);
  const [allowDownload, setAllowDownload] = useState(true);
  const [stripMetadata, setStripMetadata] = useState(true);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isLoadingLink, setIsLoadingLink] = useState(false);

  // Shared Album State
  const [sharedAlbums, setSharedAlbums] = useState<SharedAlbum[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('');
  const [newAlbumTitle, setNewAlbumTitle] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'EDITOR' | 'VIEWER'>('VIEWER');
  const [isLoadingAlbum, setIsLoadingAlbum] = useState(false);
  const [albumSuccessMessage, setAlbumSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isShareModalOpen) {
      api
        .get('/shared-albums')
        .then((res: any) => {
          if (res.data?.success) {
            setSharedAlbums(res.data.data);
            if (res.data.data.length > 0) {
              setSelectedAlbumId(res.data.data[0]._id);
            }
          }
        })
        .catch(() => {});
    }
  }, [isShareModalOpen]);

  if (!isShareModalOpen || !shareTarget) return null;

  // Handle Cloud Link Generation
  const handleCreateShareLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingLink(true);

    try {
      const payload: any = {
        targetType: shareTarget.type,
        targetId: shareTarget.id,
        targetIds: shareTarget.ids,
        password: password.trim() || undefined,
        expiresInDays: expiresInDays ? Number(expiresInDays) : undefined,
        allowDownload,
        stripMetadata,
      };

      const res = await api.post('/shares', payload);
      if (res.data?.success) {
        const fullUrl = `${window.location.origin}${res.data.data.shareUrl}`;
        setGeneratedLink(fullUrl);
      }
    } catch {
      // Ignore
    } finally {
      setIsLoadingLink(false);
    }
  };

  const handleCopy = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Handle Adding to Collaborative Shared Album
  const handleAddToSharedAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingAlbum(true);

    try {
      let targetAlbumId = selectedAlbumId;

      // If creating a new shared album
      if (!targetAlbumId && newAlbumTitle.trim()) {
        const createRes = await api.post('/shared-albums', {
          title: newAlbumTitle.trim(),
          settings: {
            allowContributions: true,
            allowComments: true,
            allowReactions: true,
            allowDownloads: true,
          },
        });
        if (createRes.data?.success) {
          targetAlbumId = createRes.data.data._id;
        }
      }

      if (targetAlbumId) {
        const mediaIdsToAdd = shareTarget.id ? [shareTarget.id] : shareTarget.ids || [];
        await api.post(`/shared-albums/${targetAlbumId}/media`, {
          mediaIds: mediaIdsToAdd,
        });

        // If invite email specified, send invite
        if (inviteEmail.trim()) {
          await api.post(`/shared-albums/${targetAlbumId}/invitations`, {
            email: inviteEmail.trim(),
            role: inviteRole,
          });
        }

        setAlbumSuccessMessage('Successfully added to Shared Album!');
        setTimeout(() => {
          setAlbumSuccessMessage(null);
          closeShareModal();
        }, 1800);
      }
    } catch {
      // Ignore
    } finally {
      setIsLoadingAlbum(false);
    }
  };

  const itemCount = shareTarget.id ? 1 : shareTarget.ids?.length || 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Icons','Helvetica_Neue',Helvetica,Arial,sans-serif]">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#1C1C1E] p-6 shadow-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E] mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center">
              <Share2 className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <h3 className="font-bold text-[16px] leading-tight">
                Share {itemCount > 1 ? `${itemCount} Items` : 'Item'}
              </h3>
              <p className="text-[11px] text-[#86868B]">Choose how you want to share</p>
            </div>
          </div>
          <button
            onClick={() => {
              setGeneratedLink(null);
              closeShareModal();
            }}
            className="w-7 h-7 rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dual Tab Segmented Switcher */}
        <div className="flex p-1 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-xl mb-4 text-[12px] font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('LINK')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
              activeTab === 'LINK'
                ? 'bg-white dark:bg-[#1C1C1E] text-[#0071E3] shadow-sm'
                : 'text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Secure Cloud Link</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ALBUM')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
              activeTab === 'ALBUM'
                ? 'bg-white dark:bg-[#1C1C1E] text-[#0071E3] shadow-sm'
                : 'text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Shared Album</span>
          </button>
        </div>

        {/* TAB 1: SECURE CLOUD LINK */}
        {activeTab === 'LINK' && (
          <div>
            {generatedLink ? (
              <div className="space-y-4 py-2 text-[12px]">
                <div className="p-3 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#3A3A3C] flex items-center justify-between">
                  <span className="text-[11px] text-[#86868B] truncate mr-2 font-mono">
                    {generatedLink}
                  </span>
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={handleCopy}
                      className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[12px] font-semibold transition-all shadow-sm"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      onClick={() => setShowQr(!showQr)}
                      className="w-8 h-8 rounded-xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#3A3A3C] flex items-center justify-center text-[#1D1D1F] dark:text-white hover:bg-[#E5E5EA]"
                      title="View QR Code"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {showQr && (
                  <div className="p-4 rounded-2xl bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#3A3A3C] text-center space-y-2">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                        generatedLink
                      )}`}
                      alt="QR Code"
                      className="w-36 h-36 mx-auto rounded-xl shadow-sm border border-[#E5E5EA]"
                    />
                    <p className="text-[11px] text-[#86868B]">Scan to view shared photos on mobile</p>
                  </div>
                )}

                <div className="flex items-center space-x-2 text-[11px] text-[#86868B] pt-1">
                  <ShieldCheck className="w-4 h-4 text-[#34C759]" />
                  <span>Link protected with 256-bit cryptographic random token.</span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateShareLink} className="space-y-3.5 text-[12px]">
                {/* Password Protection */}
                <div>
                  <label className="font-medium text-[#1D1D1F] dark:text-white flex items-center space-x-1.5 mb-1">
                    <Lock className="w-3.5 h-3.5 text-[#0071E3]" />
                    <span>Password Protection (Optional)</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Leave empty for public link"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#3A3A3C] text-[#1D1D1F] dark:text-white outline-none focus:border-[#0071E3]"
                  />
                </div>

                {/* Expiration */}
                <div>
                  <label className="font-medium text-[#1D1D1F] dark:text-white flex items-center space-x-1.5 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-[#0071E3]" />
                    <span>Link Expiration</span>
                  </label>
                  <select
                    value={expiresInDays || ''}
                    onChange={(e) =>
                      setExpiresInDays(e.target.value ? Number(e.target.value) : undefined)
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#3A3A3C] text-[#1D1D1F] dark:text-white outline-none focus:border-[#0071E3]"
                  >
                    <option value="">Never expires</option>
                    <option value="1">1 Day</option>
                    <option value="7">7 Days</option>
                    <option value="30">30 Days</option>
                  </select>
                </div>

                {/* Permissions */}
                <div className="space-y-2 pt-2 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowDownload}
                      onChange={(e) => setAllowDownload(e.target.checked)}
                      className="rounded text-[#0071E3] focus:ring-[#0071E3]"
                    />
                    <span>Allow recipients to download originals</span>
                  </label>

                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={stripMetadata}
                      onChange={(e) => setStripMetadata(e.target.checked)}
                      className="rounded text-[#0071E3] focus:ring-[#0071E3]"
                    />
                    <span>Remove sensitive GPS location & camera info (Privacy)</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoadingLink}
                  className="w-full py-2.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white font-semibold shadow-sm transition-all disabled:opacity-50 mt-3"
                >
                  {isLoadingLink ? 'Generating Cloud Link...' : 'Create Cloud Link'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: COLLABORATIVE SHARED ALBUM */}
        {activeTab === 'ALBUM' && (
          <div>
            {albumSuccessMessage ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-[#34C759]/10 text-[#34C759] mx-auto flex items-center justify-center">
                  <Check className="w-6 h-6 stroke-[2]" />
                </div>
                <h4 className="font-bold text-[15px]">{albumSuccessMessage}</h4>
              </div>
            ) : (
              <form onSubmit={handleAddToSharedAlbum} className="space-y-3.5 text-[12px]">
                {/* Select Existing Shared Album */}
                {sharedAlbums.length > 0 && (
                  <div>
                    <label className="font-medium text-[#1D1D1F] dark:text-white flex items-center space-x-1.5 mb-1">
                      <FolderPlus className="w-3.5 h-3.5 text-[#0071E3]" />
                      <span>Select Shared Album</span>
                    </label>
                    <select
                      value={selectedAlbumId}
                      onChange={(e) => {
                        setSelectedAlbumId(e.target.value);
                        if (e.target.value) setNewAlbumTitle('');
                      }}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#3A3A3C] text-[#1D1D1F] dark:text-white outline-none focus:border-[#0071E3]"
                    >
                      <option value="">-- Or Create New Shared Album Below --</option>
                      {sharedAlbums.map((a) => (
                        <option key={a._id} value={a._id}>
                          {a.title} ({a.itemCount} items)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Create New Shared Album if none selected */}
                {!selectedAlbumId && (
                  <div>
                    <label className="font-medium text-[#1D1D1F] dark:text-white flex items-center space-x-1.5 mb-1">
                      <FolderPlus className="w-3.5 h-3.5 text-[#0071E3]" />
                      <span>New Shared Album Title</span>
                    </label>
                    <input
                      type="text"
                      value={newAlbumTitle}
                      onChange={(e) => setNewAlbumTitle(e.target.value)}
                      placeholder="e.g. Summer Vacation, Family Trip"
                      required={!selectedAlbumId}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#3A3A3C] text-[#1D1D1F] dark:text-white outline-none focus:border-[#0071E3]"
                    />
                  </div>
                )}

                {/* Invite Collaborator Email */}
                <div>
                  <label className="font-medium text-[#1D1D1F] dark:text-white flex items-center space-x-1.5 mb-1">
                    <Mail className="w-3.5 h-3.5 text-[#0071E3]" />
                    <span>Invite Collaborator (Optional Email)</span>
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="collaborator@example.com"
                      className="flex-1 px-3.5 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#3A3A3C] text-[#1D1D1F] dark:text-white outline-none focus:border-[#0071E3]"
                    />
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as any)}
                      className="px-2.5 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#3A3A3C] text-[#1D1D1F] dark:text-white outline-none focus:border-[#0071E3]"
                    >
                      <option value="VIEWER">Viewer</option>
                      <option value="EDITOR">Editor</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoadingAlbum || (!selectedAlbumId && !newAlbumTitle.trim())}
                  className="w-full py-2.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white font-semibold shadow-sm transition-all disabled:opacity-50 mt-3"
                >
                  {isLoadingAlbum ? 'Adding to Album...' : 'Save & Share Album'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
