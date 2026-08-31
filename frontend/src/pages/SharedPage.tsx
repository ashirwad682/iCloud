import React, { useEffect, useState } from 'react';
import { Share2, Lock, Calendar, Eye, Trash2, Copy, Check } from 'lucide-react';
import { Share } from '../types';
import { api } from '../services/api';
import { format } from 'date-fns';

export const SharedPage: React.FC = () => {
  const [shares, setShares] = useState<Share[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
    const fullUrl = `${window.location.origin}/shared/${token}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRevoke = async (id: string) => {
    try {
      await api.delete(`/shares/${id}`);
      setShares((prev) => prev.filter((s) => s._id !== id));
    } catch {
      // Ignore
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 pb-28">
      <div>
        <h1 className="font-display font-bold text-2xl text-foreground">Shared Links</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage your active public and password-protected sharing links
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-surface-800/40 animate-pulse" />
          ))}
        </div>
      ) : shares.length === 0 ? (
        <div className="text-center py-20 text-xs text-muted-foreground">
          You have no active shared links. Share any photo, video, or album to generate a link.
        </div>
      ) : (
        <div className="space-y-3">
          {shares.map((share) => (
            <div
              key={share._id}
              className="p-4 rounded-2xl glass-panel flex items-center justify-between border border-border text-xs"
            >
              <div className="space-y-1 max-w-md">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-foreground">{share.title}</span>
                  {share.isPasswordProtected && (
                    <span className="px-2 py-0.5 rounded-md bg-vault-amber/10 text-vault-amber text-[10px] font-semibold flex items-center space-x-1">
                      <Lock className="w-2.5 h-2.5" />
                      <span>Protected</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-3 text-[11px] text-muted-foreground">
                  <span>Target: {share.targetType}</span>
                  <span>·</span>
                  <span className="flex items-center space-x-1">
                    <Eye className="w-3 h-3" />
                    <span>{share.accessCount} views</span>
                  </span>
                  <span>·</span>
                  <span>
                    Created {format(new Date(share.createdAt), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleCopy(share.token, share._id)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-surface-800 hover:bg-surface-700 font-medium transition-all"
                >
                  {copiedId === share._id ? (
                    <Check className="w-3.5 h-3.5 text-vault-emerald" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedId === share._id ? 'Copied' : 'Copy Link'}</span>
                </button>
                <button
                  onClick={() => handleRevoke(share._id)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                  title="Revoke Share"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
