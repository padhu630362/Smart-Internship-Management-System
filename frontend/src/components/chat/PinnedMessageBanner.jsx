import React from 'react';
import { Pin, X, Loader2 } from 'lucide-react';

export const PinnedMessageBanner = ({
  pinnedData,
  onJumpToMessage,
  onUnpin,
  isUnpinning = false,
}) => {
  if (!pinnedData) return null;

  return (
    <div
      role="region"
      aria-label="Pinned message"
      className="px-3.5 py-2 bg-gradient-to-r from-amber-50/95 via-amber-50/80 to-orange-50/90 dark:from-amber-950/40 dark:via-slate-800/80 dark:to-orange-950/30 border-b border-amber-200/80 dark:border-amber-800/60 flex items-center justify-between gap-2.5 text-xs shadow-2xs animate-in fade-in slide-in-from-top-1 duration-150 shrink-0 z-10"
    >
      <button
        type="button"
        onClick={() => onJumpToMessage(pinnedData.messageId)}
        className="flex-1 min-w-0 flex items-center gap-2.5 text-left group focus:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500 rounded-lg p-0.5 cursor-pointer"
        title="Click to view pinned message in history"
        aria-label={`Jump to pinned message from ${pinnedData.senderName}`}
      >
        <div className="w-6 h-6 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
          <Pin className="w-3.5 h-3.5 fill-amber-500/30" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-800 dark:text-slate-100 text-[11px] truncate">
              {pinnedData.senderName}
            </span>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
              • Pinned
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">
            {pinnedData.preview}
          </p>
        </div>
      </button>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onJumpToMessage(pinnedData.messageId)}
          className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100/70 dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
          aria-label="Jump to pinned message"
        >
          <span>View</span>
        </button>

        <button
          type="button"
          onClick={onUnpin}
          disabled={isUnpinning}
          className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-amber-100/60 dark:hover:bg-amber-900/40 transition-colors cursor-pointer"
          title="Unpin message"
          aria-label="Unpin message"
        >
          {isUnpinning ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
          ) : (
            <X className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
};

export default PinnedMessageBanner;
