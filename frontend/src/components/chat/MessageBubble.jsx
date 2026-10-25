import React from 'react';
import {
  Reply,
  SmilePlus,
  MoreVertical,
  Pin,
  Edit2,
  Trash2,
  Copy,
  Share2,
  Check,
  CheckCheck,
  Plus,
  X,
  Loader2,
  Info,
} from 'lucide-react';
import UserAvatar from '../common/UserAvatar';
import ChatMediaAttachment from './ChatMediaAttachment';
import { CONVERSATION_TYPES } from '../../services/chatService';

// Standard quick reaction emojis
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '👏'];

// Categorized emojis for emoji drawer
const EMOJI_CATEGORIES = [
  {
    name: 'Smileys',
    icon: '😊',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😋', '😛', '🤗', '🤫', '🤔', '🤐', '😴', '🥳', '😎', '🤓', '🥺', '😭', '😤', '🤯', '😱', '🥵', '🥶'],
  },
  {
    name: 'Gestures',
    icon: '👍',
    emojis: ['👍', '👎', '👏', '🙌', '👐', '🤝', '✌️', '🤞', '🤙', '👊', '✊', '🤛', '🤜', '🖐️', '✋', '👌', '🤌', '🤏', '👈', '👉', '👆', '👇', '☝️', '🙏', '💪', '✍️'],
  },
  {
    name: 'Hearts & Fire',
    icon: '❤️',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💖', '💘', '💝', '🔥', '✨', '⭐', '🌟', '💥', '💯', '🚀'],
  },
  {
    name: 'Work & Chat',
    icon: '💼',
    emojis: ['💼', '📁', '📂', '📝', '📊', '📈', '📅', '🕒', '💡', '🎯', '📢', '📌', '📎', '🎓', '🏢', '🤝', '🔍', '⚡', '☕', '💻', '🖥️', '📱', '✉️', '📦'],
  },
];

// Helper: Group message reactions by emoji with counts and reactor list
const groupReactions = (reactions = [], currentUserId = '') => {
  const map = new Map();
  (reactions || []).forEach((r) => {
    if (!r.emoji) return;
    const uid = (r.user?._id || r.user)?.toString();
    const userName = r.user?.name || (uid === currentUserId ? 'You' : 'User');
    if (!map.has(r.emoji)) {
      map.set(r.emoji, {
        emoji: r.emoji,
        count: 0,
        userNames: [],
        reactedByMe: false,
      });
    }
    const item = map.get(r.emoji);
    item.count++;
    if (!item.userNames.includes(userName)) {
      item.userNames.push(userName);
    }
    if (uid && currentUserId && uid === currentUserId) {
      item.reactedByMe = true;
    }
  });
  return Array.from(map.values());
};

// Deterministic subtle name color for group chats
const getSenderColorClass = (role = '') => {
  switch (role.toLowerCase()) {
    case 'mentor':
      return 'text-emerald-700 dark:text-emerald-400';
    case 'coordinator':
      return 'text-indigo-700 dark:text-indigo-400';
    case 'company':
      return 'text-purple-700 dark:text-purple-400';
    case 'admin':
      return 'text-rose-700 dark:text-rose-400';
    default:
      return 'text-slate-800 dark:text-slate-200';
  }
};

