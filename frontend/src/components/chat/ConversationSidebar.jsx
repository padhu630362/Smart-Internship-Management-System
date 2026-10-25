import React from 'react';
import {
  MessageSquare,
  Users,
  Search,
  Plus,
  X,
  Loader2,
  Image as ImageIcon,
  FileText,
  Film,
  Paperclip,
  Check,
  CheckCheck,
} from 'lucide-react';
import UserAvatar from '../common/UserAvatar';
import { CONVERSATION_TYPES } from '../../services/chatService';

export const ConversationSidebar = ({
  conversations = [],
  activeConversation = null,
  onSelectConversation,
  searchQuery = '',
  onChangeSearch,
  filterType = 'all',
  onChangeFilter,
  loadingConversations = false,
  filteredCompanyMembers = [],
  isUserOnline = () => false,
  onStartOrOpenChat,
  onNewDirectChat,
  onNewGroupChat,
  canCreateGroup = false,
  formatMessageTime = (d) => '',
  formatLastSeen = (d) => 'Offline',
  currentUserId = '',
  mobileShowChat = false,
  isConnected = false,
}) => {
  // Compute total unread across all conversations
  const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  // Helper: Extract details for any conversation item
  const getConversationDetails = (conv) => {
    if (!conv) return { title: '', subtitle: '', partner: null, isOnline: false };
    if (conv.type === CONVERSATION_TYPES.GROUP) {
      return {
        title: conv.name || 'Group Conversation',
        subtitle: `${conv.participants?.length || 0} members`,
        partner: null,
        isOnline: false,
      };
    }

    const partner = (conv.participants || []).find(
      (p) => (p._id || p).toString() !== currentUserId
    );
    const isOnline = partner ? isUserOnline(partner._id || partner) : false;

    return {
      title: partner?.name || 'Direct Conversation',
      subtitle: partner?.role
        ? `${partner.role.charAt(0).toUpperCase() + partner.role.slice(1)} • ${isOnline ? 'Active Now' : formatLastSeen(partner.lastSeen)}`
        : isOnline ? 'Active Now' : formatLastSeen(partner?.lastSeen),
      partner,
      isOnline,
    };
  };

  // Filter conversations based on search and tab
  const filteredConversations = conversations.filter((c) => {
    if (filterType === 'unread' && !(c.unreadCount > 0)) return false;
    if (filterType === 'direct' && c.type !== CONVERSATION_TYPES.DIRECT) return false;
    if (filterType === 'group' && c.type !== CONVERSATION_TYPES.GROUP) return false;
    if (filterType === 'company') return false;
    if (!searchQuery.trim()) return true;

    const details = getConversationDetails(c);
    const q = searchQuery.toLowerCase();
    return (
      details.title.toLowerCase().includes(q) ||
      (c.lastMessage?.content || '').toLowerCase().includes(q)
    );
  });

  return (
    <div
      className={`${
        mobileShowChat ? 'hidden md:flex' : 'flex'
      } w-full md:w-80 lg:w-96 flex-col border-r border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 h-full select-none`}
    >
      {/* Sidebar Header */}
      <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/80 dark:text-brand-400 border border-brand-200/80 dark:border-brand-800/80 shadow-2xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-bold text-slate-900 dark:text-white leading-none">
                  Messages
                </h1>
                {isConnected && (
                  <span
                    className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"
                    title="Real-time connected"
                  />
                )}
              </div>
              <span className="text-[11px] text-slate-400 font-medium">SIMS Workspace</span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onNewDirectChat}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="New Direct Message"
              aria-label="Start new direct message"
            >
              <Plus className="w-4 h-4" />
            </button>
            {canCreateGroup && (
              <button
                type="button"
                onClick={onNewGroupChat}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Create Group Channel"
                aria-label="Create new group channel"
              >
                <Users className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search Field */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search conversations & contacts..."
            aria-label="Search conversations and contacts"
            value={searchQuery}
            onChange={(e) => onChangeSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-brand-500/20 border border-transparent focus:border-brand-500 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onChangeSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              title="Clear search input"
              aria-label="Clear search input"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 mt-3 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'All' },
            { id: 'unread', label: 'Unread', badge: totalUnread },
            { id: 'direct', label: 'Direct' },
            { id: 'group', label: 'Channels' },
            { id: 'company', label: 'Directory' },
          ].map((tab) => {
            const isSelected = filterType === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChangeFilter(tab.id)}
                className={`py-1 px-2.5 text-xs rounded-lg font-medium transition-all text-center flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/90 dark:text-brand-300 font-bold border border-brand-200/90 dark:border-brand-800/90 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isSelected
                        ? 'bg-brand-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conversations List & Stream */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 no-scrollbar">
        {filterType === 'company' ? (
          /* Directory / Company Representatives */
          filteredCompanyMembers.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No contacts found in directory.
            </div>
          ) : (
            filteredCompanyMembers.map((member) => {
              const online = isUserOnline(member._id);
              const isChatActive =
                activeConversation?.type === CONVERSATION_TYPES.DIRECT &&
                (activeConversation.participants || []).some(
                  (p) => (p._id || p).toString() === member._id.toString()
                );

              return (
                <div
                  key={member._id}
                  onClick={() => onStartOrOpenChat(member)}
                  className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors ${
                    isChatActive
                      ? 'bg-brand-50/80 dark:bg-brand-950/40 border-l-4 border-brand-600'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <UserAvatar
                    sender={member}
                    name={member.name}
                    size="md"
                    isOnline={online}
                    showStatus={true}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {member.name}
                      </span>
                      <span className="text-[10px] text-slate-400 capitalize">
                        {member.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {online ? 'Active now' : formatLastSeen(member.lastSeen)}
                    </p>
                  </div>
                </div>
              );
            })
          )
        ) : loadingConversations ? (
          <div className="p-8 flex items-center justify-center text-slate-400 text-xs">
            <Loader2 className="w-5 h-5 animate-spin mr-2 text-brand-600 dark:text-brand-400" />
            Loading conversations...
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs space-y-2">
            <p>
              {filterType === 'unread'
                ? 'No unread messages.'
                : 'No conversations found.'}
            </p>
            {filterType !== 'unread' && (
              <button
                type="button"
                onClick={onNewDirectChat}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/80 dark:text-brand-300 font-semibold border border-brand-200 dark:border-brand-800 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Start a message
              </button>
            )}
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const details = getConversationDetails(conv);
            const isActive = activeConversation?._id === conv._id;
            const hasUnread = (conv.unreadCount || 0) > 0;

            // Generate clean snippet with icon
            let snippet = 'No messages yet';
            let snippetIcon = null;

            if (conv.lastMessage?.isDeleted) {
              snippet = 'This message was deleted';
            } else if (conv.lastMessage?.content) {
              snippet = conv.lastMessage.content;
            } else if (conv.lastMessage?.attachments?.length > 0) {
              const att = conv.lastMessage.attachments[0];
              snippet = att.fileName || 'Attachment';
              if (att.fileType === 'image' || att.mimeType?.startsWith('image/')) {
                snippetIcon = <ImageIcon className="w-3 h-3 shrink-0 text-brand-500" />;
              } else if (att.fileType === 'video' || att.mimeType?.startsWith('video/')) {
                snippetIcon = <Film className="w-3 h-3 shrink-0 text-purple-500" />;
              } else {
                snippetIcon = <FileText className="w-3 h-3 shrink-0 text-blue-500" />;
              }
            }

            // Check if last message was sent by me and whether it was read
            const lastMsgSenderId = (
              conv.lastMessage?.sender?._id ||
              conv.lastMessage?.sender ||
              ''
            ).toString();
            const isLastMsgFromMe =
              Boolean(lastMsgSenderId) &&
              Boolean(currentUserId) &&
              lastMsgSenderId === currentUserId.toString();

            let isLastMsgRead = false;
            if (isLastMsgFromMe && conv.lastMessageAt) {
              const lastMsgTime = new Date(conv.lastMessageAt).getTime();
              if (conv.type === CONVERSATION_TYPES.DIRECT) {
                const partnerId = (details.partner?._id || details.partner || '').toString();
                const partnerReceipt = (conv.readReceipts || []).find(
                  (r) => (r.user?._id || r.user || '').toString() === partnerId
                );
                if (partnerReceipt?.lastReadAt) {
                  isLastMsgRead = new Date(partnerReceipt.lastReadAt).getTime() >= lastMsgTime;
                }
              } else {
                const otherReceipts = (conv.readReceipts || []).filter(
                  (r) => (r.user?._id || r.user || '').toString() !== currentUserId.toString()
                );
                isLastMsgRead = otherReceipts.some(
                  (r) => r.lastReadAt && new Date(r.lastReadAt).getTime() >= lastMsgTime
                );
              }
            }

            return (
              <div
                key={conv._id}
                onClick={() => onSelectConversation(conv)}
                className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors relative ${
                  isActive
                    ? 'bg-brand-50/80 dark:bg-brand-950/50 border-l-4 border-brand-600'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <UserAvatar
                  sender={details.partner}
                  name={details.title}
                  size="md"
                  isOnline={details.isOnline}
                  showStatus={conv.type === CONVERSATION_TYPES.DIRECT}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span
                      className={`text-xs truncate ${
                        hasUnread
                          ? 'font-bold text-slate-900 dark:text-white'
                          : 'font-semibold text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {details.title}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0 ml-1">
                      {formatMessageTime(conv.lastMessageAt || conv.updatedAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-1">
                    <p
                      className={`text-[11px] truncate flex items-center gap-1 ${
                        hasUnread
                          ? 'font-semibold text-slate-900 dark:text-white'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {isLastMsgFromMe && (
                        isLastMsgRead ? (
                          <CheckCheck className="w-3.5 h-3.5 text-sky-500 shrink-0 stroke-[2.5]" title="Read" />
                        ) : (
                          <CheckCheck className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0 stroke-[2]" title="Delivered" />
                        )
                      )}
                      {snippetIcon}
                      <span className="truncate">{snippet}</span>
                    </p>
                    {hasUnread && (
                      <span className="w-4 h-4 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ConversationSidebar;
