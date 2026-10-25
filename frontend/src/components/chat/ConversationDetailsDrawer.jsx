import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  Image as ImageIcon,
  FileText,
  Link2,
  Download,
  ExternalLink,
  Search,
  ArrowUpDown,
  CornerDownRight,
  Copy,
  Check,
  Play,
  Film,
  FileSpreadsheet,
  FileCode,
  Archive,
  File,
  Loader2,
  Calendar,
  User,
  Users,
  Shield,
  Info,
  Maximize2,
  Eye,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import chatService, { getAttachmentUrl } from '../../services/chatService';
import UserAvatar from '../common/UserAvatar';

// Format bytes into human-readable string
const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

// Format timestamp
const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Today, ${timeStr}`;

  return (
    date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    }) + `, ${timeStr}`
  );
};

// Document icon and badge color resolver
const getDocumentMeta = (fileType, mimeType, fileName = '') => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  if (fileType === 'pdf' || ext === 'pdf' || mimeType?.includes('pdf')) {
    return {
      icon: FileText,
      badge: 'PDF',
      bgColor: 'bg-rose-50 dark:bg-rose-950/40',
      textColor: 'text-rose-600 dark:text-rose-400',
      borderColor: 'border-rose-200 dark:border-rose-800',
    };
  }

  if (['doc', 'docx'].includes(ext) || mimeType?.includes('word')) {
    return {
      icon: FileText,
      badge: 'DOCX',
      bgColor: 'bg-blue-50 dark:bg-blue-950/40',
      textColor: 'text-blue-600 dark:text-blue-400',
      borderColor: 'border-blue-200 dark:border-blue-800',
    };
  }

  if (['xls', 'xlsx', 'csv'].includes(ext) || mimeType?.includes('excel') || mimeType?.includes('spreadsheet')) {
    return {
      icon: FileSpreadsheet,
      badge: ext.toUpperCase() || 'XLSX',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      borderColor: 'border-emerald-200 dark:border-emerald-800',
    };
  }

  if (['ppt', 'pptx'].includes(ext) || mimeType?.includes('presentation') || mimeType?.includes('powerpoint')) {
    return {
      icon: File,
      badge: 'PPT',
      bgColor: 'bg-amber-50 dark:bg-amber-950/40',
      textColor: 'text-amber-600 dark:text-amber-400',
      borderColor: 'border-amber-200 dark:border-amber-800',
    };
  }

  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || mimeType?.includes('zip')) {
    return {
      icon: Archive,
      badge: 'ZIP',
      bgColor: 'bg-purple-50 dark:bg-purple-950/40',
      textColor: 'text-purple-600 dark:text-purple-400',
      borderColor: 'border-purple-200 dark:border-purple-800',
    };
  }

  return {
    icon: File,
    badge: ext ? ext.toUpperCase() : 'FILE',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    textColor: 'text-slate-600 dark:text-slate-300',
    borderColor: 'border-slate-200 dark:border-slate-700',
  };
};

/**
 * ConversationDetailsDrawer Component
 * Provides conversation-specific Media, Documents, and Links
 */
export default function ConversationDetailsDrawer({
  isOpen,
  onClose,
  conversation,
  conversationDetails,
  currentUserId,
  onJumpToMessage,
  onDownloadFile,
}) {
  const [activeTab, setActiveTab] = useState('media'); // 'media' | 'documents' | 'links'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' (newest) | 'asc' (oldest)

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Content collections
  const [mediaItems, setMediaItems] = useState([]);
  const [documentItems, setDocumentItems] = useState([]);
  const [linkItems, setLinkItems] = useState([]);
  const [counts, setCounts] = useState({ media: 0, documents: 0, links: 0, total: 0 });

  // Lightbox preview modal state
  const [lightboxItem, setLightboxItem] = useState(null); // { item, type: 'image'|'video' }

  // Copied link toast indicator
  const [copiedLinkId, setCopiedLinkId] = useState(null);

  // Expand participants state (for groups)
  const [showParticipants, setShowParticipants] = useState(false);

  const conversationId = conversation?._id?.toString();

  // Fetch shared content from backend
  const fetchSharedContent = useCallback(
    async (targetType = 'all') => {
      if (!conversationId) return;

      try {
        setLoading(true);
        setError(null);

        const res = await chatService.getSharedContent(conversationId, {
          type: targetType,
          sort: sortOrder,
          search: searchQuery.trim(),
          limit: 100,
        });

        if (res?.success && res.data) {
          if (res.data.counts) {
            setCounts(res.data.counts);
          }

          if (targetType === 'all') {
            setMediaItems(res.data.media || []);
            setDocumentItems(res.data.documents || []);
            setLinkItems(res.data.links || []);
          } else if (targetType === 'media') {
            setMediaItems(res.data.media || []);
          } else if (targetType === 'documents') {
            setDocumentItems(res.data.documents || []);
          } else if (targetType === 'links') {
            setLinkItems(res.data.links || []);
          }
        }
      } catch (err) {
        console.error('Failed to fetch conversation shared content:', err);
        setError(err.response?.data?.message || 'Could not load shared content for this conversation.');
      } finally {
        setLoading(false);
      }
    },
    [conversationId, sortOrder, searchQuery]
  );

  // Fetch on mount or when conversation / sort / search changes
  useEffect(() => {
    if (isOpen && conversationId) {
      fetchSharedContent('all');
    }
  }, [isOpen, conversationId, sortOrder, fetchSharedContent]);

  // Copy link handler
  const handleCopyLink = (item) => {
    if (!item?.url) return;
    navigator.clipboard.writeText(item.url).then(() => {
      setCopiedLinkId(item._id);
      setTimeout(() => setCopiedLinkId(null), 2000);
    });
  };

  // Jump to original message and close drawer if on mobile
  const handleJump = (messageId) => {
    if (!messageId) return;
    if (window.innerWidth < 768) {
      onClose();
    }
    onJumpToMessage(messageId);
  };

  // ESC keyboard handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (lightboxItem) {
          setLightboxItem(null);
        } else if (isOpen) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, lightboxItem, onClose]);

  if (!isOpen) return null;

  const isGroup = conversation?.type === 'group';
  const participants = conversation?.participants || [];

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className="md:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Details Drawer Panel */}
      <aside
        role="complementary"
        aria-label="Conversation details and shared media"
        className="fixed inset-y-0 right-0 w-full sm:w-96 md:static md:w-88 lg:w-96 h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl md:shadow-none z-40 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200 font-sans"
      >
        {/* Drawer Header */}
        <div className="h-16 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-slate-850/60">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Conversation Details
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close conversation details"
            aria-label="Close conversation details"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conversation Summary Card */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <UserAvatar
              sender={conversationDetails?.partner}
              name={conversationDetails?.title || 'Chat'}
              size="lg"
              isOnline={conversationDetails?.isOnline}
              showStatus={!isGroup}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {conversationDetails?.title}
                </h3>
                {isGroup && (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full uppercase bg-brand-50 text-brand-700 dark:bg-brand-950/80 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                    Channel
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {conversationDetails?.subtitle}
              </p>
            </div>
          </div>

          {/* Group Participants Accordion Toggle (if group conversation) */}
          {isGroup && (
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowParticipants((prev) => !prev)}
                className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-brand-600 transition-colors py-1 cursor-pointer"
                aria-expanded={showParticipants}
              >
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>Members ({participants.length})</span>
                </span>
                <ChevronRight
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                    showParticipants ? 'rotate-90' : ''
                  }`}
                />
              </button>

              {showParticipants && (
                <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto pr-1 no-scrollbar animate-in fade-in duration-150">
                  {participants.map((p) => {
                    const pId = (p._id || p).toString();
                    const isCreator = conversation?.creator?._id === pId || conversation?.creator === pId;
                    const isAdmin =
                      isCreator ||
                      (conversation?.groupAdmins || []).some(
                        (adminId) => (adminId._id || adminId).toString() === pId
                      );
                    return (
                      <div
                        key={pId}
                        className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <UserAvatar sender={p} name={p.name} size="xs" />
                          <span className="truncate text-slate-800 dark:text-slate-200 font-medium">
                            {p.name} {pId === currentUserId && '(You)'}
                          </span>
                        </div>
                        {isAdmin && (
                          <span className="text-[10px] font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 px-1.5 py-0.5 rounded border border-brand-200 dark:border-brand-800 shrink-0">
                            Admin
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Tabs (Media, Docs, Links) */}
        <div className="px-3 pt-2 bg-slate-50/50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('media')}
              className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'media'
                  ? 'bg-white dark:bg-slate-700 text-brand-700 dark:text-brand-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Media</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/70 dark:bg-slate-600 text-slate-700 dark:text-slate-300">
                {counts.media}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('documents')}
              className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'documents'
                  ? 'bg-white dark:bg-slate-700 text-brand-700 dark:text-brand-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Docs</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/70 dark:bg-slate-600 text-slate-700 dark:text-slate-300">
                {counts.documents}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('links')}
              className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'links'
                  ? 'bg-white dark:bg-slate-700 text-brand-700 dark:text-brand-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Links</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/70 dark:bg-slate-600 text-slate-700 dark:text-slate-300">
                {counts.links}
              </span>
            </button>
          </div>

          {/* Search & Sort Tool Bar */}
          <div className="py-2.5 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${activeTab}...`}
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-brand-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs flex items-center gap-1 shrink-0 cursor-pointer"
              title={sortOrder === 'desc' ? 'Sorting: Newest First' : 'Sorting: Oldest First'}
              aria-label={sortOrder === 'desc' ? 'Switch to oldest first' : 'Switch to newest first'}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium hidden sm:inline">
                {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
              </span>
            </button>
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-3 no-scrollbar relative bg-slate-50/40 dark:bg-slate-950/40">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
              <span className="text-xs">Loading {activeTab}...</span>
            </div>
          )}

          {error && !loading && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Unable to load content</p>
                <p className="mt-0.5 text-[11px]">{error}</p>
              </div>
            </div>
          )}

          {/* TAB 1: MEDIA GALLERY */}
          {!loading && !error && activeTab === 'media' && (
            mediaItems.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs px-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-2 text-slate-400">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <p className="font-semibold text-slate-700 dark:text-slate-300">No media yet</p>
                <p className="text-[11px] mt-1 text-slate-500 dark:text-slate-400">
                  {searchQuery
                    ? `No media matches "${searchQuery}" in this chat.`
                    : 'Photos and videos shared in this conversation will appear here.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {mediaItems.map((item) => {
                  const isVideo = item.fileType === 'video' || item.mimeType?.startsWith('video/');
                  return (
                    <div
                      key={item._id}
                      onClick={() => setLightboxItem(item)}
                      className="group relative aspect-square rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 cursor-pointer shadow-2xs hover:shadow-md transition-all"
                    >
                      {isVideo ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white relative">
                          <Film className="w-6 h-6 text-slate-400" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/20 transition-colors">
                            <div className="w-8 h-8 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                              <Play className="w-4 h-4 fill-current ml-0.5" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <img
                          src={getAttachmentUrl(item.url)}
                          alt={item.fileName || 'Media'}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      )}

                      {/* Hover Overlay with Sender & Date */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-1.5 text-[10px] text-white">
                        <span className="font-semibold truncate">{item.sender?.name}</span>
                        <span className="text-[9px] opacity-80">{formatDateTime(item.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* TAB 2: DOCUMENTS LIBRARY */}
          {!loading && !error && activeTab === 'documents' && (
            documentItems.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs px-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-2 text-slate-400">
                  <FileText className="w-5 h-5" />
                </div>
                <p className="font-semibold text-slate-700 dark:text-slate-300">No documents yet</p>
                <p className="text-[11px] mt-1 text-slate-500 dark:text-slate-400">
                  {searchQuery
                    ? `No files match "${searchQuery}" in this chat.`
                    : 'PDFs, spreadsheets, presentations, and documents shared in this chat will appear here.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {documentItems.map((item) => {
                  const meta = getDocumentMeta(item.fileType, item.mimeType, item.fileName);
                  const Icon = meta.icon;
                  return (
                    <div
                      key={item._id}
                      className="p-2.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700/80 shadow-2xs hover:border-brand-300 dark:hover:border-brand-700 transition-all flex items-start gap-2.5 group"
                    >
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${meta.bgColor} ${meta.textColor} ${meta.borderColor}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <h4
                            className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate hover:text-brand-600 transition-colors cursor-pointer"
                            onClick={() => window.open(item.url, '_blank')}
                            title={item.fileName}
                          >
                            {item.fileName}
                          </h4>
                          <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-750 text-slate-500 uppercase shrink-0">
                            {meta.badge}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                          <span>{formatFileSize(item.size)}</span>
                          <span>•</span>
                          <span className="truncate">{item.sender?.name}</span>
                          <span>•</span>
                          <span className="shrink-0">{formatDateTime(item.createdAt)}</span>
                        </div>

                        {/* Document Actions Row */}
                        <div className="mt-2 flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                          <button
                            type="button"
                            onClick={() => window.open(item.url, '_blank')}
                            className="text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Preview</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onDownloadFile(item.fileKey, item.fileName)}
                            className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                          >
                            <Download className="w-3 h-3" />
                            <span>Download</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleJump(item.messageId)}
                            className="ml-auto text-slate-500 hover:text-brand-600 flex items-center gap-1 cursor-pointer"
                            title="Jump to message in conversation"
                          >
                            <CornerDownRight className="w-3 h-3" />
                            <span>In Chat</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* TAB 3: LINKS COLLECTION */}
          {!loading && !error && activeTab === 'links' && (
            linkItems.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs px-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-2 text-slate-400">
                  <Link2 className="w-5 h-5" />
                </div>
                <p className="font-semibold text-slate-700 dark:text-slate-300">No links yet</p>
                <p className="text-[11px] mt-1 text-slate-500 dark:text-slate-400">
                  {searchQuery
                    ? `No links match "${searchQuery}" in this chat.`
                    : 'URLs and web pages shared in this conversation will be cataloged here automatically.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {linkItems.map((item) => (
                  <div
                    key={item._id}
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700/80 shadow-2xs hover:border-brand-300 dark:hover:border-brand-700 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="p-1 rounded-md bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800 shrink-0">
                          <Link2 className="w-3 h-3" />
                        </span>
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">
                          {item.hostname}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {formatDateTime(item.createdAt)}
                      </span>
                    </div>

                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline line-clamp-1 break-all flex items-center gap-1"
                    >
                      <span>{item.url}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>

                    {item.content && item.content !== item.url && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 mt-1 italic opacity-90">
                        "{item.content}"
                      </p>
                    )}

                    <div className="mt-2 pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Shared by {item.sender?.name}</span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyLink(item)}
                          className="hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                          title="Copy URL"
                        >
                          {copiedLinkId === item._id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-500 font-semibold">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleJump(item.messageId)}
                          className="hover:text-brand-600 flex items-center gap-1 cursor-pointer"
                          title="View message in conversation"
                        >
                          <CornerDownRight className="w-3 h-3" />
                          <span>In Chat</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </aside>

      {/* ENHANCED LIGHTBOX MODAL */}
      {lightboxItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Media Preview"
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-150"
        >
          {/* Top Control Bar */}
          <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10 text-white">
            <div className="min-w-0">
              <h4 className="text-sm font-semibold truncate">{lightboxItem.fileName}</h4>
              <p className="text-xs text-slate-300">
                Shared by {lightboxItem.sender?.name} • {formatDateTime(lightboxItem.createdAt)}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const mId = lightboxItem.messageId;
                  setLightboxItem(null);
                  handleJump(mId);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <CornerDownRight className="w-3.5 h-3.5" />
                <span>View in Chat</span>
              </button>

              <button
                type="button"
                onClick={() => onDownloadFile(lightboxItem.fileKey, lightboxItem.fileName)}
                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
                title="Download"
                aria-label="Download media"
              >
                <Download className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setLightboxItem(null)}
                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
                title="Close"
                aria-label="Close media preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Media Player / Image Display */}
          <div className="max-w-4xl max-h-[80vh] flex items-center justify-center overflow-hidden rounded-2xl">
            {lightboxItem.fileType === 'video' || lightboxItem.mimeType?.startsWith('video/') ? (
              <video
                src={getAttachmentUrl(lightboxItem.url)}
                controls
                autoPlay
                className="max-h-[75vh] max-w-full rounded-xl shadow-2xl"
              >
                Your browser does not support HTML5 video playback.
              </video>
            ) : (
              <img
                src={getAttachmentUrl(lightboxItem.url)}
                alt={lightboxItem.fileName}
                className="max-h-[75vh] max-w-full rounded-xl object-contain shadow-2xl"
              />
            )}
          </div>

          {/* Caption (if any) */}
          {lightboxItem.content && (
            <p className="mt-3 text-xs text-slate-200 text-center max-w-lg bg-black/40 px-3 py-1.5 rounded-lg backdrop-blur-xs">
              "{lightboxItem.content}"
            </p>
          )}
        </div>
      )}
    </>
  );
}