export const MessageBubble = ({
  message,
  index,
  isSender,
  isConsecutive = false,
  currentUserId,
  activeConversation,
  activeDetails,
  pinnedMessageId = null,
  activeReactionMsgId,
  showMoreReactionMsgId,
  activeActionsMsgId,
  pinningMessageId,
  reactionPickerRef,
  moreReactionPickerRef,
  actionsMenuRef,
  onStartReply,
  onToggleReactionPicker,
  onToggleMoreReactions,
  onToggleActionsMenu,
  onToggleReaction,
  onCopyMessage,
  onForwardMessage,
  onTogglePin,
  onStartEdit,
  onDeleteMessage,
  onJumpToMessage,
  onPreviewMedia,
  onDownloadFile,
  formatMessageTime,
  onOpenMessageInfo,
}) => {
  const msgId = (message._id || message.id || index).toString();
  const isDeleted = Boolean(message.isDeleted);
  const isPinned = pinnedMessageId === msgId;

  // Resolve sender info
  const senderId = (message.sender?._id || message.sender?.id || message.sender || '').toString();
  const senderObj =
    typeof message.sender === 'object' && message.sender !== null
      ? message.sender
      : (activeConversation?.participants || []).find(
          (p) => (p._id || p.id || p).toString() === senderId
        ) || null;

  const senderName = isSender
    ? 'You'
    : senderObj?.name || (activeConversation?.type === CONVERSATION_TYPES.DIRECT ? activeDetails.title : 'Colleague');

  const senderRole = isSender
    ? ''
    : senderObj?.role || (activeConversation?.type === CONVERSATION_TYPES.DIRECT ? activeDetails.partner?.role || '' : '');

  const isReadByOthers = (message.readBy || []).some(
    (id) => (id._id || id).toString() !== currentUserId
  );

  const isGroup = activeConversation?.type === CONVERSATION_TYPES.GROUP;
  const otherParticipants = (activeConversation?.participants || []).filter(
    (p) => (p._id || p).toString() !== currentUserId
  );
  const totalOthers = Math.max(1, otherParticipants.length);
  const readOthers = (message.readBy || []).filter(
    (id) => (id._id || id).toString() !== currentUserId
  );
  const readOthersCount = readOthers.length;
  const isAllRead = otherParticipants.length > 0 && readOthersCount >= otherParticipants.length;
  const isPartiallyRead = readOthersCount > 0 && !isAllRead;

  const groupedReactions = groupReactions(message.reactions, currentUserId);

  const hasMediaOnly =
    !message.content &&
    message.attachments &&
    message.attachments.length > 0 &&
    message.attachments.every(
      (a) =>
        a.fileType === 'image' ||
        a.fileType === 'video' ||
        a.mimeType?.startsWith('image/') ||
        a.mimeType?.startsWith('video/')
    );

  return (
    <div
      id={`msg-${msgId}`}
      className={`w-full flex items-start gap-2.5 sm:gap-3 group transition-all rounded-xl ${
        isConsecutive ? 'mt-1' : 'mt-3.5'
      } ${isSender ? 'justify-end' : 'justify-start'}`}
    >
      {/* Received message avatar (only rendered on first message of a consecutive group) */}
      {!isSender && (
        <div className="shrink-0 w-8 flex justify-center mt-0.5">
          {!isConsecutive ? (
            <UserAvatar
              sender={senderObj || activeDetails.partner}
              name={senderName}
              size="sm"
              isOnline={activeDetails.isOnline}
              showStatus={false}
            />
          ) : (
            <div className="w-8" aria-hidden="true" />
          )}
        </div>
      )}

      {/* Message bubble column */}
      <div
        className={`flex flex-col max-w-[85%] sm:max-w-[70%] space-y-1 ${
          isSender ? 'items-end ml-auto' : 'items-start mr-auto'
        }`}
      >
        {/* Sender header & timestamp (omitted on consecutive messages from same sender) */}
        {!isConsecutive && (
          <div className="flex items-center gap-1.5 flex-wrap text-xs px-1 select-none">
            {!isSender ? (
              <>
                <span className={`font-bold text-[12px] ${getSenderColorClass(senderRole)}`}>
                  {senderName}
                </span>
                {senderRole && (
                  <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-sm bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300/60 dark:border-slate-700/60 leading-none">
                    {senderRole}
                  </span>
                )}
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium ml-1">
                  {formatMessageTime(message.createdAt)}
                </span>
                {message.isEdited && (
                  <span className="text-[10px] text-slate-400 italic">
                    (edited)
                  </span>
                )}
              </>
            ) : (
              <>
                {message.isEdited && (
                  <span className="text-[10px] text-slate-400 italic mr-1">
                    (edited)
                  </span>
                )}
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mr-1">
                  {formatMessageTime(message.createdAt)}
                </span>
                <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-sm bg-brand-50 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300 border border-brand-200/80 dark:border-brand-800/80 leading-none">
                  You
                </span>
              </>
            )}
          </div>
        )}

        {/* Bubble & Hover Actions Row */}
        <div className="relative group/bubble flex items-center gap-1 max-w-full">
          {/* Sender Actions Trigger on LEFT */}
          {isSender && !isDeleted && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover/bubble:opacity-100 transition-opacity shrink-0">
              <button
                type="button"
                onClick={() => onStartReply(message)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Reply to message"
                aria-label="Reply to message"
              >
                <Reply className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onToggleReactionPicker(msgId)}
                className="reaction-trigger-btn p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="React"
                aria-label="React to message"
              >
                <SmilePlus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onToggleActionsMenu(msgId)}
                className="actions-trigger-btn p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="More options"
                aria-label="More message options"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Bubble Surface */}
          <div
            className={`shadow-xs transition-all relative text-xs sm:text-[13px] leading-relaxed wrap-break-word whitespace-pre-wrap select-text max-w-full ${
              hasMediaOnly ? 'p-1 sm:p-1.5' : 'px-4 py-2.5'
            } ${
              isSender
                ? `bg-brand-600 text-white ${isConsecutive ? 'rounded-2xl' : 'rounded-2xl rounded-tr-xs'}`
                : `bg-white dark:bg-slate-850 text-slate-900 dark:text-slate-100 ${
                    isConsecutive ? 'rounded-2xl' : 'rounded-2xl rounded-tl-xs'
                  } border border-slate-200/90 dark:border-slate-800`
            }`}
          >
            {/* Pinned Tag on Bubble */}
            {isPinned && (
              <div
                className={`flex items-center gap-1.5 text-[10px] font-semibold mb-1.5 ${
                  isSender ? 'text-amber-200' : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                <Pin className="w-3 h-3 fill-amber-500/40" />
                <span>Pinned message</span>
              </div>
            )}

            {/* Quoted Reply Snippet */}
            {(message.replyTo || message.replySnapshot || message.replyToMessageId) && (
              <div
                onClick={() => {
                  const parentId = (
                    message.replyTo?._id ||
                    message.replyToMessageId ||
                    message.replyTo ||
                    message.replySnapshot?.messageId
                  )?.toString();
                  if (parentId) {
                    onJumpToMessage(parentId);
                  }
                }}
                className={`mb-2 p-2.5 rounded-xl text-xs cursor-pointer border-l-4 transition-all hover:opacity-95 ${
                  isSender
                    ? 'bg-brand-700/80 border-white/90 text-white hover:bg-brand-700'
                    : 'bg-slate-100 dark:bg-slate-750 border-brand-500 text-slate-800 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                }`}
                title="Click to jump to original message"
                role="button"
                tabIndex={0}
              >
                <div className="font-bold text-[10px] uppercase flex items-center gap-1.5 opacity-90 mb-0.5">
                  <Reply className="w-3 h-3" />
                  <span>
                    {message.replyTo?.sender?.name || message.replySnapshot?.senderName || 'User'}
                  </span>
                  {(message.replyTo?.sender?.role || message.replySnapshot?.senderRole) && (
                    <span className="px-1 text-[9px] font-semibold rounded uppercase tracking-wider bg-black/10 dark:bg-white/10">
                      {message.replyTo?.sender?.role || message.replySnapshot?.senderRole}
                    </span>
                  )}
                </div>
                <p className="line-clamp-1 italic text-[11px] opacity-85">
                  {message.replyTo?.isDeleted || message.replySnapshot?.isDeleted
                    ? '🚫 This message was deleted'
                    : message.replyTo?.content ||
                      message.replySnapshot?.contentPreview ||
                      (message.replyTo?.attachments?.length > 0
                        ? `📎 ${message.replyTo.attachments[0].fileName}`
                        : message.replySnapshot?.attachmentSummary
                        ? `📎 ${message.replySnapshot.attachmentSummary}`
                        : 'Quoted message')}
                </p>
              </div>
            )}

            {/* Attachments rendering */}
            {message.attachments && message.attachments.length > 0 && !isDeleted && (
              <div className="space-y-1">
                {message.attachments.map((att, aIdx) => (
                  <ChatMediaAttachment
                    key={att._id || aIdx}
                    attachment={att}
                    isSender={isSender}
                    onPreview={onPreviewMedia}
                    onDownload={onDownloadFile}
                  />
                ))}
              </div>
            )}

            {/* Text Content */}
            {isDeleted ? (
              <p className="italic opacity-70 flex items-center gap-1.5 text-xs p-1">
                <span>🚫</span>
                <span>This message was deleted</span>
              </p>
            ) : (
              message.content && (
                <p className={message.attachments && message.attachments.length > 0 ? 'px-2 pt-1.5 pb-0.5' : ''}>
                  {message.content}
                </p>
              )
            )}
          </div>

          {/* Receiver Actions Trigger on RIGHT */}
          {!isSender && !isDeleted && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover/bubble:opacity-100 transition-opacity shrink-0">
              <button
                type="button"
                onClick={() => onStartReply(message)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Reply to message"
                aria-label="Reply to message"
              >
                <Reply className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onToggleReactionPicker(msgId)}
                className="reaction-trigger-btn p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="React"
                aria-label="React to message"
              >
                <SmilePlus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onToggleActionsMenu(msgId)}
                className="actions-trigger-btn p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="More options"
                aria-label="More message options"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Quick Reaction Bar */}
          {activeReactionMsgId === msgId && (
            <div
              ref={reactionPickerRef}
              className={`absolute -top-11 z-30 flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 shadow-xl animate-in fade-in zoom-in-95 duration-150 ${
                isSender ? 'right-0 origin-top-right' : 'left-0 origin-top-left'
              }`}
            >
              {QUICK_REACTIONS.map((emoji) => {
                const isMyReaction = (message.reactions || []).some(
                  (r) =>
                    r.emoji === emoji &&
                    (r.user?._id || r.user)?.toString() === currentUserId?.toString()
                );
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => onToggleReaction(msgId, emoji)}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-base hover:scale-125 transition-transform active:scale-95 cursor-pointer ${
                      isMyReaction
                        ? 'bg-brand-100 dark:bg-brand-900/60 ring-2 ring-brand-500'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-750'
                    }`}
                    title={`React ${emoji}`}
                  >
                    <span>{emoji}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => onToggleMoreReactions(msgId)}
                className="reaction-more-btn w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 ml-0.5 cursor-pointer"
                title="More emojis"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Extended Emojis Drawer on '+' */}
          {showMoreReactionMsgId === msgId && (
            <div
              ref={moreReactionPickerRef}
              className={`absolute -top-52 z-40 w-72 sm:w-80 p-2.5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 shadow-2xl animate-in fade-in zoom-in-95 duration-150 ${
                isSender ? 'right-0' : 'left-0'
              }`}
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-750 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>React with Emoji</span>
                <button
                  type="button"
                  onClick={() => onToggleMoreReactions(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 pt-2 max-h-36 overflow-y-auto no-scrollbar">
                {EMOJI_CATEGORIES.flatMap((c) => c.emojis).map((emoji, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onToggleReaction(msgId, emoji)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-base hover:bg-slate-100 dark:hover:bg-slate-750 hover:scale-125 transition-transform active:scale-95 cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3-DOTS Dropdown Menu */}
          {activeActionsMsgId === msgId && (
            <div
              ref={actionsMenuRef}
              className={`absolute -top-2 z-30 w-44 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 shadow-xl py-1 text-xs animate-in fade-in zoom-in-95 duration-150 ${
                isSender ? 'right-full mr-1.5' : 'left-full ml-1.5'
              }`}
            >
              <button
                type="button"
                onClick={() => onStartReply(message)}
                className="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <Reply className="w-3.5 h-3.5 text-brand-600" />
                <span>Reply</span>
              </button>

              {message.content && (
                <button
                  type="button"
                  onClick={() => onCopyMessage(message.content)}
                  className="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy Text</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onOpenMessageInfo?.(message);
                  onToggleActionsMenu(null);
                }}
                className="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <Info className="w-3.5 h-3.5 text-sky-500" />
                <span>Message info</span>
              </button>

              <button
                type="button"
                onClick={() => onForwardMessage(message)}
                className="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>Forward</span>
              </button>

              {!isDeleted && (
                <button
                  type="button"
                  disabled={pinningMessageId === msgId}
                  onClick={() => onTogglePin(message)}
                  className="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  {pinningMessageId === msgId ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                  ) : (
                    <Pin
                      className={`w-3.5 h-3.5 ${
                        isPinned ? 'text-amber-500 fill-amber-500/40' : 'text-amber-500'
                      }`}
                    />
                  )}
                  <span>{isPinned ? 'Unpin Message' : 'Pin Message'}</span>
                </button>
              )}

              {isSender && (
                <button
                  type="button"
                  onClick={() => onStartEdit(message)}
                  className="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-amber-500" />
                  <span>Edit</span>
                </button>
              )}

              <div className="my-1 border-t border-slate-100 dark:border-slate-750" />

              <button
                type="button"
                onClick={() => onDeleteMessage(message, isSender)}
                className="w-full px-3 py-2 flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>

        {/* Reaction Badges */}
        {groupedReactions.length > 0 && (
          <div
            className={`flex flex-wrap items-center gap-1 mt-1 ${
              isSender ? 'justify-end' : 'justify-start'
            }`}
          >
            {groupedReactions.map(({ emoji, count, userNames, reactedByMe }) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onToggleReaction(msgId, emoji)}
                title={userNames.join(', ')}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-all active:scale-95 cursor-pointer ${
                  reactedByMe
                    ? 'bg-brand-50 dark:bg-brand-950/80 border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-300 shadow-2xs'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <span>{emoji}</span>
                <span className="text-[11px] font-semibold">{count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Sender Delivery / Read Receipt */}
        {isSender && (
          <div className="flex items-center gap-1 text-[10px] select-none pr-1">
            {isGroup ? (
              <button
                type="button"
                onClick={() => onOpenMessageInfo?.(message)}
                className="inline-flex items-center gap-1 py-0.5 px-1 rounded-md hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group/receipt"
                title="Click to see who read this message"
              >
                {isAllRead ? (
                  <span className="inline-flex items-center gap-1 text-sky-500 dark:text-sky-400 font-semibold">
                    <CheckCheck className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 stroke-[2.5]" />
                    <span>Read by all ({totalOthers})</span>
                    <Info className="w-3 h-3 text-sky-500 opacity-60 group-hover/receipt:opacity-100" />
                  </span>
                ) : isPartiallyRead ? (
                  <span className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 font-medium">
                    <CheckCheck className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 stroke-[2]" />
                    <span>
                      Read by {readOthersCount} of {totalOthers}
                    </span>
                    <Info className="w-3 h-3 text-sky-500 opacity-60 group-hover/receipt:opacity-100" />
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-slate-400 dark:text-slate-500">
                    <CheckCheck className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 stroke-[2]" />
                    <span>Delivered</span>
                    <Info className="w-3 h-3 text-slate-400 opacity-50 group-hover/receipt:opacity-100" />
                  </span>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onOpenMessageInfo?.(message)}
                className="inline-flex items-center gap-1 py-0.5 px-1 rounded-md hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                title={
                  isReadByOthers
                    ? 'Read by recipient (Click for message info)'
                    : 'Delivered to recipient (Click for message info)'
                }
              >
                {isReadByOthers ? (
                  <span className="inline-flex items-center gap-1 text-sky-500 dark:text-sky-400 font-semibold">
                    <CheckCheck className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 stroke-[2.5]" />
                    <span className="text-sky-600 dark:text-sky-400">Read</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-slate-400 dark:text-slate-500">
                    <CheckCheck className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 stroke-[2]" />
                    <span>Delivered</span>
                  </span>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
