import React, { useState } from 'react';
import {
  Image as ImageIcon,
  Film,
  FileText,
  FileSpreadsheet,
  File,
  Download,
  Maximize2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { getAttachmentUrl } from '../../services/chatService';

// Format bytes into human-readable string
const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
 };

/**
 * Modern media and attachment presentation component for chat bubbles.
 * Inspired by WhatsApp and modern messenger aesthetics without replicating proprietary styling.
 */
export const ChatMediaAttachment = ({
  attachment,
  isSender = false,
  onPreview,
  onDownload,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  if (!attachment) return null;

  const fileType = attachment.fileType?.toLowerCase() || '';
  const isImage = fileType === 'image' || attachment.mimeType?.startsWith('image/');
  const isVideo = fileType === 'video' || attachment.mimeType?.startsWith('video/');

  const resolvedUrl = getAttachmentUrl(attachment.url);

  // 1. IMAGE ATTACHMENT CARD
  if (isImage) {
    return (
      <div className="relative group/media my-1 max-w-sm sm:max-w-md overflow-hidden rounded-xl bg-slate-950/20 dark:bg-black/40 border border-black/5 dark:border-white/10 shadow-xs">
        {/* Loading Skeleton */}
        {!isLoaded && !hasError && (
          <div className="w-full h-48 sm:h-56 bg-slate-200/80 dark:bg-slate-800/80 animate-pulse flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-brand-600 dark:text-brand-400" />
            <span className="text-[11px] font-medium text-slate-500">Loading photo...</span>
          </div>
        )}

        {/* Fallback Card on Error */}
        {hasError ? (
          <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-xl flex items-center justify-between gap-3 text-slate-800 dark:text-slate-200">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-xs sm:text-sm font-bold truncate leading-snug" title={attachment.fileName}>
                  {attachment.fileName || 'Image attachment'}
                </p>
                <p className="text-[10px] text-slate-400">
                  {formatFileSize(attachment.size)} • Image
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setHasError(false);
                  setIsLoaded(false);
                  setRetryKey((prev) => prev + 1);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title="Retry loading image"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              {onDownload && (
                <button
                  type="button"
                  onClick={() => onDownload(attachment.fileKey, attachment.fileName)}
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  title="Download image"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Rendered Image */
          <div
            className="cursor-pointer relative overflow-hidden"
            onClick={() =>
              onPreview?.({
                url: resolvedUrl,
                fileName: attachment.fileName,
                fileKey: attachment.fileKey,
              })
            }
          >
            <img
              key={retryKey}
              src={resolvedUrl}
              alt={attachment.fileName || 'Shared image'}
              onLoad={() => setIsLoaded(true)}
              onError={() => setHasError(true)}
              className={`w-full max-h-72 sm:max-h-84 object-cover rounded-xl transition-all duration-300 ${
                isLoaded ? 'opacity-100 group-hover/media:scale-[1.02]' : 'opacity-0 h-0'
              }`}
              loading="lazy"
            />

            {/* Hover Actions Bar */}
            {isLoaded && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/media:opacity-100 transition-opacity flex items-end justify-between p-2.5 text-white pointer-events-none">
                <span className="text-[11px] font-medium truncate drop-shadow-md">
                  {attachment.fileName} {attachment.size ? `(${formatFileSize(attachment.size)})` : ''}
                </span>

                <div className="flex items-center gap-1.5 pointer-events-auto">
                  {onDownload && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownload(attachment.fileKey, attachment.fileName);
                      }}
                      className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs transition-colors cursor-pointer"
                      title="Download image"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreview?.({
                        url: resolvedUrl,
                        fileName: attachment.fileName,
                        fileKey: attachment.fileKey,
                      });
                    }}
                    className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs transition-colors cursor-pointer"
                    title="Fullscreen preview"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // 2. VIDEO ATTACHMENT CARD
  if (isVideo) {
    return (
      <div className="relative my-1 max-w-sm sm:max-w-md overflow-hidden rounded-xl bg-slate-950 border border-black/10 dark:border-white/10 shadow-xs">
        <video
          src={resolvedUrl}
          controls
          preload="metadata"
          className="max-h-72 w-full rounded-xl object-contain bg-black"
          onError={() => setHasError(true)}
        >
          Your browser does not support video playback.
        </video>

        {attachment.fileName && (
          <div className="px-2.5 py-1.5 bg-black/80 text-white text-[11px] flex items-center justify-between">
            <span className="truncate flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-brand-400 shrink-0" />
              <span className="truncate">{attachment.fileName}</span>
            </span>
            {attachment.size && (
              <span className="text-slate-400 text-[10px] shrink-0 ml-2">
                {formatFileSize(attachment.size)}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  // 3. DOCUMENT / OTHER FILE ATTACHMENT PILL
  const isPdf = fileType === 'pdf' || attachment.fileName?.endsWith('.pdf');
  const isSheet = ['spreadsheet', 'excel', 'csv'].includes(fileType) || /\.(xlsx?|csv)$/i.test(attachment.fileName);

  return (
    <div
      className={`flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl border transition-all my-1.5 min-w-[260px] sm:min-w-[320px] max-w-md shadow-2xs ${
        isSender
          ? 'bg-brand-800/90 border-brand-500/40 text-white'
          : 'bg-white dark:bg-slate-800 border-slate-200/90 dark:border-slate-700 text-slate-900 dark:text-white'
      }`}
    >
      <div className={`p-2.5 rounded-xl shrink-0 ${isSender ? 'bg-white/15 text-white' : isPdf ? 'bg-rose-50 text-rose-500 dark:bg-rose-950/50' : 'bg-blue-50 text-blue-500 dark:bg-blue-950/50'}`}>
        {isPdf ? (
          <FileText className="w-7 h-7 sm:w-8 sm:h-8 text-rose-500" />
        ) : isSheet ? (
          <FileSpreadsheet className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-500" />
        ) : (
          <File className="w-7 h-7 sm:w-8 sm:h-8 text-blue-500" />
        )}
      </div>

      <div className="flex-1 min-w-0 text-left">
        <p className="text-xs sm:text-sm font-bold truncate leading-snug" title={attachment.fileName}>
          {attachment.fileName}
        </p>
        <p className={`text-[11px] font-medium mt-0.5 ${isSender ? 'text-brand-100/90' : 'text-slate-400 dark:text-slate-400'}`}>
          {formatFileSize(attachment.size)} • {attachment.fileType?.toUpperCase() || 'FILE'}
        </p>
      </div>

      {onDownload && (
        <button
          type="button"
          onClick={() => onDownload(attachment.fileKey, attachment.fileName)}
          className={`p-2 rounded-xl transition-colors shrink-0 cursor-pointer ${
            isSender
              ? 'text-white/80 hover:text-white hover:bg-white/15'
              : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
          title={`Download ${attachment.fileName}`}
        >
          <Download className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

export default ChatMediaAttachment;
