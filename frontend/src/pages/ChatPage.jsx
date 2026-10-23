import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  MessageSquare,
  Users,
  Search,
  Plus,
  Send,
  MoreVertical,
  Check,
  CheckCheck,
  ArrowLeft,
  Circle,
  Shield,
  Briefcase,
  GraduationCap,
  Sparkles,
  UserPlus,
  UserMinus,
  Edit2,
  X,
  AlertCircle,
  Loader2,
  Lock,
  Mail,
  Phone,
  Building2,
  ExternalLink,
  Copy,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  History,
  Smile,
  SmilePlus,
  Paperclip,
  Download,
  Reply,
  Trash2,
  CornerDownRight,
  Image as ImageIcon,
  File,
  FileText,
  FileSpreadsheet,
  Share2,
  Camera,
  FolderOpen,
  RefreshCw,
  Bell,
  BellOff,
  Pin,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import chatService, { CONVERSATION_TYPES } from '../services/chatService';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import StatusBadge from '../components/common/StatusBadge';
import UserAvatar from '../components/common/UserAvatar';

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

// Helper: Human-readable file size
const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

// Helper: Formatted last seen
const formatLastSeen = (dateString) => {
  if (!dateString) return 'Offline';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Offline';
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 2) return 'Just now';
  if (diffMins < 60) return `Last seen ${diffMins}m ago`;
  const isToday = now.toDateString() === date.toDateString();
  if (isToday) {
    return `Last seen today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (yesterday.toDateString() === date.toDateString()) {
    return `Last seen yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return `Last seen ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

// Helper: File icon and color by file type
const renderFileTypeIcon = (fileType) => {
  switch (fileType) {
    case 'pdf':
      return <FileText className="w-5 h-5 text-red-500" />;
    case 'document':
      return <FileText className="w-5 h-5 text-blue-500" />;
    case 'spreadsheet':
      return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
    case 'presentation':
      return <FileText className="w-5 h-5 text-amber-500" />;
    case 'image':
      return <ImageIcon className="w-5 h-5 text-indigo-500" />;
    default:
      return <File className="w-5 h-5 text-slate-500" />;
  }
};

// Group message reactions by emoji with counts and reactor list
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

/**
 * Safely highlights matching query text without using dangerouslySetInnerHTML
 */
const SafeHighlight = ({ text = '', highlight = '' }) => {
  if (!highlight || !highlight.trim() || !text) return <>{text}</>;
  const query = highlight.trim();
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <span>
      {parts.map((part, idx) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={idx}
            className="bg-amber-200 dark:bg-amber-400/30 text-amber-950 dark:text-amber-100 font-semibold px-0.5 rounded-xs"
          >
            {part}
          </mark>
        ) : (
          <span key={idx}>{part}</span>
        )
      )}
    </span>
  );
};

export const ChatPage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlConversationId = searchParams.get('conversationId');
  const urlMessageId = searchParams.get('messageId');

  const {
    socket,
    isConnected,
    isUserOnline,
    joinConversation,
    leaveConversation,
    sendTyping,
    setActiveChatConversationId,
    markConversationNotificationsRead,
    pushPermission,
    requestPushPermission,
  } = useSocket();

  // Desktop notification permission banner state
  const [dismissedPushBanner, setDismissedPushBanner] = useState(false);

  // Primary State
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'direct' | 'company' | 'group'
  const [typingUsers, setTypingUsers] = useState(new Map()); // userId -> name
  const [errorBanner, setErrorBanner] = useState('');

  // New Chat Feature State: Attachments, Reply, Edit, Delete, Forward, Search
  const [selectedFile, setSelectedFile] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [activeActionsMsgId, setActiveActionsMsgId] = useState(null);
  const [previewImageModal, setPreviewImageModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null); // { messageId, isSender }
  const [forwardModal, setForwardModal] = useState(null); // { messageId, content, attachments }
  const [selectedForwardConvs, setSelectedForwardConvs] = useState([]);
  const [forwarding, setForwarding] = useState(false);
  const [showInChatSearch, setShowInChatSearch] = useState(false);
  const [inChatSearchQuery, setInChatSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [searchPagination, setSearchPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasMore: false,
  });
  const [searchPage, setSearchPage] = useState(1);
  const [jumpingMessageId, setJumpingMessageId] = useState(null);
  const [isViewingSearchContext, setIsViewingSearchContext] = useState(false);
  const searchAbortControllerRef = useRef(null);
  const searchDebounceRef = useRef(null);
  const searchInputRef = useRef(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [unreadWhileScrolled, setUnreadWhileScrolled] = useState(0);
  const [pinningMessageId, setPinningMessageId] = useState(null);

  // Modals state
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);

  // Contacts
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactSearch, setContactSearch] = useState('');

  // Group creation state
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Group editing state
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDesc, setEditGroupDesc] = useState('');
  const [savingGroup, setSavingGroup] = useState(false);
  const [selectedAddMembers, setSelectedAddMembers] = useState([]);

  // Mobile layout & contact details drawer state
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [showContactDetails, setShowContactDetails] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  // Emoji & Reaction state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState(0);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState(null);
  const [showMoreReactionMsgId, setShowMoreReactionMsgId] = useState(null);

  // Attachment menu & Camera state
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);

  const emojiPickerRef = useRef(null);
  const reactionPickerRef = useRef(null);
  const moreReactionPickerRef = useRef(null);
  const actionsMenuRef = useRef(null);
  const attachmentMenuRef = useRef(null);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messageInputRef = useRef(null);

  const currentUserId = user?.id || user?._id?.toString();
  const canCreateGroup = ['admin', 'coordinator', 'mentor', 'company'].includes(user?.role);

  // Close menus on click outside & Escape key
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        attachmentMenuRef.current &&
        !attachmentMenuRef.current.contains(e.target) &&
        !e.target.closest('#btn-toggle-attachment-menu')
      ) {
        setShowAttachmentMenu(false);
      }
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target) &&
        !e.target.closest('#btn-toggle-emoji')
      ) {
        setShowEmojiPicker(false);
      }
      if (
        reactionPickerRef.current &&
        !reactionPickerRef.current.contains(e.target) &&
        !e.target.closest('.reaction-trigger-btn')
      ) {
        setActiveReactionMsgId(null);
      }
      if (
        moreReactionPickerRef.current &&
        !moreReactionPickerRef.current.contains(e.target) &&
        !e.target.closest('.reaction-more-btn')
      ) {
        setShowMoreReactionMsgId(null);
      }
      if (
        actionsMenuRef.current &&
        !actionsMenuRef.current.contains(e.target) &&
        !e.target.closest('.actions-trigger-btn')
      ) {
        setActiveActionsMsgId(null);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowAttachmentMenu(false);
        setShowEmojiPicker(false);
        setActiveReactionMsgId(null);
        setShowMoreReactionMsgId(null);
        setActiveActionsMsgId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Auto-scroll to bottom of messages container
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      if (smooth) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth',
        });
      } else {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, []);

  // Scroll to a specific message and briefly highlight it
  const scrollToMessage = useCallback((msgId) => {
    if (!msgId) return;
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add(
        'ring-2',
        'ring-brand-500',
        'ring-offset-2',
        'bg-brand-50/70',
        'dark:bg-brand-950/40',
        'transition-all',
        'duration-300'
      );
      setTimeout(() => {
        el.classList.remove(
          'ring-2',
          'ring-brand-500',
          'ring-offset-2',
          'bg-brand-50/70',
          'dark:bg-brand-950/40'
        );
      }, 2500);
    }
  }, []);

  // Jump directly to a searched or targeted message
  const handleJumpToMessage = useCallback(
    async (targetMsgId) => {
      if (!targetMsgId || !activeConversation?._id) return;

      const targetStr = targetMsgId.toString();
      const isAlreadyLoaded = messages.some(
        (m) => (m._id || m.id || '').toString() === targetStr
      );

      if (isAlreadyLoaded) {
        scrollToMessage(targetStr);
        return;
      }

      // Message is not in currently loaded history: fetch context window around target message
      try {
        setJumpingMessageId(targetStr);
        const res = await chatService.getMessages(activeConversation._id, {
          aroundMessageId: targetStr,
          limit: 50,
        });

        if (res?.data?.messages && res.data.messages.length > 0) {
          setMessages(res.data.messages);
          setIsViewingSearchContext(true);
          // Wait for DOM to render loaded messages, then scroll and highlight
          setTimeout(() => {
            scrollToMessage(targetStr);
          }, 120);
        } else {
          setErrorBanner('The target message could not be loaded.');
        }
      } catch (err) {
        console.error('Failed to load message context for jump:', err);
        const msg =
          err.response?.status === 404
            ? 'This message is no longer available or was deleted.'
            : (err.response?.data?.message || 'Could not jump to message.');
        setErrorBanner(msg);
      } finally {
        setJumpingMessageId(null);
      }
    },
    [activeConversation?._id, messages, scrollToMessage]
  );

  // Perform conversation message search
  const executeMessageSearch = useCallback(
    async (query, pageNum = 1) => {
      const trimmed = query ? query.trim() : '';
      if (!trimmed || !activeConversation?._id) {
        setSearchResults([]);
        setSearchLoading(false);
        setSearchError(null);
        setSearchPagination({
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasMore: false,
        });
        return;
      }

      // Cancel previous in-flight request
      if (searchAbortControllerRef.current) {
        searchAbortControllerRef.current.abort();
      }
      const controller = new AbortController();
      searchAbortControllerRef.current = controller;

      try {
        setSearchLoading(true);
        setSearchError(null);

        const res = await chatService.searchMessages(
          activeConversation._id,
          { q: trimmed, page: pageNum, limit: 10 },
          controller.signal
        );

        if (res?.data) {
          setSearchResults(res.data.messages || []);
          setSearchPagination(
            res.data.pagination || {
              total: 0,
              page: pageNum,
              limit: 10,
              totalPages: 1,
              hasMore: false,
            }
          );
        }
      } catch (err) {
        if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
          return; // Ignore canceled requests
        }
        console.error('In-chat message search error:', err);
        setSearchError(err.response?.data?.message || 'Failed to search messages. Please try again.');
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    },
    [activeConversation?._id]
  );

  // Close and reset in-chat search
  const handleCloseSearch = useCallback(() => {
    setShowInChatSearch(false);
    setInChatSearchQuery('');
    setSearchResults([]);
    setSearchError(null);
    setSearchPage(1);
    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort();
    }
  }, []);

  // Debounced search trigger on inChatSearchQuery or searchPage change
  useEffect(() => {
    if (!showInChatSearch) {
      if (searchAbortControllerRef.current) {
        searchAbortControllerRef.current.abort();
      }
      return;
    }

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (!inChatSearchQuery.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError(null);
      return;
    }

    setSearchLoading(true);
    searchDebounceRef.current = setTimeout(() => {
      executeMessageSearch(inChatSearchQuery, searchPage);
    }, 300);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [inChatSearchQuery, searchPage, showInChatSearch, executeMessageSearch]);

  // Focus search input when search opens
  useEffect(() => {
    if (showInChatSearch) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [showInChatSearch]);

  // Scroll listener for floating scroll-to-bottom button
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const fromBottom = scrollHeight - scrollTop - clientHeight;
    setShowScrollToBottom(fromBottom > 180);
    if (fromBottom <= 40) {
      setUnreadWhileScrolled(0);
    }
  };

  // Fetch conversations list
  const fetchConversations = useCallback(async () => {
    try {
      setLoadingConversations(true);
      const res = await chatService.getConversations();
      if (res?.data?.conversations) {
        setConversations(res.data.conversations);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  // Fetch messages for a specific conversation
  const fetchMessages = useCallback(
    async (convId) => {
      try {
        setLoadingMessages(true);
        const res = await chatService.getMessages(convId, { limit: 60 });
        if (res?.data?.messages) {
          setMessages(res.data.messages);
          setTimeout(() => scrollToBottom(false), 50);
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setLoadingMessages(false);
      }
    },
    [scrollToBottom]
  );

  // Mark conversation read
  const markAsRead = useCallback(async (convId) => {
    try {
      markConversationNotificationsRead(convId);
      await chatService.markConversationRead(convId);
      setConversations((prev) =>
        prev.map((c) => (c._id === convId ? { ...c, unreadCount: 0 } : c))
      );
    } catch (err) {
      console.warn('Could not mark conversation as read:', err);
    }
  }, [markConversationNotificationsRead]);

  // Fetch contacts for starting chat/group
  const fetchContacts = useCallback(async () => {
    try {
      setLoadingContacts(true);
      const res = await chatService.getContacts();
      if (res?.data?.contacts) {
        setContacts(res.data.contacts);
      }
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchConversations();
    fetchContacts();
  }, [fetchConversations, fetchContacts]);

  // Handle active conversation selection
  const selectConversation = useCallback(
    (conv) => {
      if (activeConversation?._id) {
        leaveConversation(activeConversation._id);
      }

      setActiveConversation(conv);
      setMobileShowChat(true);
      setErrorBanner('');
      setTypingUsers(new Map());
      setReplyingTo(null);
      setEditingMessage(null);
      setSelectedFile(null);
      setShowInChatSearch(false);
      setInChatSearchQuery('');
      setSearchResults([]);
      setSearchError(null);
      setSearchPage(1);
      setIsViewingSearchContext(false);
      setJumpingMessageId(null);

      setSearchParams({ conversationId: conv._id }, { replace: true });
      joinConversation(conv._id);
      fetchMessages(conv._id);
      markAsRead(conv._id);
    },
    [activeConversation, joinConversation, leaveConversation, fetchMessages, markAsRead, setSearchParams]
  );

  // Sync active conversation with SocketContext
  useEffect(() => {
    setActiveChatConversationId(activeConversation?._id || null);
    return () => {
      setActiveChatConversationId(null);
    };
  }, [activeConversation, setActiveChatConversationId]);

  // Handle URL conversationId auto-selection
  useEffect(() => {
    if (!urlConversationId) return;
    if (activeConversation?._id === urlConversationId) return;

    const found = conversations.find((c) => c._id === urlConversationId);
    if (found) {
      selectConversation(found);
    } else if (!loadingConversations) {
      chatService
        .getConversationById(urlConversationId)
        .then((res) => {
          if (res?.data?.conversation) {
            setConversations((prev) => {
              if (prev.some((c) => c._id === urlConversationId)) return prev;
              return [res.data.conversation, ...prev];
            });
            selectConversation(res.data.conversation);
          }
        })
        .catch((err) => {
          console.warn('Could not load target conversation from URL:', err?.message);
        });
    }
  }, [urlConversationId, conversations, loadingConversations, activeConversation, selectConversation]);

  // Handle URL messageId jump
  useEffect(() => {
    if (urlMessageId && activeConversation?._id && messages.length > 0 && !loadingMessages) {
      handleJumpToMessage(urlMessageId);
    }
  }, [urlMessageId, activeConversation?._id, messages.length, loadingMessages, handleJumpToMessage]);

  // Ensure active conversation room is joined
  useEffect(() => {
    if (isConnected && activeConversation?._id) {
      joinConversation(activeConversation._id.toString());
    }
  }, [isConnected, activeConversation?._id, joinConversation]);

  // Real-time Socket Event Listeners
  useEffect(() => {
    if (!socket) return;

    // Receive message in current conversation
    const handleChatMessage = ({ conversationId, message }) => {
      const activeId = (activeConversation?._id || '').toString();
      const incId = (conversationId || '').toString();
      if (activeId && incId && activeId === incId) {
        setMessages((prev) => {
          const msgId = (message._id || message.id || '').toString();
          if (prev.some((m) => (m._id || m.id || '').toString() === msgId)) return prev;
          return [...prev, message];
        });

        if (showScrollToBottom) {
          setUnreadWhileScrolled((prev) => prev + 1);
        } else {
          setTimeout(() => scrollToBottom(true), 50);
        }
        markAsRead(activeId);
      }
    };

    // Receive message notification across all conversations
    const handleNewMessageAlert = ({ conversationId, message }) => {
      const activeId = (activeConversation?._id || '').toString();
      const incId = (conversationId || '').toString();
      const isCurrent = Boolean(activeId && incId && activeId === incId);

      if (isCurrent && message) {
        setMessages((prev) => {
          const msgId = (message._id || message.id || '').toString();
          if (prev.some((m) => (m._id || m.id || '').toString() === msgId)) return prev;
          return [...prev, message];
        });
        if (!showScrollToBottom) {
          setTimeout(() => scrollToBottom(true), 50);
        }
      }

      setConversations((prev) => {
        const index = prev.findIndex((c) => (c._id || '').toString() === incId);
        if (index === -1) {
          fetchConversations();
          return prev;
        }

        const updated = [...prev];
        const existing = updated[index];
        const senderId = (message.sender?._id || message.sender)?.toString();
        const myId = (currentUserId || user?.id || user?._id || '').toString();
        const isSender = Boolean(myId && senderId && myId === senderId);

        updated[index] = {
          ...existing,
          lastMessage: message,
          lastMessageAt: message.createdAt || new Date().toISOString(),
          unreadCount: isCurrent || isSender ? 0 : (existing.unreadCount || 0) + 1,
        };

        const [moved] = updated.splice(index, 1);
        return [moved, ...updated];
      });
    };

    // Message edited in real time
    const handleMessageEdited = ({ conversationId, message }) => {
      const activeId = (activeConversation?._id || '').toString();
      const incId = (conversationId || '').toString();
      if (activeId && incId && activeId === incId) {
        setMessages((prev) =>
          prev.map((m) =>
            (m._id || m.id || '').toString() === (message._id || message.id || '').toString()
              ? { ...m, ...message }
              : m
          )
        );
        setActiveConversation((prev) => {
          if (
            prev?.pinnedMessage?.message &&
            ((prev.pinnedMessage.message._id || prev.pinnedMessage.message).toString() ===
              (message._id || message.id).toString())
          ) {
            return {
              ...prev,
              pinnedMessage: {
                ...prev.pinnedMessage,
                message: {
                  ...(typeof prev.pinnedMessage.message === 'object' ? prev.pinnedMessage.message : {}),
                  ...message,
                },
              },
            };
          }
          return prev;
        });
      }
    };

    // Message deleted in real time
    const handleMessageDeleted = ({ conversationId, messageId, isDeletedForEveryone, deletedForUserId }) => {
      const activeId = (activeConversation?._id || '').toString();
      const incId = (conversationId || '').toString();
      if (activeId && incId && activeId === incId) {
        if (isDeletedForEveryone) {
          setMessages((prev) =>
            prev.map((m) =>
              (m._id || m.id || '').toString() === messageId.toString()
                ? { ...m, isDeleted: true, content: 'This message was deleted', attachments: [] }
                : m
            )
          );
          setActiveConversation((prev) => {
            if (
              prev?.pinnedMessage?.message &&
              ((prev.pinnedMessage.message._id || prev.pinnedMessage.message).toString() ===
                messageId.toString())
            ) {
              return { ...prev, pinnedMessage: null };
            }
            return prev;
          });
        } else if (deletedForUserId && deletedForUserId.toString() === currentUserId?.toString()) {
          setMessages((prev) =>
            prev.filter((m) => (m._id || m.id || '').toString() !== messageId.toString())
          );
        }
      }
    };

    // Message pinned in real time
    const handleMessagePinned = ({ conversationId, pinnedMessage }) => {
      const activeId = (activeConversation?._id || '').toString();
      const incId = (conversationId || '').toString();

      setConversations((prev) =>
        prev.map((c) =>
          (c._id || '').toString() === incId ? { ...c, pinnedMessage } : c
        )
      );

      if (activeId && incId && activeId === incId) {
        setActiveConversation((prev) => ({
          ...prev,
          pinnedMessage,
        }));
      }
    };

    // Message unpinned in real time
    const handleMessageUnpinned = ({ conversationId }) => {
      const activeId = (activeConversation?._id || '').toString();
      const incId = (conversationId || '').toString();

      setConversations((prev) =>
        prev.map((c) =>
          (c._id || '').toString() === incId ? { ...c, pinnedMessage: null } : c
        )
      );

      if (activeId && incId && activeId === incId) {
        setActiveConversation((prev) => ({
          ...prev,
          pinnedMessage: null,
        }));
      }
    };

    // Conversation metadata updated
    const handleConversationUpdated = ({ conversationId, conversation }) => {
      const activeId = (activeConversation?._id || '').toString();
      const incId = (conversationId || '').toString();
      setConversations((prev) =>
        prev.map((c) => ((c._id || '').toString() === incId ? { ...c, ...conversation } : c))
      );
      if (activeId && incId && activeId === incId) {
        setActiveConversation((prev) => ({ ...prev, ...conversation }));
      }
    };

    // Read update from peer
    const handleReadUpdate = ({ conversationId, userId }) => {
      const activeId = (activeConversation?._id || '').toString();
      const incId = (conversationId || '').toString();
      if (activeId && incId && activeId === incId) {
        setMessages((prev) =>
          prev.map((m) => {
            const readByList = (m.readBy || []).map((id) => (id._id || id).toString());
            const uidStr = (userId || '').toString();
            if (uidStr && !readByList.includes(uidStr)) {
              return { ...m, readBy: [...(m.readBy || []), userId] };
            }
            return m;
          })
        );
      }
    };

    // Typing status
    const handleTyping = ({ conversationId, userId, userName, isTyping }) => {
      const activeId = (activeConversation?._id || '').toString();
      const incId = (conversationId || '').toString();
      const uidStr = (userId || '').toString();
      const myIdStr = (currentUserId || '').toString();

      if (activeId && incId && activeId === incId && uidStr !== myIdStr) {
        setTypingUsers((prev) => {
          const next = new Map(prev);
          if (isTyping) {
            next.set(userId, userName);
          } else {
            next.delete(userId);
          }
          return next;
        });
      }
    };

    // Message reaction in real-time
    const handleChatMessageReaction = ({ conversationId, messageId, reactions }) => {
      const activeId = (activeConversation?._id || '').toString();
      const incId = (conversationId || '').toString();
      if (activeId && incId && activeId === incId) {
        setMessages((prev) =>
          prev.map((m) => {
            const idStr = (m._id || m.id || '').toString();
            if (idStr === (messageId || '').toString()) {
              return { ...m, reactions };
            }
            return m;
          })
        );
      }
    };

    // User presence / status updates
    const handleUserStatus = ({ userId, status, lastSeen }) => {
      const uidStr = (userId || '').toString();
      setConversations((prev) =>
        prev.map((c) => {
          if (c.type === CONVERSATION_TYPES.DIRECT) {
            const partner = (c.participants || []).find((p) => (p._id || p).toString() === uidStr);
            if (partner) {
              return {
                ...c,
                isPartnerOnline: status === 'online',
                partner: { ...partner, lastSeen: lastSeen || partner.lastSeen },
              };
            }
          }
          return c;
        })
      );

      setActiveConversation((prev) => {
        if (prev?.type === CONVERSATION_TYPES.DIRECT) {
          const partner = (prev.participants || []).find((p) => (p._id || p).toString() === uidStr);
          if (partner) {
            return {
              ...prev,
              isPartnerOnline: status === 'online',
              partner: { ...partner, lastSeen: lastSeen || partner.lastSeen },
            };
          }
        }
        return prev;
      });
    };

    socket.on('chat:message', handleChatMessage);
    socket.on('chat:new_message', handleNewMessageAlert);
    socket.on('chat:message_edited', handleMessageEdited);
    socket.on('chat:message_deleted', handleMessageDeleted);
    socket.on('chat:message_reaction', handleChatMessageReaction);
    socket.on('chat:message_pinned', handleMessagePinned);
    socket.on('message_pinned', handleMessagePinned);
    socket.on('chat:message_unpinned', handleMessageUnpinned);
    socket.on('message_unpinned', handleMessageUnpinned);
    socket.on('conversation:updated', handleConversationUpdated);
    socket.on('chat:read_update', handleReadUpdate);
    socket.on('chat:typing', handleTyping);
    socket.on('user:status', handleUserStatus);

    return () => {
      socket.off('chat:message', handleChatMessage);
      socket.off('chat:new_message', handleNewMessageAlert);
      socket.off('chat:message_edited', handleMessageEdited);
      socket.off('chat:message_deleted', handleMessageDeleted);
      socket.off('chat:message_reaction', handleChatMessageReaction);
      socket.off('chat:message_pinned', handleMessagePinned);
      socket.off('message_pinned', handleMessagePinned);
      socket.off('chat:message_unpinned', handleMessageUnpinned);
      socket.off('message_unpinned', handleMessageUnpinned);
      socket.off('conversation:updated', handleConversationUpdated);
      socket.off('chat:read_update', handleReadUpdate);
      socket.off('chat:typing', handleTyping);
      socket.off('user:status', handleUserStatus);
    };
  }, [
    socket,
    activeConversation,
    currentUserId,
    scrollToBottom,
    markAsRead,
    fetchConversations,
    user,
    showScrollToBottom,
  ]);

  // Handle typing debounce
  const handleInputChange = (e) => {
    const val = e.target.value;
    setMessageInput(val);

    if (!activeConversation) return;

    if (!typingTimeoutRef.current) {
      sendTyping(activeConversation._id, true);
    } else {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(activeConversation._id, false);
      typingTimeoutRef.current = null;
    }, 2000);
  };

  // Helper to process selected file from picker or camera
  const processFile = (file) => {
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setErrorBanner('File exceeds the 15MB limit. Please attach a smaller file.');
      return;
    }

    const ext = '.' + file.name.split('.').pop().toLowerCase();
    const allowed = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
    if (!allowed.includes(ext)) {
      setErrorBanner(`File format '${ext}' is not supported. Allowed formats: PDF, Images, Word, Excel, PowerPoint.`);
      return;
    }

    let fileType = 'other';
    if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext) || (file.type && file.type.startsWith('image/'))) {
      fileType = 'image';
    } else if (ext === '.pdf') {
      fileType = 'pdf';
    } else if (['.doc', '.docx'].includes(ext)) {
      fileType = 'document';
    } else if (['.xls', '.xlsx'].includes(ext)) {
      fileType = 'spreadsheet';
    } else if (['.ppt', '.pptx'].includes(ext)) {
      fileType = 'presentation';
    }

    if (selectedFile?.previewUrl) {
      URL.revokeObjectURL(selectedFile.previewUrl);
    }

    const previewUrl = fileType === 'image' ? URL.createObjectURL(file) : null;
    setSelectedFile({
      file,
      previewUrl,
      name: file.name,
      size: file.size,
      fileType,
      mimeType: file.type || (fileType === 'image' ? 'image/jpeg' : 'application/octet-stream'),
    });
    setErrorBanner('');
  };

  // Handle file attachment selection from input
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    e.target.value = '';
  };

  // Trigger file input with specific accepted formats
  const openFilePicker = (filterType) => {
    setShowAttachmentMenu(false);
    if (!fileInputRef.current) return;

    let accept = '.pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx';
    if (filterType === 'images') {
      accept = 'image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp';
    } else if (filterType === 'documents') {
      accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation';
    } else if (filterType === 'all') {
      accept = '.pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,application/pdf,image/png,image/jpeg,image/webp,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation';
    }

    fileInputRef.current.accept = accept;
    fileInputRef.current.value = '';
    fileInputRef.current.click();
  };

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  // Connect video element to live camera stream
  useEffect(() => {
    if (showCameraModal && videoRef.current && cameraStream && !capturedPhoto) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch((err) => {
        console.warn('Video element play error:', err);
      });
    }
  }, [showCameraModal, cameraStream, capturedPhoto]);

  // Camera start / stop / capture handlers
  const handleStartCamera = async () => {
    setShowAttachmentMenu(false);
    setCameraError(null);
    setCapturedPhoto(null);
    setCapturedBlob(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported by your browser or current environment. Please upload an image instead.');
      setShowCameraModal(true);
      return;
    }

    setShowCameraModal(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setCameraStream(stream);
    } catch (err) {
      console.error('Camera access error:', err);
      let errMsg = 'Could not access camera. Please check your camera permissions.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errMsg = 'Camera permission was denied. Please allow camera access in your browser address bar to take photos.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errMsg = 'No camera device was detected on your system.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errMsg = 'Camera is already in use by another application.';
      }
      setCameraError(errMsg);
    }
  };

  const handleCloseCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    if (capturedPhoto) {
      URL.revokeObjectURL(capturedPhoto);
      setCapturedPhoto(null);
    }
    setCapturedBlob(null);
    setCameraError(null);
    setShowCameraModal(false);
  };

  const handleCapturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedBlob(blob);
          setCapturedPhoto(URL.createObjectURL(blob));
        }
      },
      'image/jpeg',
      0.92
    );
  };

  const handleRetakePhoto = () => {
    if (capturedPhoto) {
      URL.revokeObjectURL(capturedPhoto);
      setCapturedPhoto(null);
    }
    setCapturedBlob(null);
  };

  const handleConfirmPhoto = () => {
    if (!capturedBlob) return;
    const filename = `photo_${Date.now()}.jpg`;
    const file = new File([capturedBlob], filename, { type: 'image/jpeg' });
    processFile(file);
    handleCloseCamera();
  };

  const handleRemoveSelectedFile = () => {
    if (selectedFile?.previewUrl) {
      URL.revokeObjectURL(selectedFile.previewUrl);
    }
    setSelectedFile(null);
  };

  // Send message or submit edit
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!activeConversation || sending) return;

    // Handle Edit submission
    if (editingMessage) {
      const trimmed = messageInput.trim();
      if (!trimmed) {
        setErrorBanner('Edited message cannot be empty.');
        return;
      }
      try {
        setSending(true);
        setErrorBanner('');
        const res = await chatService.editMessage(editingMessage._id, trimmed);
        if (res?.data?.message) {
          setMessages((prev) =>
            prev.map((m) =>
              (m._id || m.id).toString() === editingMessage._id.toString()
                ? { ...m, ...res.data.message }
                : m
            )
          );
        }
        setEditingMessage(null);
        setMessageInput('');
      } catch (err) {
        setErrorBanner(err?.response?.data?.message || err?.message || 'Failed to edit message.');
      } finally {
        setSending(false);
      }
      return;
    }

    // Normal Send message
    const trimmed = messageInput.trim();
    if (!trimmed && !selectedFile) return;

    if (trimmed.length > 2000) {
      setErrorBanner('Message length exceeds the 2000 character maximum limit.');
      return;
    }

    const clientMsgId = `cli_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      setSending(true);
      setErrorBanner('');
      sendTyping(activeConversation._id, false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      let res;
      if (selectedFile) {
        const formData = new FormData();
        if (trimmed) formData.append('content', trimmed);
        if (replyingTo?._id) formData.append('replyTo', replyingTo._id);
        formData.append('clientMsgId', clientMsgId);
        formData.append('file', selectedFile.file);

        res = await chatService.sendMessage(activeConversation._id, formData);
        handleRemoveSelectedFile();
      } else {
        res = await chatService.sendMessage(activeConversation._id, {
          content: trimmed,
          replyTo: replyingTo?._id,
          clientMsgId,
        });
      }

      setMessageInput('');
      setReplyingTo(null);

      if (res?.data?.message) {
        setMessages((prev) => {
          if (prev.some((m) => (m._id || m.id) === (res.data.message._id || res.data.message.id))) return prev;
          return [...prev, res.data.message];
        });
        setTimeout(() => scrollToBottom(true), 50);
      }
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || 'Failed to send message.';
      setErrorBanner(msg);
      if (trimmed) setMessageInput(trimmed);
    } finally {
      setSending(false);
    }
  };

  // Copy message text
  const handleCopyMessage = async (content) => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopiedField('Message copied to clipboard');
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.warn('Failed to copy to clipboard:', err);
    }
    setActiveActionsMsgId(null);
  };

  // Start edit mode
  const handleStartEdit = (msg) => {
    setEditingMessage(msg);
    setMessageInput(msg.content);
    setReplyingTo(null);
    handleRemoveSelectedFile();
    setActiveActionsMsgId(null);
    setTimeout(() => messageInputRef.current?.focus(), 50);
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setMessageInput('');
  };

  // Start reply mode
  const handleStartReply = (msg) => {
    setReplyingTo(msg);
    setEditingMessage(null);
    setActiveActionsMsgId(null);
    setTimeout(() => messageInputRef.current?.focus(), 50);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  // Delete message
  const handleDeleteMessageConfirm = async (messageId, mode) => {
    try {
      await chatService.deleteMessage(messageId, mode);
      if (mode === 'me') {
        setMessages((prev) => prev.filter((m) => (m._id || m.id).toString() !== messageId.toString()));
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            (m._id || m.id).toString() === messageId.toString()
              ? { ...m, isDeleted: true, content: 'This message was deleted', attachments: [] }
              : m
          )
        );
      }
      setDeleteModal(null);
    } catch (err) {
      alert(err?.response?.data?.error?.message || err?.response?.data?.message || 'Failed to delete message.');
    }
  };

  // Forward message
  const handleForwardMessage = async () => {
    if (!forwardModal?.messageId || selectedForwardConvs.length === 0) return;
    try {
      setForwarding(true);
      await chatService.forwardMessage(forwardModal.messageId, selectedForwardConvs);
      setForwardModal(null);
      setSelectedForwardConvs([]);
      setCopiedField('Message forwarded successfully');
      setTimeout(() => setCopiedField(null), 2500);
      fetchConversations();
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || 'Failed to forward message.');
    } finally {
      setForwarding(false);
    }
  };

  // Toggle message pin state
  const handleTogglePinMessage = async (msg) => {
    if (!activeConversation?._id || !msg?._id || pinningMessageId) return;

    const convId = activeConversation._id;
    const msgId = msg._id.toString();
    const currentPinnedMsgId = (
      activeConversation.pinnedMessage?.message?._id ||
      activeConversation.pinnedMessage?.message ||
      ''
    ).toString();
    const isCurrentlyPinned = currentPinnedMsgId === msgId;

    try {
      setPinningMessageId(msgId);
      setActiveActionsMsgId(null);

      if (isCurrentlyPinned) {
        // Optimistic unpin update
        const prevPinned = activeConversation.pinnedMessage;
        setActiveConversation((prev) => ({ ...prev, pinnedMessage: null }));
        setConversations((prev) =>
          prev.map((c) => (c._id === convId ? { ...c, pinnedMessage: null } : c))
        );

        try {
          await chatService.unpinMessage(convId, msgId);
          setCopiedField('Message unpinned');
          setTimeout(() => setCopiedField(null), 2000);
        } catch (err) {
          // Rollback on failure
          setActiveConversation((prev) => ({ ...prev, pinnedMessage: prevPinned }));
          setConversations((prev) =>
            prev.map((c) => (c._id === convId ? { ...c, pinnedMessage: prevPinned } : c))
          );
          throw err;
        }
      } else {
        // Pin new message (replaces previous pin)
        try {
          const res = await chatService.pinMessage(convId, msgId);
          if (res?.data?.conversation) {
            const updatedPinned = res.data.conversation.pinnedMessage;
            setActiveConversation((prev) => ({
              ...prev,
              pinnedMessage: updatedPinned,
            }));
            setConversations((prev) =>
              prev.map((c) => (c._id === convId ? { ...c, pinnedMessage: updatedPinned } : c))
            );
          }
          setCopiedField('Message pinned');
          setTimeout(() => setCopiedField(null), 2000);
        } catch (err) {
          throw err;
        }
      }
    } catch (err) {
      console.error('Failed to pin/unpin message:', err);
      const errMsg = err?.response?.data?.message || 'Failed to update pinned message.';
      setErrorBanner(errMsg);
      setTimeout(() => setErrorBanner(null), 4000);
    } finally {
      setPinningMessageId(null);
    }
  };

  // Unpin currently pinned message from header banner
  const handleUnpinCurrentMessage = async () => {
    if (!activeConversation?._id || pinningMessageId) return;
    const convId = activeConversation._id;
    const prevPinned = activeConversation.pinnedMessage;
    if (!prevPinned) return;

    try {
      setPinningMessageId('unpinning');
      setActiveConversation((prev) => ({ ...prev, pinnedMessage: null }));
      setConversations((prev) =>
        prev.map((c) => (c._id === convId ? { ...c, pinnedMessage: null } : c))
      );

      await chatService.unpinMessage(convId);
      setCopiedField('Message unpinned');
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to unpin message:', err);
      setActiveConversation((prev) => ({ ...prev, pinnedMessage: prevPinned }));
      setConversations((prev) =>
        prev.map((c) => (c._id === convId ? { ...c, pinnedMessage: prevPinned } : c))
      );
      setErrorBanner(err?.response?.data?.message || 'Failed to unpin message.');
      setTimeout(() => setErrorBanner(null), 4000);
    } finally {
      setPinningMessageId(null);
    }
  };

  // Secure attachment download
  const handleDownloadFile = async (fileKey, fileName) => {
    try {
      await chatService.downloadAttachment(fileKey, fileName);
    } catch (err) {
      alert('Failed to download attachment: ' + (err?.response?.data?.message || err.message));
    }
  };

  // Insert emoji into composer at cursor position
  const handleInsertEmoji = (emoji) => {
    const input = messageInputRef.current;
    if (input) {
      const start = input.selectionStart ?? messageInput.length;
      const end = input.selectionEnd ?? messageInput.length;
      const updated = messageInput.slice(0, start) + emoji + messageInput.slice(end);
      setMessageInput(updated);
      setTimeout(() => {
        input.focus();
        const newCursorPos = start + emoji.length;
        input.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    } else {
      setMessageInput((prev) => prev + emoji);
    }
  };

  // Toggle emoji reaction on a message
  const handleToggleReaction = async (messageId, emoji) => {
    if (!messageId || !emoji) return;
    const msgIdStr = messageId.toString();
    try {
      // Optimistic update
      setMessages((prev) =>
        prev.map((m) => {
          if ((m._id || m.id || '').toString() !== msgIdStr) return m;
          const currentReactions = [...(m.reactions || [])];
          const myIdStr = (currentUserId || '').toString();
          const existingIdx = currentReactions.findIndex(
            (r) =>
              r.emoji === emoji &&
              (r.user?._id || r.user)?.toString() === myIdStr
          );

          if (existingIdx > -1) {
            currentReactions.splice(existingIdx, 1);
          } else {
            currentReactions.push({
              emoji,
              user: {
                _id: currentUserId,
                name: user?.name || 'You',
                role: user?.role,
              },
              createdAt: new Date().toISOString(),
            });
          }
          return { ...m, reactions: currentReactions };
        })
      );

      const res = await chatService.toggleReaction(messageId, emoji);
      if (res?.data?.reactions) {
        setMessages((prev) =>
          prev.map((m) =>
            (m._id || m.id || '').toString() === msgIdStr
              ? { ...m, reactions: res.data.reactions }
              : m
          )
        );
      }
    } catch (err) {
      console.error('Failed to toggle reaction:', err);
    } finally {
      setActiveReactionMsgId(null);
      setShowMoreReactionMsgId(null);
    }
  };

  // Start new direct conversation
  const startDirectChat = async (contact) => {
    try {
      const res = await chatService.createConversation({
        type: CONVERSATION_TYPES.DIRECT,
        recipientId: contact._id,
      });
      const conv = res?.data?.conversation || res?.data;
      if (conv) {
        setShowNewChatModal(false);
        setConversations((prev) => {
          if (prev.some((c) => c._id === conv._id)) return prev;
          return [conv, ...prev];
        });
        selectConversation(conv);
        setMobileShowChat(true);
        setTimeout(() => messageInputRef.current?.focus(), 150);
      }
    } catch (err) {
      console.error('Failed to create direct chat:', err);
      setErrorBanner(
        err?.response?.data?.error?.message || 'Could not start conversation with contact.'
      );
    }
  };

  // Open existing or start chat with contact
  const handleStartOrOpenChat = useCallback(
    async (contact) => {
      const contactId = (contact._id || contact).toString();
      const existing = conversations.find(
        (c) =>
          c.type === CONVERSATION_TYPES.DIRECT &&
          (c.participants || []).some((p) => (p._id || p).toString() === contactId)
      );

      if (existing) {
        selectConversation(existing);
        setMobileShowChat(true);
        setTimeout(() => messageInputRef.current?.focus(), 150);
        return;
      }

      await startDirectChat(contact);
    },
    [conversations, selectConversation]
  );

  // Create new group
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim() || creatingGroup) return;

    try {
      setCreatingGroup(true);
      const res = await chatService.createConversation({
        type: CONVERSATION_TYPES.GROUP,
        name: groupName.trim(),
        description: groupDesc.trim(),
        participantIds: selectedParticipants,
      });

      const conv = res?.data?.conversation || res?.data;
      if (conv) {
        setShowNewGroupModal(false);
        setGroupName('');
        setGroupDesc('');
        setSelectedParticipants([]);
        setContactSearch('');
        await fetchConversations();
        selectConversation(conv);
      }
    } catch (err) {
      alert(err?.response?.data?.error?.message || 'Failed to create group conversation.');
    } finally {
      setCreatingGroup(false);
    }
  };

  // Group admin checks
  const isGroupAdmin = activeConversation?.type === CONVERSATION_TYPES.GROUP && (
    activeConversation.creator?._id === currentUserId ||
    activeConversation.creator === currentUserId ||
    (activeConversation.groupAdmins || []).some(
      (a) => (a._id || a).toString() === currentUserId
    ) ||
    ['admin', 'coordinator'].includes(user?.role)
  );

  const handleUpdateGroupDetails = async () => {
    if (!activeConversation) return;
    try {
      setSavingGroup(true);
      const res = await chatService.updateGroupMembers(activeConversation._id, {
        name: editGroupName,
        description: editGroupDesc,
      });
      if (res?.data?.conversation) {
        setActiveConversation(res.data.conversation);
        setConversations((prev) =>
          prev.map((c) => (c._id === activeConversation._id ? res.data.conversation : c))
        );
      }
    } catch (err) {
      alert(err?.response?.data?.error?.message || 'Failed to update group.');
    } finally {
      setSavingGroup(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!activeConversation || !window.confirm('Remove this member from the group?')) return;
    try {
      const res = await chatService.updateGroupMembers(activeConversation._id, {
        action: 'remove',
        userId: memberId,
      });
      if (res?.data?.conversation) {
        setActiveConversation(res.data.conversation);
        setConversations((prev) =>
          prev.map((c) => (c._id === activeConversation._id ? res.data.conversation : c))
        );
      }
    } catch (err) {
      alert(err?.response?.data?.error?.message || 'Failed to remove member.');
    }
  };

  const handleAddMembersToGroup = async () => {
    if (!activeConversation || selectedAddMembers.length === 0) return;
    try {
      const res = await chatService.updateGroupMembers(activeConversation._id, {
        addMemberIds: selectedAddMembers,
      });
      if (res?.data?.conversation) {
        setActiveConversation(res.data.conversation);
        setConversations((prev) =>
          prev.map((c) => (c._id === activeConversation._id ? res.data.conversation : c))
        );
        setShowAddMembersModal(false);
        setSelectedAddMembers([]);
      }
    } catch (err) {
      alert(err?.response?.data?.error?.message || 'Failed to add members.');
    }
  };

  const formatMessageTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatSearchDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return timeStr;
    const sameYear = date.getFullYear() === now.getFullYear();
    const dateStr = date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      ...(sameYear ? {} : { year: 'numeric' }),
    });
    return `${dateStr}, ${timeStr}`;
  };

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

  const companyMembers = useMemo(() => {
    return contacts.filter((c) => {
      const cId = (c._id || c).toString();
      if (cId === currentUserId) return false;
      return (
        c.role === 'company' ||
        c.role === 'mentor' ||
        c.role === 'coordinator' ||
        c.role === 'admin' ||
        Boolean(c.profile?.companyDetails?.companyName)
      );
    });
  }, [contacts, currentUserId]);

  const filteredCompanyMembers = useMemo(() => {
    if (!searchQuery.trim()) return companyMembers;
    const q = searchQuery.toLowerCase().trim();
    return companyMembers.filter((m) => {
      const name = (m.name || '').toLowerCase();
      const email = (m.email || '').toLowerCase();
      const compName = (m.profile?.companyDetails?.companyName || '').toLowerCase();
      const industry = (m.profile?.companyDetails?.industry || '').toLowerCase();
      const dept = (m.profile?.department || '').toLowerCase();
      const role = (m.role || '').toLowerCase();
      return (
        name.includes(q) ||
        email.includes(q) ||
        compName.includes(q) ||
        industry.includes(q) ||
        dept.includes(q) ||
        role.includes(q)
      );
    });
  }, [companyMembers, searchQuery]);

  const filteredModalContacts = useMemo(() => {
    if (!contactSearch.trim()) return contacts;
    const q = contactSearch.toLowerCase().trim();
    return contacts.filter(
      (c) =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.role || '').toLowerCase().includes(q)
    );
  }, [contacts, contactSearch]);

  const filteredConversations = conversations.filter((c) => {
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

  // Active conversation timeline messages
  const displayedMessages = messages;

  const activeDetails = getConversationDetails(activeConversation);

  // Compute normalized pinned message metadata for conversation banner and message badges
  const pinnedData = useMemo(() => {
    if (!activeConversation?.pinnedMessage?.message) return null;
    const pMsg = activeConversation.pinnedMessage.message;
    const isObj = typeof pMsg === 'object' && pMsg !== null;
    const msgId = (isObj ? (pMsg._id || pMsg.id) : pMsg)?.toString();

    let senderName = 'User';
    if (isObj && pMsg.sender) {
      if (typeof pMsg.sender === 'object') {
        const sId = (pMsg.sender._id || pMsg.sender.id)?.toString();
        senderName = sId === currentUserId?.toString() ? 'You' : (pMsg.sender.name || 'User');
      } else {
        senderName = pMsg.sender.toString() === currentUserId?.toString() ? 'You' : 'User';
      }
    }

    let preview = '';
    if (isObj) {
      if (pMsg.isDeleted) {
        preview = 'This message was deleted';
      } else if (pMsg.content) {
        preview = pMsg.content;
      } else if (pMsg.attachments && pMsg.attachments.length > 0) {
        const att = pMsg.attachments[0];
        preview = att.fileName ? `📎 ${att.fileName}` : '📎 Attachment';
      } else {
        preview = 'Message';
      }
    } else {
      const foundInMessages = messages.find((m) => (m._id || m.id)?.toString() === msgId);
      if (foundInMessages) {
        const sId = (foundInMessages.sender?._id || foundInMessages.sender)?.toString();
        senderName = sId === currentUserId?.toString() ? 'You' : (foundInMessages.sender?.name || 'User');
        if (foundInMessages.isDeleted) preview = 'This message was deleted';
        else if (foundInMessages.content) preview = foundInMessages.content;
        else if (foundInMessages.attachments?.length > 0) preview = `📎 ${foundInMessages.attachments[0].fileName || 'Attachment'}`;
        else preview = 'Message';
      } else {
        preview = 'Pinned message';
      }
    }

    return {
      messageId: msgId,
      senderName,
      preview,
      pinnedAt: activeConversation.pinnedMessage.pinnedAt,
      pinnedBy: activeConversation.pinnedMessage.pinnedBy,
    };
  }, [activeConversation?.pinnedMessage, currentUserId, messages]);

  return (
    <div className="h-[calc(100vh-64px)] w-full flex bg-slate-50 dark:bg-slate-900 overflow-hidden font-sans">
      {/* Hidden File Input for Attachments */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
        className="hidden"
      />

      {/* Copy notification badge */}
      {copiedField && (
        <div className="fixed top-20 right-6 z-50 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-xl border border-slate-700 animate-in fade-in slide-in-from-top-2 duration-150 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{copiedField}</span>
        </div>
      )}

      {/* LEFT SIDEBAR: Conversations List & Directory */}
      <div
        className={`${
          mobileShowChat ? 'hidden md:flex' : 'flex'
        } w-full md:w-80 lg:w-96 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shrink-0 h-full`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 dark:text-white leading-none">
                  Messages
                </h1>
                <span className="text-[11px] text-slate-400 font-medium">Real-Time Messaging</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  fetchContacts();
                  setShowNewChatModal(true);
                }}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="New Direct Message"
              >
                <Plus className="w-4 h-4" />
              </button>
              {canCreateGroup && (
                <button
                  type="button"
                  onClick={() => {
                    fetchContacts();
                    setShowNewGroupModal(true);
                  }}
                  className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Create Group"
                >
                  <Users className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search conversations & contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-brand-500/30 border border-transparent focus:border-brand-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 mt-3">
            {[
              { id: 'all', label: 'All' },
              { id: 'direct', label: 'Direct' },
              { id: 'group', label: 'Groups' },
              { id: 'company', label: 'Colleagues' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id)}
                className={`flex-1 py-1 text-xs rounded-lg font-medium transition-all text-center ${
                  filterType === tab.id
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/80 dark:text-brand-300 font-bold border border-brand-200/80 dark:border-brand-800/80'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conversations & Contacts Stream */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 no-scrollbar">
          {filterType === 'company' ? (
            /* Colleagues / Company Representatives Directory */
            filteredCompanyMembers.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No company representatives found.
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
                    onClick={() => handleStartOrOpenChat(member)}
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
              <Loader2 className="w-5 h-5 animate-spin mr-2 text-brand-500" />
              Loading conversations...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <p>No conversations found.</p>
              <button
                type="button"
                onClick={() => {
                  fetchContacts();
                  setShowNewChatModal(true);
                }}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/80 dark:text-brand-300 font-semibold border border-brand-200 dark:border-brand-800"
              >
                <Plus className="w-3.5 h-3.5" /> Start a message
              </button>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const details = getConversationDetails(conv);
              const isActive = activeConversation?._id === conv._id;
              const hasUnread = (conv.unreadCount || 0) > 0;
              const lastMsgSnippet = conv.lastMessage?.isDeleted
                ? '🚫 This message was deleted'
                : conv.lastMessage?.content
                ? conv.lastMessage.content
                : conv.lastMessage?.attachments?.length > 0
                ? `📎 ${conv.lastMessage.attachments[0].fileName}`
                : 'No messages yet';

              return (
                <div
                  key={conv._id}
                  onClick={() => selectConversation(conv)}
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
                      <span className={`text-xs truncate ${hasUnread ? 'font-bold text-slate-900 dark:text-white' : 'font-semibold text-slate-800 dark:text-slate-200'}`}>
                        {details.title}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0 ml-1">
                        {formatMessageTime(conv.lastMessageAt || conv.updatedAt)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-[11px] truncate ${hasUnread ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                        {lastMsgSnippet}
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

      {/* RIGHT MAIN PANEL: Active Conversation */}
      <div
        className={`${
          !mobileShowChat ? 'hidden md:flex' : 'flex'
        } flex-1 flex-col h-full bg-slate-100/60 dark:bg-slate-950 overflow-hidden relative`}
      >
        {activeConversation ? (
          <>
            {/* Active Conversation Top Header */}
            <div className="h-16 px-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0 z-10 shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                {/* Mobile back button */}
                <button
                  type="button"
                  onClick={() => setMobileShowChat(false)}
                  className="md:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <UserAvatar
                  sender={activeDetails.partner}
                  name={activeDetails.title}
                  size="md"
                  isOnline={activeDetails.isOnline}
                  showStatus={activeConversation.type === CONVERSATION_TYPES.DIRECT}
                />

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {activeDetails.title}
                    </h2>
                    {activeConversation.type === CONVERSATION_TYPES.GROUP && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                        Channel
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {typingUsers.size > 0 ? (
                      <span className="text-brand-600 dark:text-brand-400 font-medium italic animate-pulse">
                        {Array.from(typingUsers.values()).join(', ')} typing...
                      </span>
                    ) : activeConversation.type === CONVERSATION_TYPES.DIRECT ? (
                      <span className="flex items-center gap-1.5 font-medium">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            activeDetails.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                          }`}
                        />
                        <span>
                          {activeDetails.isOnline
                            ? 'Active Now'
                            : formatLastSeen(activeDetails.partner?.lastSeen)}
                        </span>
                      </span>
                    ) : (
                      <span>{activeDetails.subtitle}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Header Right Actions */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Search in chat toggle */}
                <button
                  type="button"
                  onClick={() => {
                    setShowInChatSearch((prev) => {
                      const next = !prev;
                      if (!next) {
                        handleCloseSearch();
                      }
                      return next;
                    });
                  }}
                  className={`p-2 rounded-xl text-xs font-semibold transition-all ${
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

                {/* Notification status indicator when blocked */}
                {pushPermission === 'denied' && (
                  <span
                    className="p-2 rounded-xl text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-help"
                    title="Desktop notifications are blocked by your browser settings. To receive desktop alerts, click the lock/settings icon in your address bar and allow notifications."
                  >
                    <BellOff className="w-4 h-4" />
                  </span>
                )}
              </div>
            </div>

            {/* Desktop Notification Enable Banner (when permission is in default state) */}
            {pushPermission === 'default' && !dismissedPushBanner && (
              <div className="bg-brand-50/95 dark:bg-brand-950/40 border-b border-brand-200/80 dark:border-brand-800/80 px-4 py-2 flex items-center justify-between gap-3 text-xs shrink-0 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-brand-900 dark:text-brand-200 font-medium min-w-0">
                  <Bell className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                  <span className="truncate">Enable desktop notifications to receive instant alerts when someone messages you.</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={async () => {
                      await requestPushPermission();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold text-[11px] shadow-xs transition-colors cursor-pointer"
                  >
                    Enable
                  </button>
                  <button
                    type="button"
                    onClick={() => setDismissedPushBanner(true)}
                    className="p-1 rounded-md text-brand-500 hover:bg-brand-100 dark:hover:bg-brand-900/50 cursor-pointer"
                    title="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Desktop Notification Blocked Notice (when permission is denied) */}
            {pushPermission === 'denied' && !dismissedPushBanner && (
              <div className="bg-amber-50/95 dark:bg-amber-950/40 border-b border-amber-200/80 dark:border-amber-800/80 px-4 py-2 flex items-center justify-between gap-3 text-xs shrink-0 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-medium min-w-0">
                  <BellOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="truncate">Desktop notifications are blocked. To receive native popups, click the lock (🔒) in your browser address bar and allow notifications.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDismissedPushBanner(true)}
                  className="p-1 rounded-md text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/50 cursor-pointer shrink-0"
                  title="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Compact Pinned Message Banner */}
            {pinnedData && (
              <div
                role="region"
                aria-label="Pinned message"
                className="px-3.5 py-2 bg-gradient-to-r from-amber-50/95 via-amber-50/75 to-orange-50/90 dark:from-amber-950/40 dark:via-slate-800/80 dark:to-orange-950/30 border-b border-amber-200/80 dark:border-amber-800/60 flex items-center justify-between gap-2.5 text-xs shadow-2xs animate-in fade-in slide-in-from-top-1 duration-150 shrink-0 z-10"
              >
                <button
                  type="button"
                  onClick={() => handleJumpToMessage(pinnedData.messageId)}
                  className="flex-1 min-w-0 flex items-center gap-2.5 text-left group focus:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500 rounded-lg p-0.5 cursor-pointer"
                  title="Click to view pinned message in history"
                  aria-label={`Jump to pinned message from ${pinnedData.senderName}`}
                >
                  <div className="w-6 h-6 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Pin className="w-3.5 h-3.5 fill-amber-500/30" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-800 dark:text-slate-100 text-[11px] truncate">
                        {pinnedData.senderName}
                      </span>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                        • Pinned
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">
                      {pinnedData.preview}
                    </p>
                  </div>
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleJumpToMessage(pinnedData.messageId)}
                    className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100/70 dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
                    aria-label="Jump to pinned message"
                  >
                    <span>View</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleUnpinCurrentMessage}
                    disabled={pinningMessageId === 'unpinning'}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-amber-100/60 dark:hover:bg-amber-900/40 transition-colors cursor-pointer"
                    title="Unpin message"
                    aria-label="Unpin message"
                  >
                    {pinningMessageId === 'unpinning' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                    ) : (
                      <X className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* In-Chat Search Bar & Results Drawer */}
            {showInChatSearch && (
              <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-md animate-in fade-in slide-in-from-top-2 duration-150 shrink-0 z-20">
                {/* Search Input Bar */}
                <div className="px-4 py-2.5 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800">
                  <Search className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    ref={searchInputRef}
                    type="search"
                    role="searchbox"
                    placeholder="Search message history..."
                    aria-label="Search messages in this conversation"
                    value={inChatSearchQuery}
                    onChange={(e) => {
                      setInChatSearchQuery(e.target.value);
                      setSearchPage(1);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        handleCloseSearch();
                      }
                    }}
                    className="flex-1 py-1 px-1.5 text-xs bg-transparent border-none outline-none text-slate-900 dark:text-white placeholder-slate-400"
                    autoFocus
                  />
                  {inChatSearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setInChatSearchQuery('');
                        setSearchResults([]);
                        setSearchError(null);
                        setSearchPage(1);
                        searchInputRef.current?.focus();
                      }}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Clear search"
                      aria-label="Clear search input"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Match count and pagination controls in header */}
                  {searchPagination.total > 0 && !searchLoading && (
                    <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 shrink-0">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {searchPagination.total} {searchPagination.total === 1 ? 'match' : 'matches'}
                      </span>
                      {searchPagination.totalPages > 1 && (
                        <div className="flex items-center gap-0.5 ml-1">
                          <button
                            type="button"
                            disabled={searchPage <= 1 || searchLoading}
                            onClick={() => setSearchPage((p) => Math.max(1, p - 1))}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none text-slate-600 dark:text-slate-400"
                            title="Previous results page"
                            aria-label="Previous page"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-1 text-[10px] font-medium text-slate-400">
                            {searchPage}/{searchPagination.totalPages}
                          </span>
                          <button
                            type="button"
                            disabled={!searchPagination.hasMore || searchLoading}
                            onClick={() => setSearchPage((p) => p + 1)}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none text-slate-600 dark:text-slate-400"
                            title="Next results page"
                            aria-label="Next page"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Close button */}
                  <button
                    type="button"
                    onClick={handleCloseSearch}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-1"
                    title="Close search (Esc)"
                    aria-label="Close search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Search Results / Status Body */}
                {inChatSearchQuery.trim() && (
                  <div className="max-h-72 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50 divide-y divide-slate-100 dark:divide-slate-800">
                    {searchLoading ? (
                      <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
                        <span>Searching conversation history...</span>
                      </div>
                    ) : searchError ? (
                      <div className="p-4 bg-red-50/80 dark:bg-red-950/30 text-xs text-red-600 dark:text-red-400 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                          <span className="truncate">{searchError}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => executeMessageSearch(inChatSearchQuery, searchPage)}
                          className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md font-semibold text-[11px] shrink-0 transition-colors cursor-pointer"
                        >
                          Retry
                        </button>
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="py-6 px-4 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
                        <p className="font-semibold text-slate-700 dark:text-slate-300">
                          No matching messages found
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Try a different keyword or check your spelling.
                        </p>
                      </div>
                    ) : (
                      searchResults.map((result) => {
                        const sender = result.sender || {};
                        const senderName = sender.name || 'Unknown';
                        const senderRole = sender.role || '';
                        const isJumpingThis = jumpingMessageId === result._id;

                        return (
                          <button
                            key={result._id}
                            type="button"
                            onClick={() => handleJumpToMessage(result._id)}
                            disabled={isJumpingThis}
                            className="w-full text-left px-4 py-2.5 hover:bg-brand-50/70 dark:hover:bg-slate-800 transition-colors flex flex-col gap-1 focus:outline-hidden focus:bg-brand-50 dark:focus:bg-slate-800 group cursor-pointer"
                          >
                            <div className="flex items-center justify-between text-xs w-full">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-brand-600 dark:group-hover:text-brand-400">
                                  {senderName}
                                </span>
                                {senderRole && (
                                  <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded uppercase tracking-wider bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                    {senderRole}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400 shrink-0">
                                {formatSearchDate(result.createdAt)}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                              <SafeHighlight text={result.content} highlight={inChatSearchQuery} />
                            </p>
                            <div className="flex items-center gap-1 text-[11px] font-medium text-brand-600 dark:text-brand-400 opacity-80 group-hover:opacity-100 transition-opacity pt-0.5">
                              {isJumpingThis ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span>Jumping to message...</span>
                                </>
                              ) : (
                                <>
                                  <span>Jump to message in timeline</span>
                                  <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                                </>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Context View Banner (when viewing older window around jump target) */}
            {isViewingSearchContext && (
              <div className="bg-brand-50/90 dark:bg-brand-950/40 border-b border-brand-200/80 dark:border-brand-800/80 px-4 py-2 flex items-center justify-between gap-3 text-xs text-brand-900 dark:text-brand-200 shrink-0 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 min-w-0">
                  <History className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                  <span className="truncate">Viewing conversation history around search result.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsViewingSearchContext(false);
                    if (activeConversation?._id) {
                      fetchMessages(activeConversation._id);
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold text-[11px] shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  Return to latest
                </button>
              </div>
            )}

            {/* Error Banner */}
            {errorBanner && (
              <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 text-xs text-red-600 dark:text-red-400 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorBanner}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorBanner('')}
                  className="p-1 hover:text-red-800 dark:hover:text-red-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* MESSAGES SCROLL CONTAINER */}
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/70 dark:bg-slate-950 w-full relative"
            >
              {loadingMessages ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                </div>
              ) : displayedMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs p-6 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-500 mb-3">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                    No messages yet
                  </p>
                  <p className="text-slate-500 max-w-xs mt-1">
                    Send a message or attach a file to get started.
                  </p>
                </div>
              ) : (
                displayedMessages.map((msg, index) => {
                  const senderId = (msg.sender?._id || msg.sender?.id || msg.sender || '').toString();
                  const myId = (currentUserId || user?.id || user?._id || '').toString();
                  const isSender = Boolean(myId && senderId && myId === senderId);

                  const senderObj =
                    typeof msg.sender === 'object' && msg.sender !== null
                      ? msg.sender
                      : (activeConversation?.participants || []).find(
                          (p) => (p._id || p.id || p).toString() === senderId
                        ) || null;

                  const senderName = isSender
                    ? 'You'
                    : senderObj?.name || (activeConversation?.type === CONVERSATION_TYPES.DIRECT ? activeDetails.title : 'Colleague');

                  const senderRole = isSender
                    ? user?.role || ''
                    : senderObj?.role || (activeConversation?.type === CONVERSATION_TYPES.DIRECT ? activeDetails.partner?.role || '' : '');

                  const isReadByOthers = (msg.readBy || []).some(
                    (id) => (id._id || id).toString() !== myId
                  );
                  const msgId = (msg._id || msg.id || index).toString();
                  const groupedReactions = groupReactions(msg.reactions, currentUserId);

                  return (
                    <div
                      key={msg._id || index}
                      id={`msg-${msgId}`}
                      className={`w-full flex items-start gap-2.5 sm:gap-3.5 group transition-all rounded-xl p-0.5 ${
                        isSender ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {/* Avatar on left for received messages */}
                      {!isSender && (
                        <div className="shrink-0 mt-0.5">
                          <UserAvatar
                            sender={senderObj || activeDetails.partner}
                            name={senderName}
                            size="sm"
                            isOnline={activeDetails.isOnline}
                            showStatus={false}
                          />
                        </div>
                      )}

                      {/* Message Bubble Column */}
                      <div
                        className={`flex flex-col max-w-[85%] sm:max-w-[72%] space-y-1 ${
                          isSender ? 'items-end ml-auto' : 'items-start mr-auto'
                        }`}
                      >
                        {/* Sender Info Bar */}
                        <div className="flex items-center gap-1.5 flex-wrap text-xs px-1">
                          {!isSender ? (
                            <>
                              <span className="font-bold text-slate-900 dark:text-slate-100">
                                {senderName}
                              </span>
                              {senderRole && (
                                <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-sm bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300/60 dark:border-slate-700/60 leading-none">
                                  {senderRole}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium ml-1">
                                {formatMessageTime(msg.createdAt)}
                              </span>
                              {msg.isEdited && (
                                <span className="text-[10px] text-slate-400 italic">
                                  (edited)
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              {msg.isEdited && (
                                <span className="text-[10px] text-slate-400 italic mr-1">
                                  (edited)
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mr-1">
                                {formatMessageTime(msg.createdAt)}
                              </span>
                              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-sm bg-brand-50 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300 border border-brand-200/80 dark:border-brand-800/80 leading-none">
                                You
                              </span>
                            </>
                          )}
                        </div>

                        {/* Bubble & Hover Actions Row */}
                        <div className="relative group/bubble flex items-center gap-1 max-w-full">
                          {/* If Sender: Action Trigger Buttons on Left of bubble */}
                          {isSender && !msg.isDeleted && (
                            <div className="flex items-center gap-0.5 opacity-0 group-hover/bubble:opacity-100 transition-opacity shrink-0">
                              <button
                                type="button"
                                onClick={() => handleStartReply(msg)}
                                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                                title="Reply to message"
                                aria-label="Reply to message"
                              >
                                <Reply className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveReactionMsgId(activeReactionMsgId === msgId ? null : msgId)}
                                className="reaction-trigger-btn p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                                title="React"
                              >
                                <SmilePlus className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveActionsMsgId(activeActionsMsgId === msgId ? null : msgId)}
                                className="actions-trigger-btn p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                                title="More options"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {/* Message Bubble Card */}
                          <div
                            className={`px-4 py-2.5 rounded-2xl shadow-xs transition-all relative text-xs sm:text-[13px] leading-relaxed wrap-break-word whitespace-pre-wrap select-text max-w-full ${
                              isSender
                                ? 'bg-brand-600 text-white rounded-tr-xs'
                                : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-xs border border-slate-200/90 dark:border-slate-700/80'
                            }`}
                          >
                            {/* Pinned Indicator on Bubble */}
                            {pinnedData?.messageId?.toString() === msgId && (
                              <div
                                className={`flex items-center gap-1.5 text-[10px] font-semibold mb-1.5 ${
                                  isSender
                                    ? 'text-amber-200'
                                    : 'text-amber-600 dark:text-amber-400'
                                }`}
                              >
                                <Pin className="w-3 h-3 fill-amber-500/40" />
                                <span>Pinned message</span>
                              </div>
                            )}

                            {/* Quoted Parent Reply (if this message is a reply) */}
                            {(msg.replyTo || msg.replySnapshot || msg.replyToMessageId) && (
                              <div
                                onClick={() => {
                                  const parentId = (
                                    msg.replyTo?._id ||
                                    msg.replyToMessageId ||
                                    msg.replyTo ||
                                    msg.replySnapshot?.messageId
                                  )?.toString();
                                  if (parentId) {
                                    handleJumpToMessage(parentId);
                                  }
                                }}
                                className={`mb-2 p-2.5 rounded-xl text-xs cursor-pointer border-l-4 transition-all hover:opacity-95 ${
                                  isSender
                                    ? 'bg-brand-700/80 border-white/90 text-white hover:bg-brand-700'
                                    : 'bg-slate-100 dark:bg-slate-700/80 border-brand-500 text-slate-800 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                                }`}
                                title="Click to jump to original message"
                                role="button"
                                tabIndex={0}
                              >
                                <div className="font-bold text-[10px] uppercase flex items-center gap-1.5 opacity-90 mb-0.5">
                                  <Reply className="w-3 h-3" />
                                  <span>
                                    {msg.replyTo?.sender?.name || msg.replySnapshot?.senderName || 'User'}
                                  </span>
                                  {(msg.replyTo?.sender?.role || msg.replySnapshot?.senderRole) && (
                                    <span className="px-1 text-[9px] font-semibold rounded uppercase tracking-wider bg-black/10 dark:bg-white/10">
                                      {msg.replyTo?.sender?.role || msg.replySnapshot?.senderRole}
                                    </span>
                                  )}
                                </div>
                                <p className="line-clamp-1 italic text-[11px] opacity-85">
                                  {msg.replyTo?.isDeleted || msg.replySnapshot?.isDeleted
                                    ? '🚫 This message was deleted'
                                    : msg.replyTo?.content ||
                                      msg.replySnapshot?.contentPreview ||
                                      (msg.replyTo?.attachments?.length > 0
                                        ? `📎 ${msg.replyTo.attachments[0].fileName}`
                                        : (msg.replySnapshot?.attachmentSummary ? `📎 ${msg.replySnapshot.attachmentSummary}` : 'Quoted message'))}
                                </p>
                              </div>
                            )}

                            {/* Attachments rendering */}
                            {msg.attachments && msg.attachments.length > 0 && !msg.isDeleted && (
                              <div className="space-y-2 mb-2">
                                {msg.attachments.map((att, aIdx) => {
                                  if (att.fileType === 'image') {
                                    return (
                                      <div
                                        key={att._id || aIdx}
                                        className="overflow-hidden rounded-xl bg-black/10 cursor-pointer"
                                        onClick={() =>
                                          setPreviewImageModal({
                                            url: att.url,
                                            fileName: att.fileName,
                                            fileKey: att.fileKey,
                                          })
                                        }
                                      >
                                        <img
                                          src={att.url}
                                          alt={att.fileName}
                                          className="max-h-64 max-w-full rounded-xl object-cover hover:scale-[1.02] transition-transform duration-200"
                                          loading="lazy"
                                        />
                                      </div>
                                    );
                                  }

                                  return (
                                    <div
                                      key={att._id || aIdx}
                                      className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors ${
                                        isSender
                                          ? 'bg-brand-700/60 border-brand-400/40 text-white'
                                          : 'bg-slate-50 dark:bg-slate-750 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                                      }`}
                                    >
                                      <div className="p-2 rounded-lg bg-white/20 dark:bg-black/20 shrink-0">
                                        {renderFileTypeIcon(att.fileType)}
                                      </div>
                                      <div className="flex-1 min-w-0 text-left">
                                        <p className="text-xs font-semibold truncate" title={att.fileName}>
                                          {att.fileName}
                                        </p>
                                        <p className={`text-[10px] ${isSender ? 'text-brand-100' : 'text-slate-400'}`}>
                                          {formatFileSize(att.size)} • {att.fileType?.toUpperCase()}
                                        </p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleDownloadFile(att.fileKey, att.fileName)}
                                        className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0"
                                        title={`Download ${att.fileName}`}
                                      >
                                        <Download className="w-4 h-4" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Message Text Content */}
                            {msg.isDeleted ? (
                              <p className="italic opacity-70 flex items-center gap-1.5 text-xs">
                                <span>🚫</span>
                                <span>This message was deleted</span>
                              </p>
                            ) : (
                              msg.content && <p>{msg.content}</p>
                            )}
                          </div>

                          {/* If Receiver: Action Trigger Buttons on Right of bubble */}
                          {!isSender && !msg.isDeleted && (
                            <div className="flex items-center gap-0.5 opacity-0 group-hover/bubble:opacity-100 transition-opacity shrink-0">
                              <button
                                type="button"
                                onClick={() => handleStartReply(msg)}
                                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                                title="Reply to message"
                                aria-label="Reply to message"
                              >
                                <Reply className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveReactionMsgId(activeReactionMsgId === msgId ? null : msgId)}
                                className="reaction-trigger-btn p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                                title="React"
                              >
                                <SmilePlus className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveActionsMsgId(activeActionsMsgId === msgId ? null : msgId)}
                                className="actions-trigger-btn p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                                title="More options"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {/* Floating WhatsApp-Style Quick Reaction Bar */}
                          {activeReactionMsgId === msgId && (
                            <div
                              ref={reactionPickerRef}
                              className={`absolute -top-11 z-30 flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 shadow-xl animate-in fade-in zoom-in-95 duration-150 ${
                                isSender ? 'right-0 origin-top-right' : 'left-0 origin-top-left'
                              }`}
                            >
                              {QUICK_REACTIONS.map((emoji) => {
                                const isMyReaction = (msg.reactions || []).some(
                                  (r) => r.emoji === emoji && (r.user?._id || r.user)?.toString() === currentUserId?.toString()
                                );
                                return (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => handleToggleReaction(msgId, emoji)}
                                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-base hover:scale-125 transition-transform active:scale-95 ${
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
                                onClick={() => setShowMoreReactionMsgId(showMoreReactionMsgId === msgId ? null : msgId)}
                                className="reaction-more-btn w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 ml-0.5"
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
                                  onClick={() => setShowMoreReactionMsgId(null)}
                                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <div className="grid grid-cols-7 gap-1 pt-2 max-h-36 overflow-y-auto no-scrollbar">
                                {EMOJI_CATEGORIES.flatMap((c) => c.emojis).map((emoji, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleToggleReaction(msgId, emoji)}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-base hover:bg-slate-100 dark:hover:bg-slate-750 hover:scale-125 transition-transform active:scale-95"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 3-DOTS Message Actions Dropdown Menu */}
                          {activeActionsMsgId === msgId && (
                            <div
                              ref={actionsMenuRef}
                              className={`absolute -top-2 z-30 w-44 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 shadow-xl py-1 text-xs animate-in fade-in zoom-in-95 duration-150 ${
                                isSender ? 'right-full mr-1.5' : 'left-full ml-1.5'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleStartReply(msg)}
                                className="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200"
                              >
                                <Reply className="w-3.5 h-3.5 text-brand-600" />
                                <span>Reply</span>
                              </button>

                              {msg.content && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyMessage(msg.content)}
                                  className="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200"
                                >
                                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Copy Text</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setForwardModal(msg);
                                  setSelectedForwardConvs([]);
                                  setActiveActionsMsgId(null);
                                }}
                                className="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200"
                              >
                                <Share2 className="w-3.5 h-3.5 text-indigo-500" />
                                <span>Forward</span>
                              </button>

                              {/* Pin / Unpin Message Action */}
                              {!msg.isDeleted && (
                                <button
                                  type="button"
                                  disabled={pinningMessageId === msgId}
                                  onClick={() => handleTogglePinMessage(msg)}
                                  className="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 cursor-pointer"
                                  aria-label={
                                    pinnedData?.messageId?.toString() === msgId
                                      ? 'Unpin message'
                                      : 'Pin message'
                                  }
                                >
                                  {pinningMessageId === msgId ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                                  ) : (
                                    <Pin
                                      className={`w-3.5 h-3.5 ${
                                        pinnedData?.messageId?.toString() === msgId
                                          ? 'text-amber-500 fill-amber-500/40'
                                          : 'text-amber-500'
                                      }`}
                                    />
                                  )}
                                  <span>
                                    {pinnedData?.messageId?.toString() === msgId
                                      ? 'Unpin Message'
                                      : 'Pin Message'}
                                  </span>
                                </button>
                              )}

                              {isSender && (
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(msg)}
                                  className="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-amber-500" />
                                  <span>Edit</span>
                                </button>
                              )}

                              <div className="my-1 border-t border-slate-100 dark:border-slate-750" />

                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteModal({ messageId: msg._id, isSender });
                                  setActiveActionsMsgId(null);
                                }}
                                className="w-full px-3 py-2 flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Reaction Badges Below Message Bubble */}
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
                                onClick={() => handleToggleReaction(msgId, emoji)}
                                title={userNames.join(', ')}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-all active:scale-95 ${
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

                        {/* Delivery Status & Read Receipt */}
                        {isSender && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 pr-1">
                            {isReadByOthers ? (
                              <span className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 font-medium">
                                <CheckCheck className="w-3.5 h-3.5" />
                                <span>Read</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-slate-400">
                                <Check className="w-3.5 h-3.5" />
                                <span>Delivered</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Sender Avatar on right side */}
                      {isSender && (
                        <div className="shrink-0 mt-0.5">
                          <UserAvatar
                            user={user}
                            name={user?.name}
                            size="sm"
                            isOnline={isConnected}
                            showStatus={false}
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {/* Live typing indicator */}
              {typingUsers.size > 0 && (
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 italic animate-pulse">
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-brand-600 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-brand-600 rounded-full animate-bounce delay-150" />
                    <span className="w-1.5 h-1.5 bg-brand-600 rounded-full animate-bounce delay-300" />
                  </span>
                  <span>
                    {Array.from(typingUsers.values()).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                  </span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Floating Scroll-To-Bottom Button */}
            {showScrollToBottom && (
              <button
                type="button"
                onClick={() => scrollToBottom(true)}
                className="absolute right-6 bottom-24 z-20 p-2.5 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-xl border border-slate-200 dark:border-slate-700 hover:scale-105 active:scale-95 transition-all flex items-center gap-1"
                title="Scroll to bottom"
              >
                <ChevronDown className="w-4 h-4" />
                {unreadWhileScrolled > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-brand-600 text-white">
                    {unreadWhileScrolled}
                  </span>
                )}
              </button>
            )}

            {/* COMPOSER / INPUT SECTION */}
            <div className="relative p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
              {/* Replying Banner */}
              {replyingTo && (
                <div className="mb-2 px-3 py-2.5 rounded-xl bg-brand-50/90 dark:bg-brand-950/50 border border-brand-200/90 dark:border-brand-800/90 flex items-center justify-between text-xs animate-in fade-in slide-in-from-bottom-2 duration-150">
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
                    onClick={handleCancelReply}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
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
                    onClick={handleCancelEdit}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
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
                        alt="Preview"
                        className="w-12 h-12 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                      />
                    ) : (
                      <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                        {renderFileTypeIcon(selectedFile.fileType)}
                      </div>
                    )}
                    <div className="min-w-0 text-left">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {formatFileSize(selectedFile.size)} • {selectedFile.fileType.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveSelectedFile}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                    title="Remove file"
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
                      onClick={() => setShowEmojiPicker(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
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
                        className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors shrink-0 flex items-center gap-1 ${
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
                        onClick={() => handleInsertEmoji(emoji)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-lg hover:bg-slate-100 dark:hover:bg-slate-750 hover:scale-125 transition-transform active:scale-90"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Composer Input Form */}
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                {/* Attachment Popover & Pin Button */}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    id="btn-toggle-attachment-menu"
                    aria-expanded={showAttachmentMenu}
                    aria-haspopup="menu"
                    onClick={() => {
                      setShowAttachmentMenu((prev) => !prev);
                      setShowEmojiPicker(false);
                    }}
                    className={`p-2.5 rounded-full transition-all shrink-0 ${
                      showAttachmentMenu || selectedFile
                        ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/70 dark:text-brand-400 ring-2 ring-brand-500/20'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title="Attach Photos, Documents, or Files"
                  >
                    <Paperclip className={`w-5 h-5 transition-transform duration-200 ${showAttachmentMenu ? 'rotate-45 text-brand-600 dark:text-brand-400' : ''}`} />
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
                          onClick={() => setShowAttachmentMenu(false)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-md"
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
                          className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 text-left transition-colors group focus:outline-none focus:bg-slate-100 dark:focus:bg-slate-800"
                        >
                          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                              Upload Photos &amp; Images
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                              PNG, JPG, WEBP (up to 15MB)
                            </p>
                          </div>
                        </button>

                        {/* 2. Upload PDF & Documents */}
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => openFilePicker('documents')}
                          className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 text-left transition-colors group focus:outline-none focus:bg-slate-100 dark:focus:bg-slate-800"
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
                          className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 text-left transition-colors group focus:outline-none focus:bg-slate-100 dark:focus:bg-slate-800"
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
                          onClick={handleStartCamera}
                          className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 text-left transition-colors group focus:outline-none focus:bg-slate-100 dark:focus:bg-slate-800"
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

                {/* Emoji button */}
                <button
                  type="button"
                  id="btn-toggle-emoji"
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                  className={`p-2.5 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 ${
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
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    placeholder={
                      editingMessage
                        ? 'Edit your message...'
                        : selectedFile
                        ? 'Add an optional caption...'
                        : `Message ${activeDetails.title || 'conversation'}...`
                    }
                    maxLength={2000}
                    className="w-full py-2.5 px-4 text-xs sm:text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 rounded-full border border-slate-200 dark:border-slate-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none resize-none leading-relaxed transition-all max-h-32 min-h-[42px]"
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
                  disabled={(!messageInput.trim() && !selectedFile) || sending}
                  className="p-2.5 sm:px-4 sm:py-2.5 rounded-full sm:rounded-xl bg-brand-600 hover:bg-brand-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-semibold transition-all shadow-xs flex items-center justify-center gap-1.5 shrink-0"
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
          </>
        ) : (
          /* Empty Workspace Messenger State */
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 bg-slate-50/60 dark:bg-slate-950">
            <div className="w-16 h-16 rounded-3xl bg-brand-500/10 flex items-center justify-center text-brand-600 dark:text-brand-400 mb-4 shadow-sm">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
              Workspace Messenger
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-6">
              Connect with students, mentors, coordinators, and enterprise partners in real time.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  fetchContacts();
                  setShowNewChatModal(true);
                }}
                size="sm"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                New Direct Message
              </Button>
              {canCreateGroup && (
                <Button
                  variant="outline"
                  onClick={() => {
                    fetchContacts();
                    setShowNewGroupModal(true);
                  }}
                  size="sm"
                >
                  <Users className="w-4 h-4 mr-1.5" />
                  Create Channel
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Fullscreen Image Preview Lightbox */}
      {previewImageModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-4xl flex items-center justify-between pb-3 text-white">
            <div className="flex items-center gap-2 truncate">
              <ImageIcon className="w-5 h-5 text-brand-400" />
              <span className="font-semibold text-sm truncate">{previewImageModal.fileName}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDownloadFile(previewImageModal.fileKey, previewImageModal.fileName)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Download image"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewImageModal(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="max-h-[82vh] max-w-full overflow-hidden flex items-center justify-center rounded-2xl">
            <img
              src={previewImageModal.url}
              alt={previewImageModal.fileName}
              className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* MODAL: Delete Message Confirmation */}
      {deleteModal && (
        <Modal
          isOpen={Boolean(deleteModal)}
          onClose={() => setDeleteModal(null)}
          title="Delete Message"
          description="Are you sure you want to delete this message?"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {deleteModal.isSender
                ? 'You can delete this message for everyone or delete it only from your view.'
                : 'This will delete the message from your chat history.'}
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteModal(null)}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteMessageConfirm(deleteModal.messageId, 'me')}
              >
                Delete for Me
              </Button>
              {deleteModal.isSender && (
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => handleDeleteMessageConfirm(deleteModal.messageId, 'everyone')}
                >
                  Delete for Everyone
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: Forward Message */}
      {forwardModal && (
        <Modal
          isOpen={Boolean(forwardModal)}
          onClose={() => setForwardModal(null)}
          title="Forward Message"
          description="Select conversations to forward this message to."
        >
          <div className="space-y-4">
            {/* Message snippet preview */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
              <span className="font-semibold text-slate-500">Forwarding:</span>
              <p className="italic text-slate-700 dark:text-slate-300 mt-1 line-clamp-2">
                {forwardModal.content || (forwardModal.attachments?.length > 0 ? `📎 ${forwardModal.attachments[0].fileName}` : 'Attachment')}
              </p>
            </div>

            {/* List of eligible conversations */}
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-1">
              {conversations.map((conv) => {
                const details = getConversationDetails(conv);
                const isSelected = selectedForwardConvs.includes(conv._id);
                return (
                  <label
                    key={conv._id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                      isSelected ? 'bg-brand-50 dark:bg-brand-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        setSelectedForwardConvs((prev) =>
                          isSelected ? prev.filter((id) => id !== conv._id) : [...prev, conv._id]
                        );
                      }}
                      className="rounded-sm border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <UserAvatar
                      sender={details.partner}
                      name={details.title}
                      size="xs"
                      isOnline={details.isOnline}
                      showStatus={false}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {details.title}
                      </p>
                      <p className="text-[10px] text-slate-400 capitalize">
                        {conv.type === CONVERSATION_TYPES.GROUP ? 'Group channel' : 'Direct message'}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setForwardModal(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleForwardMessage}
                disabled={selectedForwardConvs.length === 0 || forwarding}
              >
                {forwarding ? 'Forwarding...' : `Forward (${selectedForwardConvs.length})`}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 1: New Direct Chat Contacts Selector */}
      <Modal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        title="Start Direct Message"
        description="Select a permitted contact from your directory to start a 1:1 conversation."
      >
        <div className="space-y-4">
          <Input
            placeholder="Search contacts by name or department..."
            value={contactSearch}
            onChange={(e) => setContactSearch(e.target.value)}
          />

          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl">
            {loadingContacts ? (
              <div className="p-6 text-center text-xs text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-brand-500" />
                Loading contacts...
              </div>
            ) : contacts.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No permitted contacts found.
              </div>
            ) : (
              contacts
                .filter((c) =>
                  c.name.toLowerCase().includes(contactSearch.toLowerCase())
                )
                .map((contact) => {
                  const online = isUserOnline(contact._id);
                  return (
                    <button
                      key={contact._id}
                      type="button"
                      onClick={() => startDirectChat(contact)}
                      className="w-full p-3 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          user={contact}
                          name={contact.name}
                          size="sm"
                          isOnline={online}
                          showStatus={true}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                            {contact.name}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {contact.role === 'company' ? 'Company Partner' : contact.role}
                            {contact.profile?.companyDetails?.companyName
                              ? ` • ${contact.profile.companyDetails.companyName}`
                              : contact.profile?.department
                              ? ` • ${contact.profile.department}`
                              : ''}
                          </p>
                        </div>
                      </div>

                      <span className="text-[10px] text-slate-400 font-medium px-2 py-0.5 rounded-sm bg-slate-100 dark:bg-slate-800">
                        {online ? 'Active' : formatLastSeen(contact.lastSeen)}
                      </span>
                    </button>
                  );
                })
            )}
          </div>
        </div>
      </Modal>

      {/* MODAL 2: Create Group Conversation */}
      <Modal
        isOpen={showNewGroupModal}
        onClose={() => setShowNewGroupModal(false)}
        title="Create Group Conversation"
        description="Assemble coordinators, mentors, and students into an authorized cohort group."
      >
        <form onSubmit={handleCreateGroup} className="space-y-4">
          <Input
            label="Group Name"
            placeholder="e.g. Summer 2026 Interns Cohort"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            required
            maxLength={100}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={groupDesc}
              onChange={(e) => setGroupDesc(e.target.value)}
              placeholder="Brief purpose of this group conversation..."
              maxLength={300}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-brand-500 text-slate-900 dark:text-white outline-hidden"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Select Members ({selectedParticipants.length} selected)
              </label>
              {contacts.length > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedParticipants(contacts.map((c) => c._id))}
                    className="text-brand-600 dark:text-brand-400 hover:underline text-[11px] font-medium"
                  >
                    Select All ({contacts.length})
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <button
                    type="button"
                    onClick={() => setSelectedParticipants([])}
                    className="text-slate-500 hover:underline text-[11px]"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-2 space-y-1">
              {filteredModalContacts.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  <p>No members found.</p>
                </div>
              ) : (
                filteredModalContacts.map((contact) => {
                  const checked = selectedParticipants.includes(contact._id);
                  return (
                    <label
                      key={contact._id}
                      className={`flex items-center gap-3 p-2 rounded-lg transition-colors cursor-pointer ${
                        checked ? 'bg-brand-50/70 dark:bg-brand-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setSelectedParticipants((prev) =>
                            checked ? prev.filter((id) => id !== contact._id) : [...prev, contact._id]
                          );
                        }}
                        className="rounded-sm border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      <UserAvatar
                        sender={contact}
                        name={contact.name}
                        size="xs"
                        isOnline={contact.isOnline}
                        showStatus={false}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-900 dark:text-white truncate">
                          {contact.name}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {contact.email} • <span className="capitalize font-semibold text-slate-500 dark:text-slate-400">{contact.role}</span>
                        </p>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setShowNewGroupModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!groupName.trim() || creatingGroup}
            >
              {creatingGroup ? 'Creating Group...' : 'Create Group'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Group Details & Member Management */}
      <Modal
        isOpen={showGroupInfoModal}
        onClose={() => setShowGroupInfoModal(false)}
        title={activeConversation?.name || 'Group Information'}
        description="Inspect group participants, role assignments, and member permissions."
      >
        <div className="space-y-4">
          {isGroupAdmin ? (
            <div className="space-y-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <Input
                label="Group Name"
                value={editGroupName}
                onChange={(e) => setEditGroupName(e.target.value)}
              />
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editGroupDesc}
                  onChange={(e) => setEditGroupDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-brand-500 text-slate-900 dark:text-white outline-hidden"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleUpdateGroupDetails}
                disabled={savingGroup}
              >
                {savingGroup ? 'Saving...' : 'Save Group Changes'}
              </Button>
            </div>
          ) : (
            <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeConversation?.description || 'No description provided.'}
              </p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                Members ({activeConversation?.participants?.length || 0})
              </h3>
              {isGroupAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    fetchContacts();
                    setShowAddMembersModal(true);
                  }}
                  className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add Member
                </button>
              )}
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl">
              {(activeConversation?.participants || []).map((member) => {
                const memberId = (member._id || member).toString();
                const isMemberAdmin =
                  activeConversation.creator?._id === memberId ||
                  activeConversation.creator === memberId ||
                  (activeConversation.groupAdmins || []).some(
                    (a) => (a._id || a).toString() === memberId
                  );
                const online = isUserOnline(memberId);

                return (
                  <div
                    key={memberId}
                    className="p-3 flex items-center justify-between gap-3 text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <UserAvatar
                        sender={member}
                        name={member.name}
                        size="sm"
                        isOnline={online}
                        showStatus={true}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {member.name || 'Unknown User'} {memberId === currentUserId ? '(You)' : ''}
                        </p>
                        <p className="text-[10px] text-slate-400 capitalize">
                          {member.role || 'Member'} {isMemberAdmin ? '• Group Admin' : ''}
                        </p>
                      </div>
                    </div>

                    {isGroupAdmin && memberId !== currentUserId && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(memberId)}
                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                        title="Remove member"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>

      {/* MODAL 4: Add Members to Group */}
      <Modal
        isOpen={showAddMembersModal}
        onClose={() => setShowAddMembersModal(false)}
        title="Add Group Members"
        description="Select contacts to add to this active conversation group."
      >
        <div className="space-y-4">
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-2 space-y-1">
            {contacts
              .filter(
                (c) =>
                  !(activeConversation?.participants || []).some(
                    (p) => (p._id || p).toString() === c._id.toString()
                  )
              )
              .map((contact) => {
                const checked = selectedAddMembers.includes(contact._id);
                return (
                  <label
                    key={contact._id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setSelectedAddMembers((prev) =>
                          checked ? prev.filter((id) => id !== contact._id) : [...prev, contact._id]
                        );
                      }}
                      className="rounded-sm border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-900 dark:text-white truncate">
                        {contact.name}
                      </p>
                      <p className="text-[10px] text-slate-400 capitalize">{contact.role}</p>
                    </div>
                  </label>
                );
              })}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setShowAddMembersModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMembersToGroup}
              disabled={selectedAddMembers.length === 0}
            >
              Add Selected ({selectedAddMembers.length})
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: Camera Capture */}
      {showCameraModal && (
        <Modal
          isOpen={showCameraModal}
          onClose={handleCloseCamera}
          title={capturedPhoto ? 'Photo Preview' : 'Take Photo'}
          description={
            capturedPhoto
              ? 'Review your photo before attaching it to the conversation.'
              : 'Align your subject within the frame and capture.'
          }
          size="lg"
        >
          <div className="space-y-4">
            {cameraError ? (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-start gap-3 text-red-700 dark:text-red-300">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold">Camera Access Unavailable</p>
                  <p>{cameraError}</p>
                </div>
              </div>
            ) : (
              <div className="relative w-full aspect-video sm:aspect-4/3 bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-slate-700 shadow-inner">
                {capturedPhoto ? (
                  <img
                    src={capturedPhoto}
                    alt="Captured"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                )}

                {!capturedPhoto && !cameraError && (
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-xs text-white text-[11px] font-medium flex items-center gap-1.5 pointer-events-none">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Live Camera
                  </div>
                )}
              </div>
            )}

            {/* Camera Actions */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={handleCloseCamera}
              >
                Cancel
              </Button>

              <div className="flex items-center gap-2">
                {cameraError ? (
                  <Button
                    size="sm"
                    type="button"
                    onClick={() => {
                      handleCloseCamera();
                      openFilePicker('images');
                    }}
                    className="bg-brand-600 hover:bg-brand-500 text-white"
                  >
                    Upload Image Instead
                  </Button>
                ) : capturedPhoto ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={handleRetakePhoto}
                      className="flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Retake
                    </Button>
                    <Button
                      size="sm"
                      type="button"
                      onClick={handleConfirmPhoto}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      Attach Photo
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    type="button"
                    onClick={handleCapturePhoto}
                    className="bg-brand-600 hover:bg-brand-500 text-white flex items-center gap-1.5"
                  >
                    <Camera className="w-4 h-4" />
                    Capture Photo
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ChatPage;
