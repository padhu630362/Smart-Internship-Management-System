import React from 'react';
import {
  ArrowLeft,
  Search,
  PanelRight,
  BellOff,
  Users,
  Info,
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
  formatLastSeen = (d) => (d ? 'Recently' : 'Offline'),
}) => {
  if (!conversation) return null;

  const isGroup = conversation.type === CONVERSATION_TYPES.GROUP;
  const isDirect = conversation.type === CONVERSATION_TYPES.DIRECT;
  const typingList = Array.from(typingUsers.values ? typingUsers.values() : typingUsers);

  return (
    <div className="h-16 px-4 border-b border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center justify-between shrink-0 z-10 shadow-2xs">
      {/* Left side: Avatar + Title + Status */}
      <div
        className="flex items-center gap-3 min-w-0 cursor-pointer group"
        onClick={onToggleDetails}
        title="View conversation details, media, documents & links"
        role="button"
        tabIndex={0}
      >
        {/* Mobile back navigation button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onBackMobile();
          }}
          className="md:hidden p-2 -ml-1 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Back to conversations list"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="relative shrink-0">
          <UserAvatar
            sender={details.partner}
            name={details.title}
            size="md"
            isOnline={details.isOnline}
            showStatus={isDirect}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
              {details.title}
            </h2>
            {isGroup && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300 border border-brand-200/90 dark:border-brand-800/80">
                Channel
              </span>
            )}
            {isDirect && details.partner?.role && (
              <span className="hidden sm:inline-block text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80">
                {details.partner.role}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {typingList.length > 0 ? (
              <span className="text-brand-600 dark:text-brand-400 font-medium italic flex items-center gap-1 animate-pulse">
                <span className="flex gap-0.5">
                  <span className="w-1 h-1 rounded-full bg-brand-600 animate-bounce" />
                  <span className="w-1 h-1 rounded-full bg-brand-600 animate-bounce delay-100" />
                  <span className="w-1 h-1 rounded-full bg-brand-600 animate-bounce delay-200" />
                </span>
                <span>
                  {typingList.join(', ')} {typingList.length === 1 ? 'is' : 'are'} typing...
                </span>
              </span>
            ) : isDirect ? (
              <span className="flex items-center gap-1.5 font-medium">
                <span
                  className={`w-2 h-2 rounded-full ${
                    details.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                  }`}
                />
                <span>
                  {details.isOnline
                    ? 'Active Now'
                    : formatLastSeen(details.partner?.lastSeen)}
                </span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <Users className="w-3 h-3 opacity-70" />
                <span>{details.subtitle}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right side: Action buttons */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* In-chat search toggle */}
        <button
          type="button"
          onClick={onToggleSearch}
          className={`p-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            showInChatSearch
              ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 ring-1 ring-brand-300 dark:ring-brand-800'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Search messages in this conversation"
          aria-label="Search messages in this conversation"
          aria-expanded={showInChatSearch}
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Group details modal toggle (for group chats) */}
        {isGroup && onOpenGroupInfo && (
          <button
            type="button"
            onClick={onOpenGroupInfo}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Channel members & settings"
            aria-label="Channel members and settings"
          >
            <Info className="w-4 h-4" />
          </button>
        )}

        {/* Conversation details & shared content drawer toggle */}
        <button
          type="button"
          id="btn-conversation-details"
          onClick={onToggleDetails}
          className={`p-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            showDetailsDrawer
              ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 ring-1 ring-brand-300 dark:ring-brand-800'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Conversation details, media, documents & links"
          aria-label="Conversation details, media, documents & links"
          aria-expanded={showDetailsDrawer}
        >
          <PanelRight className="w-4 h-4" />
        </button>

        {/* Blocked notifications warning icon */}
        {pushPermission === 'denied' && (
          <span
            className="p-2 rounded-xl text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-help"
            title="Desktop notifications are blocked by your browser settings."
          >
            <BellOff className="w-4 h-4" />
          </span>
        )}
      </div>
    </div>
  );
};

export default ChatHeader;
