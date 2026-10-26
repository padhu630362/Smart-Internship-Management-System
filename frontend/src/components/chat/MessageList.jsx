import React, { useMemo } from 'react';
import { Loader2, Sparkles, ChevronDown } from 'lucide-react';
import MessageBubble from './MessageBubble';

// Helper: Format date for date divider
const formatDateDivider = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (yesterday.toDateString() === date.toDateString()) return 'Yesterday';

  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
};

export const MessageList = ({
  messages = [],
  loadingMessages = false,
  currentUserId,
  currentUser = null,
  activeConversation,
  activeDetails,
  pinnedData,
  typingUsers = new Set(),
  messagesContainerRef,
  messagesEndRef,
  onScroll,
  showScrollToBottom = false,
  unreadWhileScrolled = 0,
  onScrollToBottom,
  // Bubble action props
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
  const typingList = Array.from(typingUsers.values ? typingUsers.values() : typingUsers);

  // Pre-calculate date dividers and consecutive message flags
  const items = useMemo(() => {
    const list = [];
    let prevMsg = null;
    let prevDateStr = null;

    messages.forEach((msg, index) => {
      const msgDate = new Date(msg.createdAt || Date.now());
      const dateStr = msgDate.toDateString();
      const showDateDivider = dateStr !== prevDateStr;

      if (showDateDivider) {
        list.push({
          type: 'divider',
          id: `divider-${dateStr}-${index}`,
          label: formatDateDivider(msg.createdAt),
        });
        prevDateStr = dateStr;
      }

      // Check consecutive grouping (same sender within 5 minutes, same date)
      let isConsecutive = false;
      if (prevMsg && !showDateDivider) {
        const prevSenderId = (prevMsg.sender?._id || prevMsg.sender?.id || prevMsg.sender || '').toString();
        const currentSenderId = (msg.sender?._id || msg.sender?.id || msg.sender || '').toString();
        const prevTime = new Date(prevMsg.createdAt || Date.now()).getTime();
        const currTime = msgDate.getTime();
        const diffMins = Math.abs(currTime - prevTime) / 60000;

        if (prevSenderId && currentSenderId && prevSenderId === currentSenderId && diffMins <= 5) {
          isConsecutive = true;
        }
      }

      const senderId = (msg.sender?._id || msg.sender?.id || msg.sender || '').toString();
      const myId = (currentUserId || '').toString();
      const isSender = Boolean(myId && senderId && myId === senderId);

      list.push({
        type: 'message',
        id: (msg._id || msg.id || index).toString(),
        message: msg,
        index,
        isSender,
        isConsecutive,
      });

      prevMsg = msg;
    });

    return list;
  }, [messages, currentUserId]);

  return (
    <div className="relative flex-1 min-h-0 w-full overflow-hidden flex flex-col">
      <div
        ref={messagesContainerRef}
        onScroll={onScroll}
        className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 bg-slate-50/70 dark:bg-slate-950 w-full relative"
      >
        {loadingMessages ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-xs py-12">
            <Loader2 className="w-6 h-6 animate-spin text-brand-600 dark:text-brand-400" />
            <span className="ml-2">Loading message history...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-600 dark:text-brand-400 mb-3 shadow-xs">
              <Sparkles className="w-7 h-7" />
            </div>
            <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
              No messages yet
            </p>
            <p className="text-slate-500 dark:text-slate-400 max-w-xs mt-1 text-xs">
              Send a greeting or attach a document to start collaborating.
            </p>
          </div>
        ) : (
          items.map((item) => {
            if (item.type === 'divider') {
              return (
                <div
                  key={item.id}
                  className="relative flex items-center justify-center my-4 select-none"
                >
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200/80 dark:border-slate-800/80" />
                  </div>
                  <span className="relative px-3 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-850 rounded-full border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    {item.label}
                  </span>
                </div>
              );
            }

            return (
              <MessageBubble
                key={item.id}
                message={item.message}
                index={item.index}
                isSender={item.isSender}
                isConsecutive={item.isConsecutive}
                currentUserId={currentUserId}
                currentUser={currentUser}
                activeConversation={activeConversation}
                activeDetails={activeDetails}
                pinnedMessageId={pinnedData?.messageId?.toString()}
                activeReactionMsgId={activeReactionMsgId}
                showMoreReactionMsgId={showMoreReactionMsgId}
                activeActionsMsgId={activeActionsMsgId}
                pinningMessageId={pinningMessageId}
                reactionPickerRef={reactionPickerRef}
                moreReactionPickerRef={moreReactionPickerRef}
                actionsMenuRef={actionsMenuRef}
                onStartReply={onStartReply}
                onToggleReactionPicker={onToggleReactionPicker}
                onToggleMoreReactions={onToggleMoreReactions}
                onToggleActionsMenu={onToggleActionsMenu}
                onToggleReaction={onToggleReaction}
                onCopyMessage={onCopyMessage}
                onForwardMessage={onForwardMessage}
                onTogglePin={onTogglePin}
                onStartEdit={onStartEdit}
                onDeleteMessage={onDeleteMessage}
                onJumpToMessage={onJumpToMessage}
                onPreviewMedia={onPreviewMedia}
                onDownloadFile={onDownloadFile}
                formatMessageTime={formatMessageTime}
                onOpenMessageInfo={onOpenMessageInfo}
              />
            );
          })
        )}

        {/* Live typing indicator at bottom of messages */}
        {typingList.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 italic pt-2 pl-1 animate-pulse">
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-brand-600 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-brand-600 rounded-full animate-bounce delay-150" />
              <span className="w-1.5 h-1.5 bg-brand-600 rounded-full animate-bounce delay-300" />
            </span>
            <span>
              {typingList.join(', ')} {typingList.length === 1 ? 'is' : 'are'} typing...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Scroll-To-Bottom Button */}
      {showScrollToBottom && (
        <button
          type="button"
          onClick={() => onScrollToBottom(true)}
          className="absolute right-6 bottom-4 z-20 p-2.5 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-xl border border-slate-200 dark:border-slate-700 hover:scale-105 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
          title="Scroll to latest messages"
          aria-label="Scroll to latest messages"
        >
          <ChevronDown className="w-4 h-4" />
          {unreadWhileScrolled > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-brand-600 text-white">
              {unreadWhileScrolled}
            </span>
          )}
        </button>
      )}
    </div>
  );
};

export default MessageList;
