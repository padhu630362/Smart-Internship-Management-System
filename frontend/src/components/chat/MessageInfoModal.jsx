import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  CheckCheck,
  Clock,
  Info,
  Users,
  FileText,
  Image as ImageIcon,
  Film,
  Sparkles,
} from 'lucide-react';
import chatService from '../../services/chatService';

// Role styling utility
const getRoleBadgeClasses = (role) => {
  switch ((role || '').toLowerCase()) {
    case 'mentor':
      return 'bg-brand-50 text-brand-700 dark:bg-brand-950/80 dark:text-brand-300 border-brand-200 dark:border-brand-800';
    case 'student':
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    case 'company':
    case 'employer':
      return 'bg-purple-50 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border-purple-200 dark:border-purple-800';
    case 'coordinator':
      return 'bg-amber-50 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    case 'admin':
      return 'bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200 dark:border-rose-800';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  }
};

const formatTimeDetailed = (dateVal) => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) {
    return `Today at ${timeStr}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return `Yesterday at ${timeStr}`;
  }
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
};

const MessageInfoModal = ({
  isOpen,
  onClose,
  message,
  conversation,
  currentUserId,
  formatMessageTime,
}) => {
  const [activeTab, setActiveTab] = useState('read'); // 'read' | 'delivered'
  const [loading, setLoading] = useState(false);
  const [detailedData, setDetailedData] = useState(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch detailed read receipt records from backend
  useEffect(() => {
    if (!isOpen || !message?._id) {
      setDetailedData(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    chatService
      .getMessageReadInfo(message._id)
      .then((res) => {
        if (isMounted && res.success && res.data) {
          setDetailedData(res.data);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch detailed read info, falling back to local state:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, message?._id]);

  if (!isOpen || !message) return null;

  const isGroup = conversation?.type === 'group';
  const participants = conversation?.participants || [];
  const senderId = (message.sender?._id || message.sender || '').toString();

  // Compute local fallback if detailed backend data is still loading
  const otherParticipants = participants.filter(
    (p) => (p._id || p).toString() !== senderId
  );

  const readByIdSet = new Set(
    (message.readBy || []).map((id) => (id._id || id).toString())
  );

  const localReadBy = [];
  const localDeliveredTo = [];

  otherParticipants.forEach((p) => {
    const pId = (p._id || p).toString();
    const hasRead = readByIdSet.has(pId);
    const userObj = {
      _id: p._id || p,
      name: p.name || 'Group Member',
      role: p.role || 'Member',
      profile: p.profile || {},
      email: p.email || '',
    };
    if (hasRead) {
      // Find readAt from message.readBy if populated object
      const foundInReadBy = (message.readBy || []).find(
        (rb) => (rb._id || rb).toString() === pId
      );
      localReadBy.push({
        user: userObj,
        readAt: foundInReadBy?.readAt || null,
      });
    } else {
      localDeliveredTo.push({
        user: userObj,
      });
    }
  });

  const readByList = detailedData?.readBy || localReadBy;
  const deliveredToList = detailedData?.deliveredTo || localDeliveredTo;
  const totalOthers = Math.max(1, otherParticipants.length);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/80 border border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <CheckCheck className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                Message Info
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {isGroup
                  ? `${conversation?.name || 'Group'} • ${readByList.length} of ${totalOthers} read`
                  : 'Direct Message • Delivery & Read Status'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Preview Quote Box */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/50 shrink-0">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 flex items-center justify-between">
            <span>Sent Message</span>
            <span>{formatTimeDetailed(message.createdAt)}</span>
          </div>
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            {message.content && (
              <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words leading-relaxed max-h-24 overflow-y-auto">
                {message.content}
              </p>
            )}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                {message.attachments[0].fileType === 'image' ||
                message.attachments[0].mimeType?.startsWith('image/') ? (
                  <ImageIcon className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                ) : message.attachments[0].fileType === 'video' ||
                  message.attachments[0].mimeType?.startsWith('video/') ? (
                  <Film className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                )}
                <span className="truncate font-medium">
                  {message.attachments[0].fileName || 'Attachment'}
                </span>
                {message.attachments.length > 1 && (
                  <span className="text-[10px] text-slate-400 font-normal">
                    +{message.attachments.length - 1} more
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Body Section */}
        {isGroup ? (
          /* GROUP CHAT TABS & SEEN LIST */
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Segmented Tabs */}
            <div className="flex items-center gap-2 p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('read')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  activeTab === 'read'
                    ? 'bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800 shadow-2xs'
                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <CheckCheck className="w-3.5 h-3.5 text-sky-500 stroke-[2.5]" />
                <span>Read by ({readByList.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('delivered')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  activeTab === 'delivered'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 shadow-2xs'
                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Check className="w-3.5 h-3.5 text-slate-400" />
                <span>Delivered to ({deliveredToList.length})</span>
              </button>
            </div>

            {/* List Container */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 p-2">
              {activeTab === 'read' ? (
                readByList.length === 0 ? (
                  <div className="py-10 text-center px-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-2 text-slate-400">
                      <Clock className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Not read yet
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      No one in this group has opened this message yet.
                    </p>
                  </div>
                ) : (
                  readByList.map((item, idx) => {
                    const u = item.user || {};
                    const avatarUrl = u.profile?.avatar;
                    const initials = (u.name || 'U')
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2);

                    return (
                      <div
                        key={u._id || idx}
                        className="p-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={u.name}
                              className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-linear-to-tr from-brand-600 to-brand-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {initials}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {u.name || 'Group Member'}
                              </span>
                              {u.role && (
                                <span
                                  className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-sm border leading-none ${getRoleBadgeClasses(
                                    u.role
                                  )}`}
                                >
                                  {u.role}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 truncate block">
                              {u.email || ''}
                            </span>
                          </div>
                        </div>

                        {/* Read Status Right Side */}
                        <div className="flex items-center gap-1 text-[11px] text-sky-600 dark:text-sky-400 font-semibold shrink-0">
                          <CheckCheck className="w-4 h-4 text-sky-500 stroke-[2.5]" />
                          <span>{item.readAt ? formatTimeDetailed(item.readAt) : 'Read'}</span>
                        </div>
                      </div>
                    );
                  })
                )
              ) : deliveredToList.length === 0 ? (
                <div className="py-10 text-center px-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Read by everyone!
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    All members in this group have read this message.
                  </p>
                </div>
              ) : (
                deliveredToList.map((item, idx) => {
                  const u = item.user || {};
                  const avatarUrl = u.profile?.avatar;
                  const initials = (u.name || 'U')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <div
                      key={u._id || idx}
                      className="p-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={u.name}
                            className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700 opacity-80"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {u.name || 'Group Member'}
                            </span>
                            {u.role && (
                              <span
                                className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-sm border leading-none ${getRoleBadgeClasses(
                                  u.role
                                )}`}
                              >
                                {u.role}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 truncate block">
                            {u.email || ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 shrink-0">
                        <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                        <span>Not yet read</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* DIRECT (1:1) CHAT TIMELINE */
          <div className="p-5 space-y-6 flex-1 overflow-y-auto">
            {/* Read Step */}
            <div className="flex items-start gap-3.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                  readByList.length > 0
                    ? 'bg-sky-50 dark:bg-sky-950/80 border-sky-300 dark:border-sky-700 text-sky-600 dark:text-sky-400'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                }`}
              >
                <CheckCheck className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {readByList.length > 0 ? (
                      <span className="text-sky-600 dark:text-sky-400 font-bold">
                        Read
                      </span>
                    ) : (
                      'Read'
                    )}
                  </h4>
                  {readByList.length > 0 && readByList[0]?.readAt && (
                    <span className="text-[11px] text-slate-400">
                      {formatTimeDetailed(readByList[0].readAt)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {readByList.length > 0
                    ? `Seen by ${readByList[0]?.user?.name || 'recipient'}`
                    : 'The recipient has not read this message yet.'}
                </p>
              </div>
            </div>

            {/* Delivered Step */}
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Delivered
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    {formatTimeDetailed(message.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Delivered to recipient device.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageInfoModal;
