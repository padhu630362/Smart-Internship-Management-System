import React, { useState } from 'react';
import {
  Plus,
  Home,
  AtSign,
  Star,
  Archive,
  ChevronDown,
  Search,
  SlidersHorizontal,
  X,
  Loader2,
  Image as ImageIcon,
  FileText,
  Film,
  Check,
  CheckCheck,
  Users,
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
  contacts = [],
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
  // Navigation shortcut tab: 'home' | 'mentions' | 'starred' | 'archived'
  const [activeShortcut, setActiveShortcut] = useState('home');
  // Unread toggle switch in Home pane
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  // Direct messages collapsible accordion
  const [directMessagesExpanded, setDirectMessagesExpanded] = useState(true);

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

  // Format date / day for conversation list matching screenshot (e.g. "Fri", "Wed", "09:25 pm")
  const formatConversationTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Filter conversations feed based on active shortcut, unread toggle, and search query
  const filteredFeedConversations = conversations.filter((c) => {
    if (showUnreadOnly && !(c.unreadCount > 0)) return false;

    if (activeShortcut === 'starred' && !c.isStarred && !c.pinnedMessage) return false;
    if (activeShortcut === 'archived' && !c.isArchived) return false;
    if (activeShortcut === 'mentions' && c.type !== CONVERSATION_TYPES.GROUP) return false;

    if (!searchQuery.trim()) return true;

    const details = getConversationDetails(c);
    const q = searchQuery.toLowerCase();
    return (
      details.title.toLowerCase().includes(q) ||
      (c.lastMessage?.content || '').toLowerCase().includes(q)
    );
  });

  // Effective list of contacts for direct messaging section
  const directList = contacts.length > 0 ? contacts : filteredCompanyMembers;

  return (
    <div
      className={`${
        mobileShowChat ? 'hidden md:flex' : 'flex'
      } w-full md:w-auto h-full shrink-0 select-none bg-white dark:bg-slate-900 border-r border-slate-200/90 dark:border-slate-800`}
    >
      {/* ============================================================== */}
      {/* TIER 1: SHORTCUTS & DIRECT MESSAGES (Leftmost sub-panel)        */}
      {/* ============================================================== */}
      <div className="w-14 sm:w-52 lg:w-56 h-full flex flex-col border-r border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 shrink-0">
        {/* Top "+ New chat" Button matching reference screenshot */}
        <div className="p-2 sm:p-3.5 sm:pb-2">
          <button
            type="button"
            onClick={onNewDirectChat}
            title="New chat"
            className="w-10 h-10 sm:w-full sm:py-2.5 sm:px-4 mx-auto rounded-full border border-brand-200/90 dark:border-brand-800/80 bg-white dark:bg-slate-850 hover:bg-brand-50/70 dark:hover:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-semibold text-xs flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer group"
          >
            <Plus className="w-4 h-4 text-brand-600 dark:text-brand-400 group-hover:scale-110 transition-transform stroke-[2.5]" />
            <span className="hidden sm:inline">New chat</span>
          </button>
        </div>

        {/* SHORTCUTS Section */}
        <div className="px-1.5 sm:px-3 pt-2 pb-1">
          <span className="hidden sm:block px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            SHORTCUTS
          </span>

          <nav className="space-y-0.5">
            {/* 1. Home */}
            <button
              type="button"
              onClick={() => {
                setActiveShortcut('home');
                onChangeFilter?.('all');
              }}
              title="Home"
              className={`w-full flex items-center justify-center sm:justify-start gap-2.5 p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeShortcut === 'home'
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/80 dark:text-brand-300 border border-brand-200/70 dark:border-brand-800/70 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className="relative shrink-0">
                <Home
                  className={`w-4 h-4 ${
                    activeShortcut === 'home' ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'
                  }`}
                />
                {totalUnread > 0 && (
                  <span className="sm:hidden absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-brand-600 text-white text-[9px] font-bold flex items-center justify-center">
                    {totalUnread > 9 ? '9+' : totalUnread}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline truncate">Home</span>
              {totalUnread > 0 && (
                <span className="hidden sm:flex ml-auto w-4 h-4 rounded-full bg-brand-600 text-white text-[10px] font-bold items-center justify-center">
                  {totalUnread}
                </span>
              )}
            </button>

            {/* 2. Mentions */}
            <button
              type="button"
              onClick={() => {
                setActiveShortcut('mentions');
                onChangeFilter?.('group');
              }}
              title="Mentions"
              className={`w-full flex items-center justify-center sm:justify-start gap-2.5 p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeShortcut === 'mentions'
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/80 dark:text-brand-300 font-semibold border border-brand-200/70 dark:border-brand-800/70 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <AtSign
                className={`w-4 h-4 ${
                  activeShortcut === 'mentions' ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'
                }`}
              />
              <span className="hidden sm:inline truncate">Mentions</span>
            </button>

            {/* 3. Starred */}
            <button
              type="button"
              onClick={() => setActiveShortcut('starred')}
              title="Starred"
              className={`w-full flex items-center justify-center sm:justify-start gap-2.5 p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeShortcut === 'starred'
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/80 dark:text-brand-300 font-semibold border border-brand-200/70 dark:border-brand-800/70 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Star
                className={`w-4 h-4 ${
                  activeShortcut === 'starred' ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'
                }`}
              />
              <span className="hidden sm:inline truncate">Starred</span>
            </button>

            {/* 4. Archived */}
            <button
              type="button"
              onClick={() => setActiveShortcut('archived')}
              title="Archived"
              className={`w-full flex items-center justify-center sm:justify-start gap-2.5 p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeShortcut === 'archived'
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/80 dark:text-brand-300 font-semibold border border-brand-200/70 dark:border-brand-800/70 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Archive
                className={`w-4 h-4 ${
                  activeShortcut === 'archived' ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'
                }`}
              />
              <span className="hidden sm:inline truncate">Archived</span>
            </button>
          </nav>
        </div>

        {/* DIRECT MESSAGES Section */}
        <div className="flex-1 flex flex-col min-h-0 pt-3">
          <div className="px-2 sm:px-3 pb-1.5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setDirectMessagesExpanded(!directMessagesExpanded)}
              className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
            >
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  directMessagesExpanded ? '' : '-rotate-90'
                }`}
              />
              <span>DIRECT MESSAGES</span>
              <span className="text-[10px] text-slate-400 font-normal">
                {directList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={onNewDirectChat}
              className="mx-auto sm:mx-0 p-1.5 sm:p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Start direct message"
              aria-label="Start direct message"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Contacts List */}
          {directMessagesExpanded && (
            <div className="flex-1 overflow-y-auto px-1 sm:px-2 space-y-0.5 no-scrollbar">
              {directList.length === 0 ? (
                <div className="p-2 sm:p-4 text-center text-slate-400 text-[11px]">
                  <span className="hidden sm:inline">No contacts found.</span>
                </div>
              ) : (
                directList.map((contact, idx) => {
                  const online = isUserOnline(contact._id || contact.id);
                  const isSelected =
                    activeConversation?.type === CONVERSATION_TYPES.DIRECT &&
                    (activeConversation.participants || []).some(
                      (p) => (p._id || p).toString() === (contact._id || contact.id || '').toString()
                    );

                  return (
                    <button
                      key={contact._id || contact.id || idx}
                      type="button"
                      onClick={() => onStartOrOpenChat(contact)}
                      title={contact.name}
                      className={`w-full flex items-center justify-center sm:justify-start gap-2.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-left transition-colors cursor-pointer group ${
                        isSelected
                          ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/80 dark:text-brand-300 font-semibold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <UserAvatar
                          sender={contact}
                          name={contact.name}
                          size="xs"
                          showStatus={false}
                        />
                        {online && (
                          <span
                            className="w-2 h-2 rounded-full bg-emerald-500 ring-1.5 ring-white dark:ring-slate-900 absolute -bottom-0.5 -right-0.5"
                            title="Online"
                          />
                        )}
                      </div>
                      <span className="hidden sm:inline text-xs truncate flex-1">{contact.name}</span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* TIER 2: CONVERSATIONS FEED (Home pane matching screenshot)       */}
      {/* ============================================================== */}
      <div className="flex-1 md:w-72 lg:w-80 h-full flex flex-col bg-white dark:bg-slate-900 shrink-0 min-w-0">
        {/* Header: Home title + Unread toggle + Filter icon */}
        <div className="px-4 pt-3.5 pb-2 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white capitalize">
              {activeShortcut === 'home'
                ? 'Home'
                : activeShortcut === 'mentions'
                ? 'Mentions'
                : activeShortcut === 'starred'
                ? 'Starred'
                : 'Archived'}
            </h2>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Unread
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={showUnreadOnly}
                onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${
                  showUnreadOnly ? 'bg-brand-600' : 'bg-slate-200 dark:bg-slate-700'
                }`}
                title="Toggle unread conversations only"
              >
                <span
                  className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform duration-150 ${
                    showUnreadOnly ? 'left-4.5' : 'left-0.5'
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={onNewGroupChat}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ml-1"
                title="Create Group / Channel"
                aria-label="Create Group or Channel"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Pill Input matching reference screenshot */}
          <div className="relative mt-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search chat or people..."
              aria-label="Search chat or people"
              value={searchQuery}
              onChange={(e) => onChangeSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-full bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 outline-none border border-slate-200/80 dark:border-slate-700 focus:border-brand-500/40 focus:bg-white dark:focus:bg-slate-900 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onChangeSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Conversations Feed List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 no-scrollbar">
          {loadingConversations ? (
            <div className="p-8 flex items-center justify-center text-slate-400 text-xs">
              <Loader2 className="w-5 h-5 animate-spin mr-2 text-brand-600 dark:text-brand-400" />
              Loading conversations...
            </div>
          ) : filteredFeedConversations.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs space-y-2">
              <p>
                {showUnreadOnly ? 'No unread messages.' : 'No conversations found.'}
              </p>
              <button
                type="button"
                onClick={onNewDirectChat}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950/80 dark:text-brand-300 font-semibold border border-brand-200 dark:border-brand-800 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Start a chat
              </button>
            </div>
          ) : (
            filteredFeedConversations.map((conv) => {
              const details = getConversationDetails(conv);
              const isActive = activeConversation?._id === conv._id;
              const hasUnread = (conv.unreadCount || 0) > 0;
              const isGroup = conv.type === CONVERSATION_TYPES.GROUP;

              // Generate clean snippet with icon
              let snippet = 'Started a chat';
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

              // Check if last message was sent by me and read by partner
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

              // Group initial (e.g. "TV" for Tech Verse)
              const groupInitials = isGroup
                ? (conv.name || 'G')
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase()
                : '';

              return (
                <div
                  key={conv._id}
                  onClick={() => onSelectConversation(conv)}
                  className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors relative ${
                    isActive
                      ? 'bg-brand-50/80 dark:bg-brand-950/50 border-l-4 border-brand-600'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 border-l-4 border-transparent'
                  }`}
                >
                  {isGroup ? (
                    <div className="w-10 h-10 rounded-full bg-brand-700 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                      {groupInitials}
                    </div>
                  ) : (
                    <UserAvatar
                      sender={details.partner}
                      name={details.title}
                      size="md"
                      isOnline={details.isOnline}
                      showStatus={true}
                    />
                  )}

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
                      <span className="text-[11px] text-slate-400 shrink-0 ml-1">
                        {formatConversationTime(conv.lastMessageAt || conv.updatedAt)}
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
                            <CheckCheck
                              className="w-3.5 h-3.5 text-sky-500 shrink-0 stroke-[2.5]"
                              title="Read"
                            />
                          ) : (
                            <Check
                              className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0"
                              title="Sent"
                            />
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
    </div>
  );
};

export default ConversationSidebar;
