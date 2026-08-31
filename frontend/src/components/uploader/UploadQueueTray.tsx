import React, { useEffect } from 'react';
import {
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCw,
  FileVideo,
  FileImage,
} from 'lucide-react';
import { useUploadStore } from '../../stores/uploadStore';

function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatSpeed(bytesPerSec?: number): string {
  if (!bytesPerSec || bytesPerSec === 0) return '';
  return `${formatBytes(bytesPerSec)}/s`;
}

function formatTime(seconds?: number): string {
  if (!seconds || seconds <= 0) return '';
  if (seconds < 60) return `${seconds}s left`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s left`;
}

export const UploadQueueTray: React.FC = () => {
  const {
    queue,
    isOpen,
    isMinimized,
    setIsOpen,
    setIsMinimized,
    removeItem,
    retryItem,
    clearCompleted,
  } = useUploadStore();

  const totalCount = queue.length;
  const completedCount = queue.filter((i) => i.status === 'COMPLETED').length;
  const inProgressCount = queue.filter(
    (i) => i.status === 'UPLOADING' || i.status === 'PROCESSING' || i.status === 'PENDING'
  ).length;

  const totalBytes = queue.reduce((acc, i) => acc + (i.size || 0), 0);
  const totalUploadedBytes = queue.reduce((acc, i) => {
    if (i.status === 'COMPLETED') return acc + (i.size || 0);
    return acc + (i.uploadedBytes || 0);
  }, 0);

  const aggregatePercent = totalBytes > 0 ? Math.min(Math.round((totalUploadedBytes / totalBytes) * 100), 100) : 0;

  // Auto-dismiss after all uploads finish
  useEffect(() => {
    if (isOpen && queue.length > 0 && inProgressCount === 0 && completedCount > 0) {
      const timer = setTimeout(() => {
        clearCompleted();
        setIsOpen(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, queue.length, inProgressCount, completedCount, clearCompleted, setIsOpen]);

  if (!isOpen || queue.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-84 md:w-96 rounded-2xl bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-2xl shadow-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] overflow-hidden animate-slide-up select-none text-[#1D1D1F] dark:text-white transition-all font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',sans-serif]">
      {/* Apple iCloud Header */}
      <div className="px-4 py-3 bg-[#F9FAFB]/90 dark:bg-[#252528]/90 border-b border-[#E5E7EB] dark:border-[#2C2C2E] flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          {inProgressCount > 0 ? (
            <div className="relative flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-[#0071E3] animate-spin" />
            </div>
          ) : (
            <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
          )}
          <div>
            <span className="text-[13px] font-semibold text-[#1D1D1F] dark:text-white block leading-tight">
              {inProgressCount > 0
                ? `Uploading ${completedCount + 1} of ${totalCount} items`
                : `${completedCount} items uploaded`}
            </span>
            {inProgressCount > 0 && totalBytes > 0 && (
              <span className="text-[10px] text-[#86868B] dark:text-[#A1A1A6]">
                {formatBytes(totalUploadedBytes)} of {formatBytes(totalBytes)} ({aggregatePercent}%)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={() => {
              clearCompleted();
              setIsOpen(false);
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Aggregate Header Progress Line */}
      {inProgressCount > 0 && (
        <div className="w-full h-0.5 bg-[#E5E5EA] dark:bg-[#2C2C2E] overflow-hidden">
          <div
            className="h-full bg-[#0071E3] transition-all duration-300 ease-out"
            style={{ width: `${aggregatePercent}%` }}
          />
        </div>
      )}

      {/* Expanded File List */}
      {!isMinimized && (
        <div className="max-h-72 overflow-y-auto divide-y divide-[#F2F2F7] dark:divide-[#2C2C2E] p-2 text-xs bg-white dark:bg-[#1C1C1E]">
          {queue.map((item) => {
            const isVideo = item.file.type.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm|3gp|m4v)$/i.test(item.name);

            return (
              <div key={item.id} className="p-2 space-y-1.5 hover:bg-[#F9FAFB] dark:hover:bg-[#252528] rounded-xl transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    {isVideo ? (
                      <FileVideo className="w-3.5 h-3.5 text-[#0071E3] flex-shrink-0" />
                    ) : (
                      <FileImage className="w-3.5 h-3.5 text-[#34C759] flex-shrink-0" />
                    )}
                    <span className="font-medium text-[#1D1D1F] dark:text-white truncate" title={item.name}>
                      {item.name}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5 flex-shrink-0">
                    {item.status === 'PENDING' && (
                      <span className="text-[10px] font-medium text-[#86868B]">
                        Queued
                      </span>
                    )}
                    {item.status === 'UPLOADING' && (
                      <span className="text-[11px] font-semibold text-[#0071E3] tabular-nums">
                        {item.progress}%
                      </span>
                    )}
                    {item.status === 'PROCESSING' && (
                      <span className="text-[10px] font-semibold text-[#0071E3] animate-pulse">
                        Processing...
                      </span>
                    )}
                    {item.status === 'COMPLETED' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#34C759]" />
                    )}
                    {item.status === 'FAILED' && (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => retryItem(item.id)}
                          className="p-1 rounded-md bg-[#0071E3]/10 hover:bg-[#0071E3]/20 text-[#0071E3] transition-colors"
                          title="Retry upload"
                        >
                          <RotateCw className="w-3 h-3" />
                        </button>
                        <span title={item.error || 'Upload error'}>
                          <AlertCircle className="w-3.5 h-3.5 text-[#FF3B30]" />
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white p-0.5 rounded transition-colors"
                      title="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar & Speed / ETA Details */}
                {(item.status === 'UPLOADING' || item.status === 'PROCESSING' || item.status === 'PENDING') && (
                  <div className="space-y-1">
                    <div className="w-full h-1 bg-[#E5E5EA] dark:bg-[#2C2C2E] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#0071E3] transition-all duration-200 ease-out"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    {item.status === 'UPLOADING' && (
                      <div className="flex items-center justify-between text-[10px] text-[#86868B] dark:text-[#A1A1A6] tabular-nums">
                        <span>
                          {formatBytes(item.uploadedBytes)} / {formatBytes(item.size)}
                        </span>
                        <span>
                          {item.speedBytesPerSec && item.speedBytesPerSec > 0 && (
                            <>
                              {formatSpeed(item.speedBytesPerSec)}
                              {item.timeRemainingSec && item.timeRemainingSec > 0 ? ` · ${formatTime(item.timeRemainingSec)}` : ''}
                            </>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {item.status === 'FAILED' && item.error && (
                  <p className="text-[10px] text-[#FF3B30] truncate" title={item.error}>
                    {item.error}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

