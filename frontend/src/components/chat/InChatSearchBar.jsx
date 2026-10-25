import React, { useRef, useEffect } from 'react';
import { Search, X, Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Safely highlights matching query text without using dangerouslySetInnerHTML
 */
export const SafeHighlight = ({ text = '', highlight = '' }) => {
  if (!highlight || !highlight.trim() || !text) return <>{text}</>;
  const query = highlight.trim();
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <span>
      {parts.map((part, idx) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={idx}
            className="bg-amber-200 dark:bg-amber-400/30 text-amber-950 dark:text-amber-100 font-semibold px-0.5 rounded-xs"
          >
            {part}
          </mark>
        ) : (
          <span key={idx}>{part}</span>
        )
      )}
    </span>
  );
};

export const InChatSearchBar = ({
  isOpen,
  query = '',
  onChangeQuery,
  onClose,
  loading = false,
  error = null,
  results = [],
  pagination = { total: 0, totalPages: 1, page: 1, hasMore: false },
  onPrevPage,
  onNextPage,
  onSelectResult,
  onRetry,
  jumpingMessageId = null,
  formatSearchDate = (d) => new Date(d).toLocaleDateString(),
}) => {
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="search"
      aria-label="In-chat message search"
      className="bg-white dark:bg-slate-900 border-b border-slate-200/90 dark:border-slate-800 shadow-sm animate-in fade-in slide-in-from-top-2 duration-150 shrink-0 z-20"
    >
      {/* Top Search Input Row */}
      <div className="px-4 py-2.5 flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800/80">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          ref={inputRef}
          type="search"
          role="searchbox"
          placeholder="Search message history in this conversation..."
          aria-label="Search messages in this conversation"
          value={query}
          onChange={(e) => onChangeQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              onClose();
            }
          }}
          className="flex-1 py-1 px-1 text-xs sm:text-sm bg-transparent border-none outline-none text-slate-900 dark:text-white placeholder-slate-400"
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              onChangeQuery('');
              inputRef.current?.focus();
            }}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Clear search"
            aria-label="Clear search input"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Results Count and Page Controls */}
        {pagination.total > 0 && !loading && (
          <div className="flex items-center gap-1.5 pl-2.5 border-l border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 shrink-0">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {pagination.total} {pagination.total === 1 ? 'match' : 'matches'}
            </span>
            {pagination.totalPages > 1 && (
              <div className="flex items-center gap-0.5 ml-1">
                <button
                  type="button"
                  disabled={pagination.page <= 1 || loading}
                  onClick={onPrevPage}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none text-slate-600 dark:text-slate-400 cursor-pointer"
                  title="Previous results page"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-1 text-[10px] font-medium text-slate-400">
                  {pagination.page}/{pagination.totalPages}
                </span>
                <button
                  type="button"
                  disabled={!pagination.hasMore || loading}
                  onClick={onNextPage}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none text-slate-600 dark:text-slate-400 cursor-pointer"
                  title="Next results page"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
          title="Close search (Esc)"
          aria-label="Close search"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Results Dropdown Container */}
      {query.trim() && (
        <div className="max-h-72 overflow-y-auto bg-slate-50/60 dark:bg-slate-900/60 divide-y divide-slate-100 dark:divide-slate-800">
          {loading ? (
            <div className="py-7 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-brand-600 dark:text-brand-400" />
              <span>Searching conversation history...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50/80 dark:bg-red-950/30 text-xs text-red-600 dark:text-red-400 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span className="truncate">{error}</span>
              </div>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md font-semibold text-[11px] shrink-0 transition-colors cursor-pointer"
                >
                  Retry
                </button>
              )}
            </div>
          ) : results.length === 0 ? (
            <div className="py-7 px-4 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                No matching messages found
              </p>
              <p className="text-[11px] text-slate-400">
                Try a different keyword or check your spelling.
              </p>
            </div>
          ) : (
            results.map((result) => {
              const sender = result.sender || {};
              const senderName = sender.name || 'Unknown';
              const senderRole = sender.role || '';
              const isJumpingThis = jumpingMessageId === result._id;

              return (
                <button
                  key={result._id}
                  type="button"
                  onClick={() => onSelectResult(result._id)}
                  disabled={isJumpingThis}
                  className="w-full text-left px-4 py-2.5 hover:bg-brand-50/70 dark:hover:bg-slate-800 transition-colors flex flex-col gap-1 focus:outline-hidden focus:bg-brand-50 dark:focus:bg-slate-800 group cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs w-full">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-brand-600 dark:group-hover:text-brand-400">
                        {senderName}
                      </span>
                      {senderRole && (
                        <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded uppercase tracking-wider bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {senderRole}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      {formatSearchDate(result.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    <SafeHighlight text={result.content} highlight={query} />
                  </p>
                  <div className="flex items-center gap-1 text-[11px] font-medium text-brand-600 dark:text-brand-400 opacity-80 group-hover:opacity-100 transition-opacity pt-0.5">
                    {isJumpingThis ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Jumping to message...</span>
                      </>
                    ) : (
                      <>
                        <span>Jump to message in timeline</span>
                        <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default InChatSearchBar;
