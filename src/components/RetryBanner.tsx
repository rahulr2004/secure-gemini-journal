import React from 'react';
import { AlertCircle, RefreshCw, X } from 'lucide-react';

interface RetryBannerProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  isRetrying?: boolean;
}

export const RetryBanner: React.FC<RetryBannerProps> = ({
  message,
  onRetry,
  onDismiss,
  isRetrying = false,
}) => {
  if (!message) return null;

  return (
    <div className="bg-rose-50/90 backdrop-blur-md border border-rose-200 text-rose-900 px-4 py-3 rounded-2xl flex items-center justify-between gap-3 shadow-md mb-4 animate-in fade-in slide-in-from-top-2 duration-200 font-sans">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200">
          <AlertCircle className="w-4 h-4 text-rose-600" />
        </div>
        <p className="text-xs sm:text-sm font-medium truncate">{message}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onRetry && (
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-800 hover:bg-rose-900 disabled:opacity-50 text-white rounded-xl text-xs font-medium btn-3d cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'Retrying...' : 'Retry Save'}
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1.5 text-rose-600 hover:text-rose-900 rounded-lg hover:bg-rose-100/60 transition-colors cursor-pointer"
            title="Dismiss alert"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
