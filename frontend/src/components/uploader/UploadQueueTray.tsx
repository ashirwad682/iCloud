import React, { useEffect } from 'react';
import {
  Upload,
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useUploadStore } from '../../stores/uploadStore';

export const UploadQueueTray: React.FC = () => {
  const {
    queue,
    isOpen,
    isMinimized,
    setIsOpen,
    setIsMinimized,
    removeItem,
    clearCompleted,
  } = useUploadStore();

  const totalCount = queue.length;
  const completedCount = queue.filter((i) => i.status === 'COMPLETED').length;
  const inProgressCount = queue.filter(
    (i) => i.status === 'UPLOADING' || i.status === 'PROCESSING' || i.status === 'PENDING'
  ).length;

  // Auto-dismiss within 2-5 seconds when all uploads finish successfully
  useEffect(() => {
    if (isOpen && queue.length > 0 && inProgressCount === 0 && completedCount > 0) {
      const timer = setTimeout(() => {
        clearCompleted();
        setIsOpen(false);
      }, 3500); // 3.5 seconds auto-dismiss
      return () => clearTimeout(timer);
    }
  }, [isOpen, queue.length, inProgressCount, completedCount, clearCompleted, setIsOpen]);

  if (!isOpen || queue.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 md:w-96 rounded-2xl bg-white/95 backdrop-blur-2xl shadow-2xl border border-[#E5E7EB] overflow-hidden animate-slide-up select-none text-[#1D1D1F]">
      {/* Apple iCloud-style Header */}
      <div className="px-4 py-3 bg-[#F9FAFB]/90 border-b border-[#E5E7EB] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {inProgressCount > 0 ? (
            <Loader2 className="w-4 h-4 text-[#0071E3] animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
          )}
          <span className="text-xs font-semibold text-[#1D1D1F]">
            {inProgressCount > 0
              ? `Uploading ${completedCount + 1} of ${totalCount} items...`
              : `${completedCount} items uploaded`}
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-[#8E8E93] hover:text-[#1D1D1F] hover:bg-[#E5E5EA]/60 transition-all"
          >
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={() => {
              clearCompleted();
              setIsOpen(false);
            }}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-[#8E8E93] hover:text-[#1D1D1F] hover:bg-[#E5E5EA]/60 transition-all"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded File List */}
      {!isMinimized && (
        <div className="max-h-64 overflow-y-auto divide-y divide-[#F2F2F7] p-2 text-xs bg-white">
          {queue.map((item) => (
            <div key={item.id} className="p-2 space-y-1.5 hover:bg-[#F9FAFB] rounded-xl transition-colors">
              <div className="flex items-center justify-between">
                <span className="font-medium text-[#1D1D1F] truncate max-w-[200px]" title={item.name}>
                  {item.name}
                </span>
                <div className="flex items-center space-x-1.5">
                  {item.status === 'PENDING' && (
                    <span className="text-[10px] font-medium text-[#8E8E93]">
                      Waiting...
                    </span>
                  )}
                  {item.status === 'UPLOADING' && (
                    <span className="text-[10px] font-semibold text-[#0071E3]">
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
                    <span title={item.error || 'Upload error'}>
                      <AlertCircle className="w-3.5 h-3.5 text-[#FF3B30]" />
                    </span>
                  )}
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-[#8E8E93] hover:text-[#1D1D1F] ml-1"
                    title="Remove from queue"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              {(item.status === 'UPLOADING' || item.status === 'PROCESSING' || item.status === 'PENDING') && (
                <div className="w-full h-1 bg-[#E5E5EA] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0071E3] transition-all duration-200"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
