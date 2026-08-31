import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Users,
  Plus,
  Share2,
  Trash2,
  Settings,
  MessageSquare,
  Send,
  Heart,
  Smile,
  X,
  UserPlus,
  Check,
  Download,
  Shield,
  ChevronLeft,
} from 'lucide-react';
import { SharedAlbum, Media, AlbumMember, AlbumComment } from '../types';
import { api } from '../services/api';
import { MediaCard } from '../components/gallery/MediaCard';
import { GalleryToolbar } from '../components/gallery/GalleryToolbar';
import { useUIStore } from '../stores/uiStore';
import { useUploadStore } from '../stores/uploadStore';
import { format } from 'date-fns';

export const SharedAlbumDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setViewerMedia, openShareModal } = useUIStore();
  const { addFiles } = useUploadStore();

  const [albumData, setAlbumData] = useState<{
    album: SharedAlbum;
    isOwner: boolean;
    userRole: string;
    permissions: any;
    members: AlbumMember[];
    items: Media[];
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [comments, setComments] = useState<AlbumComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);

  // Invite modal state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'EDITOR' | 'VIEWER'>('VIEWER');
  const [inviteResult, setInviteResult] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);

  // Delete Shared Album modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add Photos Picker state
  const [isAddPhotosOpen, setIsAddPhotosOpen] = useState(false);
  const [userLibrary, setUserLibrary] = useState<Media[]>([]);
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const [isAddingPhotos, setIsAddingPhotos] = useState(false);

  const fetchSharedAlbum = async () => {
    if (!id) return;
    try {
      const res = await api.get(`/shared-albums/${id}`);
      if (res.data?.success) {
        setAlbumData(res.data.data);
      }
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  const fetchComments = async () => {
    if (!id) return;
    try {
      const res = await api.get(`/shared-albums/${id}/comments`);
      if (res.data?.success) {
        setComments(res.data.data);
      }
    } catch {}
  };

  useEffect(() => {
    fetchSharedAlbum();
    fetchComments();
    const handleUpdate = () => {
      fetchSharedAlbum();
      fetchComments();
    };
    window.addEventListener('cv_media_uploaded', handleUpdate);
    return () => window.removeEventListener('cv_media_uploaded', handleUpdate);
  }, [id]);

  // Open Add Photos from library
  const handleOpenAddPhotos = async () => {
    setIsAddPhotosOpen(true);
    try {
      const res = await api.get('/media?limit=500');
      if (res.data?.success) {
        setUserLibrary(res.data.data.items);
      }
    } catch {}
  };

  // Submit adding photos to shared album
  const handleConfirmAddPhotos = async () => {
    if (!id || selectedMediaIds.length === 0) return;
    setIsAddingPhotos(true);
    try {
      await api.post(`/shared-albums/${id}/media`, {
        mediaIds: selectedMediaIds,
      });
      setSelectedMediaIds([]);
      setIsAddPhotosOpen(false);
      fetchSharedAlbum();
    } catch {
      // Ignore
    } finally {
      setIsAddingPhotos(false);
    }
  };

  // Send invitation
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !inviteEmail.trim()) return;
    setIsInviting(true);
    try {
      const res = await api.post(`/shared-albums/${id}/invitations`, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      if (res.data?.success) {
        const fullInviteUrl = `${window.location.origin}${res.data.data.inviteUrl}`;
        setInviteResult(fullInviteUrl);
        setInviteEmail('');
        fetchSharedAlbum();
      }
    } catch {
      // Ignore
    } finally {
      setIsInviting(false);
    }
  };

  // Send comment
  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newComment.trim()) return;
    setIsSendingComment(true);
    try {
      const res = await api.post(`/shared-albums/${id}/comments`, {
        text: newComment.trim(),
      });
      if (res.data?.success) {
        setComments((prev) => [...prev, res.data.data]);
        setNewComment('');
      }
    } catch {
      // Ignore
    } finally {
      setIsSendingComment(false);
    }
  };

  // Toggle reaction
  const handleReaction = async (mediaId: string, reactionType: string = 'HEART') => {
    if (!id) return;
    try {
      await api.post(`/shared-albums/${id}/media/${mediaId}/reactions`, {
        reactionType,
      });
      fetchSharedAlbum();
    } catch {}
  };

  // Delete Shared Album
  const handleDeleteSharedAlbum = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await api.delete(`/shared-albums/${id}`);
      window.dispatchEvent(new Event('cv_media_uploaded'));
      navigate('/shared');
    } catch {
      // Ignore
    } finally {
      setIsDeleting(false);
    }
  };

  // Upload local files directly to this shared album
  const handleDirectUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && id) {
      addFiles(Array.from(e.target.files), id);
      e.target.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-[13px] text-[#86868B] animate-pulse">
        Loading Shared Album...
      </div>
    );
  }

  if (!albumData) {
    return (
      <div className="p-8 text-center space-y-3">
        <h3 className="font-bold text-[16px] text-[#1D1D1F] dark:text-white">
          Shared Album Not Found
        </h3>
        <button
          onClick={() => navigate('/shared')}
          className="px-4 py-2 rounded-xl bg-[#0071E3] text-white text-[12px] font-semibold"
        >
          Back to Shared Albums
        </button>
      </div>
    );
  }

  const { album, isOwner, members, items, permissions } = albumData;
  const allMediaIds = items.map((m) => m._id);

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-[#000000] font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Icons','Helvetica_Neue',Helvetica,Arial,sans-serif] text-[#1D1D1F] dark:text-[#F5F5F7] select-none pb-28">
      {/* Top Gallery Toolbar */}
      <GalleryToolbar allMediaIds={allMediaIds} />

      {/* Album Header Banner */}
      <div className="px-6 md:px-8 pt-4 pb-6 border-b border-[#E5E5EA] dark:border-[#2C2C2E] space-y-4 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigate('/shared')}
                className="w-7 h-7 rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F] mr-1"
                title="Back to Shared Albums"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h1 className="text-[28px] font-bold tracking-tight text-[#1D1D1F] dark:text-white">
                {album.title}
              </h1>
            </div>
            <p className="text-[13px] text-[#86868B] mt-0.5">
              {items.length} {items.length === 1 ? 'item' : 'items'} · {members.length} {members.length === 1 ? 'member' : 'members'}
            </p>
            {album.description && (
              <p className="text-[12px] text-[#515154] dark:text-[#A1A1A6] mt-1 max-w-xl">
                {album.description}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {permissions?.contribute && (
              <>
                <button
                  onClick={handleOpenAddPhotos}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[12px] font-semibold transition-all shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2]" />
                  <span>Add Photos</span>
                </button>
                <label className="cursor-pointer flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] text-[#1D1D1F] dark:text-white text-[12px] font-semibold transition-all">
                  <span>Upload</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*,.mp4,.mov,.avi,.mkv,.webm,.3gp,.m4v,.flv,.heic,.heif,.jpg,.jpeg,.png,.webp"
                    onChange={handleDirectUpload}
                    className="hidden"
                  />
                </label>
              </>
            )}

            {(isOwner || permissions?.invite) && (
              <button
                onClick={() => {
                  setInviteResult(null);
                  setIsInviteOpen(true);
                }}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] text-[#1D1D1F] dark:text-white text-[12px] font-semibold transition-all"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Invite</span>
              </button>
            )}

            <button
              onClick={() => setIsCommentsOpen(!isCommentsOpen)}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-[12px] font-semibold transition-all ${
                isCommentsOpen
                  ? 'bg-[#0071E3] text-white shadow-sm'
                  : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] text-[#1D1D1F] dark:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Activity ({comments.length})</span>
            </button>

            {isOwner && (
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="w-8 h-8 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#FF3B30]/10 flex items-center justify-center text-[#86868B] hover:text-[#FF3B30] transition-colors"
                title="Delete Shared Album"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Member Avatars Bar */}
        <div className="flex items-center space-x-3 pt-2">
          <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
            Members:
          </span>
          <div className="flex items-center -space-x-1.5">
            {members.map((m) => (
              <div
                key={m._id}
                title={`${m.name} (${m.role})`}
                className="w-7 h-7 rounded-full bg-[#0071E3] text-white flex items-center justify-center text-[10px] font-bold border-2 border-white dark:border-[#1C1C1E] shadow-sm"
              >
                {m.name[0]?.toUpperCase() || 'U'}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full px-6 md:px-8 py-6 gap-6">
        {/* Gallery Grid */}
        <div className="flex-1">
          {items.length === 0 ? (
            <div className="text-center py-24 space-y-3">
              <div className="w-14 h-14 rounded-full bg-[#0071E3]/10 text-[#0071E3] mx-auto flex items-center justify-center">
                <Users className="w-7 h-7 stroke-[1.5]" />
              </div>
              <h3 className="font-bold text-[16px] text-[#1D1D1F] dark:text-white">
                No Photos in this Shared Album
              </h3>
              <p className="text-[12px] text-[#86868B]">
                Click "+ Add Photos" above to contribute media to this collaborative album.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {items.map((media) => (
                <div key={media._id} className="relative group">
                  <MediaCard media={media} allMedia={items} />
                  {/* Reaction Heart Floating Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReaction(media._id, 'HEART');
                    }}
                    className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md text-white hover:text-[#FF2D55] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    title="React Heart"
                  >
                    <Heart className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sliding Activity & Comments Drawer */}
        {isCommentsOpen && (
          <aside className="w-80 md:w-96 rounded-3xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] p-4 flex flex-col shadow-xl animate-scale-in text-[12px] h-[75vh]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E] mb-3">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-[#0071E3]" />
                <h4 className="font-bold text-[14px]">Shared Album Activity</h4>
              </div>
              <button
                onClick={() => setIsCommentsOpen(false)}
                className="w-6 h-6 rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center text-[#86868B]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {comments.length === 0 ? (
                <div className="text-center py-16 text-[#86868B]">
                  No comments yet. Be the first to start the conversation!
                </div>
              ) : (
                comments.map((c) => (
                  <div key={c._id} className="p-3 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#1D1D1F] dark:text-white">
                        {c.authorName}
                      </span>
                      <span className="text-[10px] text-[#86868B]">
                        {format(new Date(c.createdAt), 'MMM d, p')}
                      </span>
                    </div>
                    <p className="text-[#3A3A3C] dark:text-[#E5E5EA]">{c.text}</p>
                  </div>
                ))
              )}
            </div>

            {/* Post Comment Input */}
            <form onSubmit={handleSendComment} className="pt-3 border-t border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center space-x-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 px-3 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#3A3A3C] outline-none text-[#1D1D1F] dark:text-white text-[12px]"
              />
              <button
                type="submit"
                disabled={isSendingComment || !newComment.trim()}
                className="w-8 h-8 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white flex items-center justify-center disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </aside>
        )}
      </div>

      {/* Add Photos from Library Modal */}
      {isAddPhotosOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Icons','Helvetica_Neue',Helvetica,Arial,sans-serif]">
          <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-[#1C1C1E] p-6 shadow-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] animate-scale-in max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E] mb-4">
              <div>
                <h3 className="font-bold text-[16px]">Select Photos from Your Library</h3>
                <p className="text-[11px] text-[#86868B]">{selectedMediaIds.length} items selected</p>
              </div>
              <button
                onClick={() => setIsAddPhotosOpen(false)}
                className="w-7 h-7 rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center text-[#86868B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Photos Grid Selector */}
            <div className="flex-1 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 p-1">
              {userLibrary.map((media) => {
                const isSelected = selectedMediaIds.includes(media._id);
                return (
                  <div
                    key={media._id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedMediaIds((ids) => ids.filter((id) => id !== media._id));
                      } else {
                        setSelectedMediaIds((ids) => [...ids, media._id]);
                      }
                    }}
                    className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                      isSelected ? 'border-[#0071E3] scale-95 shadow-md' : 'border-transparent hover:opacity-90'
                    }`}
                  >
                    <img
                      src={media.thumbnailUrl || media.previewUrl}
                      alt={media.originalName}
                      className="w-full h-full object-cover"
                    />
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#0071E3] text-white flex items-center justify-center shadow-sm">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center justify-end space-x-2">
              <button
                onClick={() => setIsAddPhotosOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[12px] font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAddPhotos}
                disabled={isAddingPhotos || selectedMediaIds.length === 0}
                className="px-5 py-2 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[12px] font-semibold shadow-sm disabled:opacity-50"
              >
                {isAddingPhotos ? 'Adding...' : `Add ${selectedMediaIds.length} Photos`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Icons','Helvetica_Neue',Helvetica,Arial,sans-serif]">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#1C1C1E] p-6 shadow-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] animate-scale-in text-[12px]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E] mb-4">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-4 h-4 text-[#0071E3]" />
                <h3 className="font-bold text-[16px]">Invite to {album.title}</h3>
              </div>
              <button
                onClick={() => setIsInviteOpen(false)}
                className="w-7 h-7 rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center text-[#86868B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {inviteResult ? (
              <div className="space-y-3 py-2">
                <div className="p-3 rounded-2xl bg-[#34C759]/10 text-[#34C759] font-medium text-[13px] flex items-center space-x-2">
                  <Check className="w-4 h-4" />
                  <span>Invitation link created!</span>
                </div>
                <div className="p-3 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#3A3A3C] flex items-center justify-between">
                  <span className="text-[11px] text-[#86868B] truncate mr-2 font-mono">
                    {inviteResult}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(inviteResult);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#0071E3] text-white font-semibold text-[11px]"
                  >
                    Copy Link
                  </button>
                </div>
                <p className="text-[11px] text-[#86868B]">
                  Send this link to your collaborator to invite them to this shared album.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendInvite} className="space-y-3.5">
                <div>
                  <label className="font-medium block mb-1">Collaborator Email</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="friend@example.com"
                    required
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#3A3A3C] text-[#1D1D1F] dark:text-white outline-none focus:border-[#0071E3]"
                  />
                </div>

                <div>
                  <label className="font-medium block mb-1">Role & Permissions</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#3A3A3C] text-[#1D1D1F] dark:text-white outline-none focus:border-[#0071E3]"
                  >
                    <option value="VIEWER">Viewer (Can view, download, and comment)</option>
                    <option value="EDITOR">Editor (Can also add photos and videos)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isInviting || !inviteEmail.trim()}
                  className="w-full py-2.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white font-semibold shadow-sm transition-all disabled:opacity-50 mt-2"
                >
                  {isInviting ? 'Generating Invitation...' : 'Send Invitation Link'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Apple Confirmation Modal: DELETE SHARED ALBUM */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Icons','Helvetica_Neue',Helvetica,Arial,sans-serif]">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#1C1C1E] p-6 shadow-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] text-center space-y-4 animate-scale-in text-[#1D1D1F] dark:text-[#F5F5F7]">
            <div className="w-12 h-12 rounded-full bg-[#FF3B30]/10 text-[#FF3B30] mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <h3 className="font-bold text-[17px] tracking-tight">
                Delete "{album.title}"?
              </h3>
              <p className="text-[12px] text-[#86868B] mt-1.5 leading-relaxed">
                Deleting this shared album will remove it from all members and collaborators.
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[13px] font-semibold text-[#1D1D1F] dark:text-white hover:bg-[#E5E5EA]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSharedAlbum}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-[#FF3B30] hover:bg-[#D70015] text-[13px] font-semibold text-white shadow-sm transition-all disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Shared Album'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
