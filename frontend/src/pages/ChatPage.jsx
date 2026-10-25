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
  Film,
  PanelRight,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import chatService, { CONVERSATION_TYPES, getAttachmentUrl } from '../services/chatService';
import ConversationSidebar from '../components/chat/ConversationSidebar';
import ChatHeader from '../components/chat/ChatHeader';
import InChatSearchBar from '../components/chat/InChatSearchBar';
import PinnedMessageBanner from '../components/chat/PinnedMessageBanner';
import MessageList from '../components/chat/MessageList';
import MessageComposer from '../components/chat/MessageComposer';
import ConversationDetailsDrawer from '../components/chat/ConversationDetailsDrawer';
import EmptyChatState from '../components/chat/EmptyChatState';
import ChatMediaAttachment from '../components/chat/ChatMediaAttachment';
import MessageInfoModal from '../components/chat/MessageInfoModal';
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
    case 'video':
      return <Film className="w-5 h-5 text-purple-500" />;
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
  const [selectedMessageForInfo, setSelectedMessageForInfo] = useState(null);
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
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);

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
    const handleReadUpdate = ({ conversationId, userId, readAt, user: incomingUser }) => {
      const activeId = (activeConversation?._id || '').toString();
      const incId = (conversationId || '').toString();
      const readTimestamp = readAt || new Date().toISOString();

      if (activeId && incId && activeId === incId) {
        // Find user profile from activeConversation.participants if incomingUser is not provided
        const participant =
          incomingUser ||
          (activeConversation?.participants || []).find(
            (p) => (p._id || p).toString() === (userId || '').toString()
          );

        const readEntry = participant
          ? {
              _id: (participant._id || userId).toString(),
              name: participant.name,
              role: participant.role,
              profile: participant.profile,
              readAt: readTimestamp,
            }
          : { _id: userId, readAt: readTimestamp };

        setMessages((prev) =>
          prev.map((m) => {
            const readByList = (m.readBy || []).map((id) => (id._id || id).toString());
            const uidStr = (userId || '').toString();
            if (uidStr && !readByList.includes(uidStr)) {
              return { ...m, readBy: [...(m.readBy || []), readEntry], status: 'read' };
            }
            return m;
          })
        );
      }

      // Also update conversations list read receipts for real-time sidebar tick update
      setConversations((prev) =>
        prev.map((c) => {
          if ((c._id || '').toString() === incId) {
            const receipts = [...(c.readReceipts || [])];
            const idx = receipts.findIndex(
              (r) => (r.user?._id || r.user || '').toString() === (userId || '').toString()
            );
            if (idx >= 0) {
              receipts[idx] = { ...receipts[idx], lastReadAt: readTimestamp };
            } else {
              receipts.push({ user: userId, lastReadAt: readTimestamp });
            }
            return { ...c, readReceipts: receipts };
          }
          return c;
        })
      );
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
    const allowed = [
      '.pdf', '.png', '.jpg', '.jpeg', '.webp',
      '.mp4', '.webm', '.mov', '.mkv',
      '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
      '.txt', '.csv', '.zip'
    ];
    if (!allowed.includes(ext)) {
      setErrorBanner(`File format '${ext}' is not supported. Allowed formats: Images, Videos, PDF, Word, Excel, PowerPoint, Text, CSV, Zip.`);
      return;
    }

    let fileType = 'other';
    if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext) || (file.type && file.type.startsWith('image/'))) {
      fileType = 'image';
    } else if (['.mp4', '.webm', '.mov', '.mkv'].includes(ext) || (file.type && file.type.startsWith('video/'))) {
      fileType = 'video';
    } else if (ext === '.pdf') {
      fileType = 'pdf';
    } else if (['.doc', '.docx'].includes(ext)) {
      fileType = 'document';
    } else if (['.xls', '.xlsx', '.csv'].includes(ext)) {
      fileType = 'spreadsheet';
    } else if (['.ppt', '.pptx'].includes(ext)) {
      fileType = 'presentation';
    }

    if (selectedFile?.previewUrl) {
      URL.revokeObjectURL(selectedFile.previewUrl);
    }

    const previewUrl = ['image', 'video'].includes(fileType) ? URL.createObjectURL(file) : null;
    setSelectedFile({
      file,
      previewUrl,
      name: file.name,
      size: file.size,
      fileType,
      mimeType: file.type || (fileType === 'image' ? 'image/jpeg' : fileType === 'video' ? 'video/mp4' : 'application/octet-stream'),
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

    let accept = '.pdf,.png,.jpg,.jpeg,.webp,.mp4,.webm,.mov,.mkv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip';
    if (filterType === 'images') {
      accept = 'image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime,.png,.jpg,.jpeg,.webp,.mp4,.webm,.mov,.mkv';
    } else if (filterType === 'documents') {
      accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv,application/zip';
    } else if (filterType === 'all') {
      accept = '.pdf,.png,.jpg,.jpeg,.webp,.mp4,.webm,.mov,.mkv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip';
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
      <ConversationSidebar
        conversations={conversations}
        activeConversation={activeConversation}
        onSelectConversation={selectConversation}
        searchQuery={searchQuery}
        onChangeSearch={setSearchQuery}
        filterType={filterType}
        onChangeFilter={setFilterType}
        loadingConversations={loadingConversations}
        filteredCompanyMembers={filteredCompanyMembers}
        isUserOnline={isUserOnline}
        onStartOrOpenChat={handleStartOrOpenChat}
        onNewDirectChat={() => {
          fetchContacts();
          setShowNewChatModal(true);
        }}
        onNewGroupChat={() => {
          fetchContacts();
          setShowNewGroupModal(true);
        }}
        canCreateGroup={canCreateGroup}
        formatMessageTime={formatMessageTime}
        formatLastSeen={formatLastSeen}
        currentUserId={currentUserId}
        mobileShowChat={mobileShowChat}
        isConnected={isConnected}
      />

      {/* RIGHT MAIN PANEL: Active Conversation */}
      <div
        className={`${
          !mobileShowChat ? 'hidden md:flex' : 'flex'
        } flex-1 flex-col h-full bg-slate-100/60 dark:bg-slate-950 overflow-hidden relative`}
      >
        {activeConversation ? (
          <>
            {/* Active Conversation Top Header */}
            <ChatHeader
              conversation={activeConversation}
              details={activeDetails}
              typingUsers={typingUsers}
              showInChatSearch={showInChatSearch}
              onToggleSearch={() => {
                setShowInChatSearch((prev) => {
                  const next = !prev;
                  if (!next) {
                    handleCloseSearch();
                  }
                  return next;
                });
              }}
              showDetailsDrawer={showDetailsDrawer}
              onToggleDetails={() => setShowDetailsDrawer((prev) => !prev)}
              pushPermission={pushPermission}
              onBackMobile={() => setMobileShowChat(false)}
              onOpenGroupInfo={() => setShowGroupInfoModal(true)}
              formatLastSeen={formatLastSeen}
            />

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
            <PinnedMessageBanner
              pinnedData={pinnedData}
              onJumpToMessage={handleJumpToMessage}
              onUnpin={handleUnpinCurrentMessage}
              isUnpinning={pinningMessageId === 'unpinning'}
            />

            {/* In-Chat Search Bar & Results Drawer */}
            <InChatSearchBar
              isOpen={showInChatSearch}
              query={inChatSearchQuery}
              onChangeQuery={(val) => {
                setInChatSearchQuery(val);
                setSearchPage(1);
              }}
              onClose={handleCloseSearch}
              loading={searchLoading}
              error={searchError}
              results={searchResults}
              pagination={searchPagination}
              onPrevPage={() => setSearchPage((p) => Math.max(1, p - 1))}
              onNextPage={() => setSearchPage((p) => p + 1)}
              onSelectResult={handleJumpToMessage}
              onRetry={() => executeMessageSearch(inChatSearchQuery, searchPage)}
              jumpingMessageId={jumpingMessageId}
              formatSearchDate={formatSearchDate}
            />

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

            {/* MESSAGES SCROLL CONTAINER & TIMELINE */}
            <MessageList
              messages={displayedMessages}
              loadingMessages={loadingMessages}
              currentUserId={currentUserId}
              activeConversation={activeConversation}
              activeDetails={activeDetails}
              pinnedData={pinnedData}
              typingUsers={typingUsers}
              messagesContainerRef={messagesContainerRef}
              messagesEndRef={messagesEndRef}
              onScroll={handleScroll}
              showScrollToBottom={showScrollToBottom}
              unreadWhileScrolled={unreadWhileScrolled}
              onScrollToBottom={scrollToBottom}
              activeReactionMsgId={activeReactionMsgId}
              showMoreReactionMsgId={showMoreReactionMsgId}
              activeActionsMsgId={activeActionsMsgId}
              pinningMessageId={pinningMessageId}
              reactionPickerRef={reactionPickerRef}
              moreReactionPickerRef={moreReactionPickerRef}
              actionsMenuRef={actionsMenuRef}
              onStartReply={handleStartReply}
              onToggleReactionPicker={(msgId) =>
                setActiveReactionMsgId(activeReactionMsgId === msgId ? null : msgId)
              }
              onToggleMoreReactions={(msgId) =>
                setShowMoreReactionMsgId(showMoreReactionMsgId === msgId ? null : msgId)
              }
              onToggleActionsMenu={(msgId) =>
                setActiveActionsMsgId(activeActionsMsgId === msgId ? null : msgId)
              }
              onToggleReaction={handleToggleReaction}
              onCopyMessage={handleCopyMessage}
              onForwardMessage={(msg) => {
                setForwardModal(msg);
                setSelectedForwardConvs([]);
                setActiveActionsMsgId(null);
              }}
              onTogglePin={handleTogglePinMessage}
              onStartEdit={handleStartEdit}
              onDeleteMessage={(msg, isSender) => {
                setDeleteModal({ messageId: msg._id, isSender });
                setActiveActionsMsgId(null);
              }}
              onJumpToMessage={handleJumpToMessage}
              onPreviewMedia={(previewData) => setPreviewImageModal(previewData)}
              onDownloadFile={handleDownloadFile}
              formatMessageTime={formatMessageTime}
              onOpenMessageInfo={(msg) => setSelectedMessageForInfo(msg)}
            />

            {/* COMPOSER / INPUT SECTION */}
            <MessageComposer
              messageInput={messageInput}
              onChangeInput={handleInputChange}
              onSendMessage={handleSendMessage}
              sending={sending}
              replyingTo={replyingTo}
              onCancelReply={handleCancelReply}
              editingMessage={editingMessage}
              onCancelEdit={handleCancelEdit}
              selectedFile={selectedFile}
              onRemoveSelectedFile={handleRemoveSelectedFile}
              showAttachmentMenu={showAttachmentMenu}
              onToggleAttachmentMenu={() => {
                setShowAttachmentMenu((prev) => !prev);
                setShowEmojiPicker(false);
              }}
              attachmentMenuRef={attachmentMenuRef}
              openFilePicker={openFilePicker}
              onStartCamera={handleStartCamera}
              showEmojiPicker={showEmojiPicker}
              onToggleEmojiPicker={() => setShowEmojiPicker((prev) => !prev)}
              emojiPickerRef={emojiPickerRef}
              activeEmojiCategory={activeEmojiCategory}
              setActiveEmojiCategory={setActiveEmojiCategory}
              onInsertEmoji={handleInsertEmoji}
              messageInputRef={messageInputRef}
              activeTitle={activeDetails.title || 'conversation'}
            />
          </>
        ) : (
          /* Empty Workspace Messenger State */
          <EmptyChatState
            onNewDirectChat={() => {
              fetchContacts();
              setShowNewChatModal(true);
            }}
            onNewGroupChat={() => {
              fetchContacts();
              setShowNewGroupModal(true);
            }}
            canCreateGroup={canCreateGroup}
          />
        )}
      </div>

      {/* CONVERSATION DETAILS & SHARED CONTENT DRAWER */}
      {activeConversation && (
        <ConversationDetailsDrawer
          isOpen={showDetailsDrawer}
          onClose={() => setShowDetailsDrawer(false)}
          conversation={activeConversation}
          conversationDetails={activeDetails}
          currentUserId={user?._id}
          onJumpToMessage={handleJumpToMessage}
          onDownloadFile={handleDownloadFile}
        />
      )}

      {/* MODAL: Message Info (List of people who seen message in group chat & delivery status) */}
      {selectedMessageForInfo && (
        <MessageInfoModal
          isOpen={Boolean(selectedMessageForInfo)}
          onClose={() => setSelectedMessageForInfo(null)}
          message={selectedMessageForInfo}
          conversation={activeConversation}
          currentUserId={currentUserId}
          formatMessageTime={formatMessageTime}
        />
      )}

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
              src={getAttachmentUrl(previewImageModal.url)}
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
