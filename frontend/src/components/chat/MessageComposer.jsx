import React from 'react';
import {
  Paperclip,
  Smile,
  Send,
  Check,
  X,
  Loader2,
  Reply,
  Edit2,
  Image as ImageIcon,
  FileText,
  FolderOpen,
  Camera,
  FileSpreadsheet,
  Film,
  File,
} from 'lucide-react';

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

// Helper: Human-readable file size
const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

// Helper: Render icon for attachment preview
const renderFileTypeIcon = (fileType = '') => {
  switch (fileType) {
    case 'pdf':
      return <FileText className="w-5 h-5 text-red-500" />;
    case 'document':
      return <FileText className="w-5 h-5 text-blue-500" />;
    case 'spreadsheet':
      return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
    case 'video':
      return <Film className="w-5 h-5 text-purple-500" />;
    case 'image':
      return <ImageIcon className="w-5 h-5 text-indigo-500" />;
    default:
      return <File className="w-5 h-5 text-slate-500" />;
  }
};

export const MessageComposer = ({
  messageInput = '',
  onChangeInput,
  onSendMessage,
  sending = false,
  replyingTo = null,
  onCancelReply,
  editingMessage = null,
  onCancelEdit,
  selectedFile = null,
  onRemoveSelectedFile,
  showAttachmentMenu = false,
  onToggleAttachmentMenu,
  attachmentMenuRef,
  openFilePicker,
  onStartCamera,
  showEmojiPicker = false,
  onToggleEmojiPicker,
  emojiPickerRef,
  activeEmojiCategory = 0,
  setActiveEmojiCategory,
  onInsertEmoji,
  messageInputRef,
  activeTitle = 'conversation',
}) => {
  const canSend = Boolean(messageInput.trim() || selectedFile) && !sending;

  return (
    <div className="relative p-3 sm:p-4 border-t border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 select-none">
      {/* Replying Banner */}
      {replyingTo && (
        <div className="mb-2 px-3.5 py-2.5 rounded-xl bg-brand-50/90 dark:bg-brand-950/50 border border-brand-200/90 dark:border-brand-800/90 flex items-center justify-between text-xs animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-brand-600 text-white flex items-center justify-center shrink-0">
              <Reply className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-brand-700 dark:text-brand-300">
                  Replying to {replyingTo.sender?.name || 'User'}
                </span>
                {replyingTo.sender?.role && (
                  <span className="px-1 text-[9px] font-semibold rounded uppercase tracking-wider bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300">
                    {replyingTo.sender.role}
                  </span>
                )}
              </div>
              <p className="text-slate-600 dark:text-slate-400 truncate max-w-md sm:max-w-xl text-[11px] mt-0.5">
                {replyingTo.isDeleted
                  ? 'This message was deleted'
                  : replyingTo.content ||
                    (replyingTo.attachments?.length > 0
                      ? `📎 [${replyingTo.attachments[0].fileType?.toUpperCase() || 'FILE'}] ${replyingTo.attachments[0].fileName}`
                      : 'Attachment message')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
            title="Cancel reply"
            aria-label="Cancel reply"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Editing Banner */}
      {editingMessage && (
        <div className="mb-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between text-xs animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center gap-2">
            <Edit2 className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-semibold text-amber-800 dark:text-amber-200">
              Editing message
            </span>
          </div>
          <button
            type="button"
            onClick={onCancelEdit}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            title="Cancel editing"
            aria-label="Cancel editing"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Selected Attachment Preview Tray */}
      {selectedFile && (
        <div className="mb-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center gap-3 min-w-0">
            {selectedFile.previewUrl ? (
              <img
                src={selectedFile.previewUrl}
                alt="Attachment preview"
                className="w-12 h-12 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
              />
            ) : (
              <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shrink-0">
                {renderFileTypeIcon(selectedFile.fileType)}
              </div>
            )}
            <div className="min-w-0 text-left">
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {selectedFile.name}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {formatFileSize(selectedFile.size)} • {(selectedFile.fileType || 'FILE').toUpperCase()}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRemoveSelectedFile}
            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer shrink-0"
            title="Remove attachment"
            aria-label="Remove attachment"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Floating Emoji Picker Drawer */}
      {showEmojiPicker && (
        <div
          ref={emojiPickerRef}
          className="absolute bottom-full left-2 right-2 sm:left-4 sm:right-auto mb-2 z-40 w-auto sm:w-96 max-w-[calc(100vw-16px)] rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 shadow-2xl p-3 animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <span>😊</span> Emoji Selector
            </span>
            <button
              type="button"
              onClick={onToggleEmojiPicker}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1 py-2 border-b border-slate-100 dark:border-slate-700/60 overflow-x-auto no-scrollbar">
            {EMOJI_CATEGORIES.map((cat, idx) => (
              <button
                key={cat.name}
                type="button"
                onClick={() => setActiveEmojiCategory(idx)}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors shrink-0 flex items-center gap-1 cursor-pointer ${
                  activeEmojiCategory === idx
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/60 dark:text-brand-300 font-semibold'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-8 gap-1 pt-2 max-h-48 overflow-y-auto no-scrollbar">
            {EMOJI_CATEGORIES[activeEmojiCategory].emojis.map((emoji, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onInsertEmoji(emoji)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-lg hover:bg-slate-100 dark:hover:bg-slate-750 hover:scale-125 transition-transform active:scale-90 cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Composer Input Form */}
      <form onSubmit={onSendMessage} className="flex items-center gap-2">
        {/* Attachment Popover & Menu */}
        <div className="relative shrink-0">
          <button
            type="button"
            id="btn-toggle-attachment-menu"
            aria-expanded={showAttachmentMenu}
            aria-haspopup="menu"
            onClick={onToggleAttachmentMenu}
            className={`p-2.5 rounded-full transition-all shrink-0 cursor-pointer ${
              showAttachmentMenu || selectedFile
                ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/70 dark:text-brand-400 ring-2 ring-brand-500/20'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Attach Photos, Documents, or Files"
          >
            <Paperclip
              className={`w-5 h-5 transition-transform duration-200 ${
                showAttachmentMenu ? 'rotate-45 text-brand-600 dark:text-brand-400' : ''
              }`}
            />
          </button>

          {/* Attachment Popover Menu */}
          {showAttachmentMenu && (
            <div
              ref={attachmentMenuRef}
              role="menu"
              aria-orientation="vertical"
              className="absolute bottom-full left-0 mb-3 z-40 w-72 max-w-[calc(100vw-32px)] rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 shadow-2xl p-2 animate-in fade-in slide-in-from-bottom-2 duration-150 select-none"
            >
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Attach to Message
                </span>
                <button
                  type="button"
                  onClick={onToggleAttachmentMenu}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-md cursor-pointer"
                  title="Close menu"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1">
                {/* 1. Upload Photos & Images */}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => openFilePicker('images')}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 text-left transition-colors group focus:outline-none focus:bg-slate-100 dark:focus:bg-slate-800 cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                      Upload Photos &amp; Images
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                      PNG, JPG, WEBP, GIF (up to 15MB)
                    </p>
                  </div>
                </button>

                {/* 2. Upload PDF & Documents */}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => openFilePicker('documents')}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 text-left transition-colors group focus:outline-none focus:bg-slate-100 dark:focus:bg-slate-800 cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                      Upload PDF &amp; Documents
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                      PDF, Word, Excel, PowerPoint
                    </p>
                  </div>
                </button>

                {/* 3. Browse Files */}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => openFilePicker('all')}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 text-left transition-colors group focus:outline-none focus:bg-slate-100 dark:focus:bg-slate-800 cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                      Browse Files
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                      Any supported document or media
                    </p>
                  </div>
                </button>

                {/* 4. Take Photo */}
                <button
                  type="button"
                  role="menuitem"
                  onClick={onStartCamera}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 text-left transition-colors group focus:outline-none focus:bg-slate-100 dark:focus:bg-slate-800 cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                      Take Photo
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                      Capture directly using camera
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Emoji Button */}
        <button
          type="button"
          id="btn-toggle-emoji"
          onClick={onToggleEmojiPicker}
          className={`p-2.5 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer ${
            showEmojiPicker ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400' : ''
          }`}
          title="Insert Emoji"
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* Text Area */}
        <div className="flex-1 relative flex items-center">
          <textarea
            ref={messageInputRef}
            rows={1}
            value={messageInput}
            onChange={onChangeInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSendMessage(e);
              }
            }}
            placeholder={
              editingMessage
                ? 'Edit your message...'
                : selectedFile
                ? 'Add an optional caption...'
                : `Message ${activeTitle}...`
            }
            maxLength={2000}
            className="w-full py-2.5 px-4 text-xs sm:text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 rounded-2xl border border-slate-200 dark:border-slate-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none resize-none leading-relaxed transition-all max-h-32 min-h-[42px]"
          />
          {messageInput.length > 1500 && (
            <span className="absolute right-3 text-[10px] text-slate-400 pointer-events-none">
              {messageInput.length}/2000
            </span>
          )}
        </div>

        {/* Send / Update Button */}
        <button
          type="submit"
          id="btn-send-message"
          disabled={!canSend}
          className="p-2.5 sm:px-4 sm:py-2.5 rounded-full sm:rounded-xl bg-brand-600 hover:bg-brand-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-semibold transition-all shadow-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          title={editingMessage ? 'Save Changes' : 'Send Message'}
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : editingMessage ? (
            <Check className="w-4 h-4" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">
            {editingMessage ? 'Save' : 'Send'}
          </span>
        </button>
      </form>
    </div>
  );
};

export default MessageComposer;
