import React from 'react';
import {
  ArrowLeft,
  Search,
  PanelRight,
  Maximize2,
  Minimize2,
  Info,
  X,
  Users,
} from 'lucide-react';
import UserAvatar from '../common/UserAvatar';
import { CONVERSATION_TYPES } from '../../services/chatService';

export const ChatHeader = ({
  conversation,
  details,
  typingUsers = new Set(),
  showInChatSearch = false,
  onToggleSearch,
  showDetailsDrawer = false,
  onToggleDetails,
  pushPermission = 'default',
  onBackMobile,
  onOpenGroupInfo,
  isFullscreen = false,
  onToggleFullscreen,
  formatLastSeen = (d) => (d ? 'Recently' : 'Offline'),
}) => {
  if (!conversation) return null;

  const isGroup = conversation.type === CONVERSATION_TYPES.GROUP;
  const isDirect = conversation.type === CONVERSATION_TYPES.DIRECT;
  const typingList = Array.from(typingUsers.values ? typingUsers.values() : typingUsers);

  // Group initials badge (e.g. "TV" for Tech Verse)
  const groupInitials = isGroup
    ? (conversation.name || 'G')
        .split(' ')
        .map((w) => w[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : '';

  return (
    <div className="h-16 px-4 sm:px-6 border-b border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center justify-between shrink-0 z-10 shadow-2xs">
      {/* Left side: Avatar + Contact/Group Name + Subtitle */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile back navigation button */}
        <button
          type="button"
          onClick={onBackMobile}
          className="md:hidden p-2 -ml-1 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Back to conversations list"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Circular Avatar */}
        <div className="relative shrink-0">
          {isGroup ? (
            <div className="w-10 h-10 rounded-full bg-brand-700 text-white font-bold text-xs flex items-center justify-center shadow-2xs">
              {groupInitials}
            </div>
          ) : (
            <UserAvatar
              sender={details.partner}
              name={details.title}
              size="md"
              isOnline={details.isOnline}
              showStatus={isDirect}
            />
          )}
        </div>

        {/* Title and Subtitle */}
        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
            {details.title}
          </h2>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {typingList.length > 0 ? (
              <span className="text-brand-600 dark:text-brand-400 font-medium italic flex items-center gap-1 animate-pulse">
                <span>{typingList.join(', ')} typing...</span>
              </span>
            ) : isGroup ? (
              <span>{details.subtitle || `${conversation.participants?.length || 0} Members`}</span>
            ) : (
              <span className="flex items-center gap-1.5 font-medium">
                <span
                  className={`w-2 h-2 rounded-full ${
                    details.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                  }`}
                />
                <span>
                  {details.isOnline ? 'Active Now' : formatLastSeen(details.partner?.lastSeen)}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right side: Action buttons matching reference screenshot */}
      <div className="flex items-center gap-2 shrink-0">
        {/* "Select" pill button */}
        <button
          type="button"
          onClick={onToggleSearch}
          className="hidden sm:inline-flex items-center px-4 py-1 rounded-full border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-brand-50/70 hover:text-brand-700 hover:border-brand-300 dark:hover:bg-brand-950/50 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
        >
          Select
        </button>

        {/* "Group Info" / "Contact Info" pill button matching screenshot */}
        <button
          type="button"
          onClick={isGroup ? onOpenGroupInfo : onToggleDetails}
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-full border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-brand-50/70 hover:text-brand-700 hover:border-brand-300 dark:hover:bg-brand-950/50 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          title={isGroup ? 'Group Info' : 'Contact Info'}
        >
          <Info className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden sm:inline">{isGroup ? 'Group Info' : 'Contact Info'}</span>
        </button>

        {/* Fullscreen toggle button ⛶ (desktop & tablet) */}
        {onToggleFullscreen && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="hidden md:inline-flex p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        )}

        {/* In-chat search toggle */}
        <button
          type="button"
          onClick={onToggleSearch}
          className={`p-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            showInChatSearch
              ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 ring-1 ring-brand-300'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Search messages"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Shared Media & Links Drawer Toggle */}
        <button
          type="button"
          onClick={onToggleDetails}
          className={`p-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            showDetailsDrawer
              ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 ring-1 ring-brand-300'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Shared Media, Docs & Links"
        >
          <PanelRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;
