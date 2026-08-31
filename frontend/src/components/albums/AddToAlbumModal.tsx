import React, { useState, useEffect } from 'react';
import { X, FolderPlus, Plus, Check } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { api } from '../../services/api';
import { Album } from '../../types';

export const AddToAlbumModal: React.FC = () => {
  const {
    isAddToAlbumModalOpen,
    albumTargetMediaIds,
    closeAddToAlbumModal,
    clearSelection,
  } = useUIStore();

  const [albums, setAlbums] = useState<Album[]>([]);
  const [newAlbumTitle, setNewAlbumTitle] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successAlbumId, setSuccessAlbumId] = useState<string | null>(null);

  useEffect(() => {
    if (isAddToAlbumModalOpen) {
      api.get('/albums').then((res: any) => {
        if (res.data?.success) setAlbums(res.data.data);
      });
    }
  }, [isAddToAlbumModalOpen]);

  if (!isAddToAlbumModalOpen || albumTargetMediaIds.length === 0) return null;

  const handleAddToExisting = async (albumId: string) => {
    setIsLoading(true);
    try {
      await api.post(`/albums/${albumId}/media`, {
        mediaIds: albumTargetMediaIds,
      });
      setSuccessAlbumId(albumId);
      setTimeout(() => {
        closeAddToAlbumModal();
        clearSelection();
      }, 800);
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlbumTitle.trim()) return;

    setIsLoading(true);
    try {
      const createRes = await api.post('/albums', {
        title: newAlbumTitle.trim(),
      });
      if (createRes.data?.success) {
        const newAlbum = createRes.data.data;
        await api.post(`/albums/${newAlbum._id}/media`, {
          mediaIds: albumTargetMediaIds,
        });
        setSuccessAlbumId(newAlbum._id);
        setTimeout(() => {
          closeAddToAlbumModal();
          clearSelection();
        }, 800);
      }
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in">
      <div className="w-full max-w-md rounded-3xl bg-white/95 dark:bg-surface-950/95 p-6 shadow-2xl border border-[#E5E7EB] dark:border-white/10 text-foreground animate-scale-in">
        <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <FolderPlus className="w-4 h-4" />
            </div>
            <h3 className="font-display font-bold text-base">Add to Album</h3>
          </div>
          <button onClick={closeAddToAlbumModal} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isCreatingNew ? (
          <form onSubmit={handleCreateAndAdd} className="space-y-4">
            <input
              type="text"
              value={newAlbumTitle}
              onChange={(e) => setNewAlbumTitle(e.target.value)}
              placeholder="Enter album title (e.g. Summer Vacation)"
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-900 border border-border text-xs text-foreground focus:border-primary outline-none"
            />
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className="flex-1 py-2 rounded-xl bg-surface-100 hover:bg-surface-200 text-xs font-semibold text-foreground border border-border"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !newAlbumTitle.trim()}
                className="flex-1 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-glow disabled:opacity-50"
              >
                Create & Add
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <button
              onClick={() => setIsCreatingNew(true)}
              className="w-full flex items-center space-x-3 p-3 rounded-2xl border border-dashed border-border hover:border-primary text-primary hover:bg-primary/5 text-xs font-semibold transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Album</span>
            </button>

            <div className="max-h-56 overflow-y-auto divide-y divide-border">
              {albums.map((album) => (
                <button
                  key={album._id}
                  onClick={() => handleAddToExisting(album._id)}
                  disabled={isLoading}
                  className="w-full flex items-center justify-between p-3 hover:bg-surface-100 dark:hover:bg-surface-800/60 rounded-xl text-left transition-all text-xs"
                >
                  <div>
                    <div className="font-semibold text-foreground">{album.title}</div>
                    <div className="text-[11px] text-muted-foreground">{album.itemCount} items</div>
                  </div>
                  {successAlbumId === album._id ? (
                    <Check className="w-4 h-4 text-vault-emerald" />
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
