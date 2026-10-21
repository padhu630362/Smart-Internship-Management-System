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
  Info,
  UserPlus,
  UserMinus,
  Edit3,
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
  Smile,
  SmilePlus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import chatService, { CONVERSATION_TYPES } from '../services/chatService';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import StatusBadge from '../components/common/StatusBadge';
import UserAvatar from '../components/common/UserAvatar';

// Standard quick reaction emojis (like WhatsApp / image 2)
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

export const ChatPage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlConversationId = searchParams.get('conversationId');

  const {
    socket,
    isConnected,
    isUserOnline,
    joinConversation,
    leaveConversation,
    sendTyping,
    setActiveChatConversationId,
    markConversationNotificationsRead,
  } = useSocket();

  // State
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
  const [simulatingReply, setSimulatingReply] = useState(false);

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

  const emojiPickerRef = useRef(null);
  const reactionPickerRef = useRef(null);
  const moreReactionPickerRef = useRef(null);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messageInputRef = useRef(null);

  // Close emoji & reaction pickers on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
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
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const currentUserId = user?.id || user?._id?.toString();
  const canCreateGroup = ['admin', 'coordinator', 'mentor', 'company'].includes(user?.role);

  // Auto-scroll to bottom of messages container ONLY without scrolling the browser window
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
        const res = await chatService.getMessages(convId, { limit: 50 });
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

  // Initial load: Fetch conversations and permitted company/contact directory
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

      // Sync URL parameter seamlessly
      setSearchParams({ conversationId: conv._id }, { replace: true });

      joinConversation(conv._id);
      fetchMessages(conv._id);

      // Always mark as read to clear any notifications and update badges
      markAsRead(conv._id);
    },
    [activeConversation, joinConversation, leaveConversation, fetchMessages, markAsRead, setSearchParams]
  );

  // Synchronize active conversation with SocketContext to suppress popup toasts for currently active chat
  useEffect(() => {
    setActiveChatConversationId(activeConversation?._id || null);
    return () => {
      setActiveChatConversationId(null);
    };
  }, [activeConversation, setActiveChatConversationId]);

  // Handle URL conversationId auto-selection (from direct links or real-time popup toasts)
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

  // Automatically ensure active conversation room is joined whenever connected or active conversation changes
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
        setTimeout(() => scrollToBottom(true), 50);
        markAsRead(activeId);
      }
    };

    // Receive message notification across all conversations
    const handleNewMessageAlert = ({ conversationId, message }) => {
      const activeId = (activeConversation?._id || '').toString();
      const incId = (conversationId || '').toString();
      const isCurrent = Boolean(activeId && incId && activeId === incId);

      // Fallback: If this message belongs to the open chat, append it immediately
      if (isCurrent && message) {
        setMessages((prev) => {
          const msgId = (message._id || message.id || '').toString();
          if (prev.some((m) => (m._id || m.id || '').toString() === msgId)) return prev;
          return [...prev, message];
        });
        setTimeout(() => scrollToBottom(true), 50);
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

    // Conversation metadata updated (name, participants)
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

    socket.on('chat:message', handleChatMessage);
    socket.on('chat:new_message', handleNewMessageAlert);
    socket.on('chat:message_reaction', handleChatMessageReaction);
    socket.on('conversation:updated', handleConversationUpdated);
    socket.on('chat:read_update', handleReadUpdate);
    socket.on('chat:typing', handleTyping);

    return () => {
      socket.off('chat:message', handleChatMessage);
      socket.off('chat:new_message', handleNewMessageAlert);
      socket.off('chat:message_reaction', handleChatMessageReaction);
      socket.off('conversation:updated', handleConversationUpdated);
      socket.off('chat:read_update', handleReadUpdate);
      socket.off('chat:typing', handleTyping);
    };
  }, [
    socket,
    activeConversation,
    currentUserId,
    scrollToBottom,
    markAsRead,
    fetchConversations,
    user,
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

  // Send message
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!messageInput.trim() || !activeConversation || sending) return;

    const trimmed = messageInput.trim();
    if (trimmed.length > 2000) {
      setErrorBanner('Message length exceeds the 2000 character maximum limit.');
      return;
    }

    try {
      setSending(true);
      setErrorBanner('');
      sendTyping(activeConversation._id, false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      setMessageInput('');
      const res = await chatService.sendMessage(activeConversation._id, trimmed);

      if (res?.data?.message) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === res.data.message._id)) return prev;
          return [...prev, res.data.message];
        });
        setTimeout(() => scrollToBottom(true), 50);
      }
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.message || 'Failed to send message.';
      setErrorBanner(msg);
      // Restore input text on failure so user doesn't lose text
      setMessageInput(trimmed);
    } finally {
      setSending(false);
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

      // Call backend API
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

  // Simulate colleague live reply for real-time testing
  const handleSimulateReply = async () => {
    if (!activeConversation || simulatingReply) return;
    try {
      setSimulatingReply(true);
      await chatService.simulateReply(activeConversation._id);
    } catch (err) {
      console.error('Failed to simulate reply:', err);
      setErrorBanner('Failed to trigger simulated reply: ' + (err?.response?.data?.error?.message || err?.message));
    } finally {
      setTimeout(() => setSimulatingReply(false), 2000);
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

  // Start or open existing direct chat with company member or contact
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

  // Group Details helpers
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

  // Helper: Format message time
  const formatMessageTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Helper: Conversation display title & partner
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
      subtitle: partner?.role ? `${partner.role.charAt(0).toUpperCase() + partner.role.slice(1)} • ${isOnline ? 'Active Now' : 'Offline'}` : (isOnline ? 'Active Now' : 'Offline'),
      partner,
      isOnline,
    };
  };

  // Permitted company representatives and mentors directory
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

  // Filter company members based on search
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

  // Filter contacts for group creation modal
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

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    if (filterType === 'direct' && c.type !== CONVERSATION_TYPES.DIRECT) return false;
    if (filterType === 'group' && c.type !== CONVERSATION_TYPES.GROUP) return false;
    if (filterType === 'company') return false; // Handled by dedicated company directory section
    if (!searchQuery.trim()) return true;

    const details = getConversationDetails(c);
    const q = searchQuery.toLowerCase();
    return (
      details.title.toLowerCase().includes(q) ||
      (c.lastMessage?.content || '').toLowerCase().includes(q)
    );
  });

  const activeDetails = getConversationDetails(activeConversation);

  // Render a sleek, professional Corporate Workplace Member / Contact Row
  const renderMemberRow = (member) => {
    const isOnline = isUserOnline(member._id);
    const companyName =
      member.profile?.companyDetails?.companyName ||
      member.profile?.department ||
      (member.role === 'company'
        ? 'Company Partner'
        : member.role === 'mentor'
        ? 'Academic Mentor'
        : member.role === 'coordinator'
        ? 'Coordinator'
        : member.role === 'admin'
        ? 'System Admin'
        : 'Partner Organization');

    const isChatActive =
      activeConversation?.type === CONVERSATION_TYPES.DIRECT &&
      (activeConversation.participants || []).some(
        (p) => (p._id || p).toString() === member._id.toString()
      );

    return (
      <div
        key={member._id}
        onClick={() => handleStartOrOpenChat(member)}
        className={`w-full px-3.5 py-3 flex items-center gap-3 text-left transition-colors cursor-pointer border-b border-slate-100 dark:border-slate-800/40 group relative ${
          isChatActive
            ? 'bg-brand-50/80 dark:bg-brand-950/40 border-l-4 border-brand-600 dark:border-brand-500'
            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
        }`}
      >
        {/* Avatar with Status indicator */}
        <UserAvatar
          user={member}
          name={member.name}
          size="md"
          isOnline={isOnline}
          showStatus={true}
        />

        {/* Member Details in Corporate Layout */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                {member.name}
              </span>
              <span
                className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm shrink-0 ${
                  member.role === 'company'
                    ? 'bg-brand-50 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800/40'
                    : member.role === 'mentor'
                    ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40'
                    : member.role === 'coordinator'
                    ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40'
                    : 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40'
                }`}
              >
                {member.role === 'company' ? 'Enterprise' : member.role}
              </span>
            </div>

            <span
              className={`text-[10px] font-medium shrink-0 flex items-center gap-1 ${
                isOnline ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              />
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
              <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">{companyName}</span>
              {member.email && (
                <>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <span className="truncate text-slate-400 select-all">{member.email}</span>
                </>
              )}
            </p>

            {/* Quick action text on hover */}
            <div className="shrink-0 flex items-center gap-1">
              <span className="text-[11px] text-brand-600 dark:text-brand-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                <MessageSquare className="w-3.5 h-3.5" />
                Message
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render a Conversation Row in the left sidebar (Corporate Workspace style)
  const renderConversationItem = (conv) => {
    const isSelected = activeConversation?._id === conv._id;
    const details = getConversationDetails(conv);
    const hasUnread = (conv.unreadCount || 0) > 0;

    return (
      <button
        key={conv._id}
        type="button"
        onClick={() => selectConversation(conv)}
        className={`w-full px-3.5 py-3 flex items-center gap-3 text-left transition-colors cursor-pointer border-b border-slate-100 dark:border-slate-800/40 relative ${
          isSelected
            ? 'bg-brand-50/80 dark:bg-brand-950/40 border-l-4 border-brand-600 dark:border-brand-500'
            : 'hover:bg-slate-50 dark:hover:bg-slate-850'
        }`}
      >
        {/* Avatar with Status indicator */}
        {conv.type === CONVERSATION_TYPES.GROUP ? (
          <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center font-semibold text-xs shadow-xs shrink-0">
            <Users className="w-5 h-5" />
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

        {/* Conversation preview snippet */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span
              className={`text-sm truncate ${
                hasUnread
                  ? 'font-bold text-slate-900 dark:text-white'
                  : 'font-semibold text-slate-800 dark:text-slate-200'
              }`}
            >
              {details.title}
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0 font-medium">
              {conv.lastMessageAt ? formatMessageTime(conv.lastMessageAt) : ''}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <p
              className={`text-xs truncate flex items-center gap-1 ${
                hasUnread
                  ? 'font-semibold text-slate-900 dark:text-slate-100'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {conv.lastMessage?.content ? (
                <>
                  <CheckCheck className={`w-3.5 h-3.5 shrink-0 ${hasUnread ? 'text-slate-400' : 'text-brand-500'}`} />
                  <span className="truncate">{conv.lastMessage.content}</span>
                </>
              ) : (
                <span className="italic text-slate-400">No messages yet</span>
              )}
            </p>

            {hasUnread && (
              <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold rounded-full bg-brand-600 text-white min-w-5 text-center leading-tight">
                {conv.unreadCount}
              </span>
            )}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="h-full w-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden select-none">
      {/* Top Banner if Socket Disconnected */}
      {!isConnected && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Real-time socket reconnecting... Messages remain safely persisted in MongoDB.</span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="font-medium underline hover:text-amber-800 dark:hover:text-amber-200"
          >
            Retry Now
          </button>
        </div>
      )}

      {/* Main Chat Layout Container */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left Sidebar: Conversations & Contacts Directory (Corporate Workplace Layout) */}
        <div
          className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 h-full overflow-hidden transition-all duration-300 ${
            mobileShowChat ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Sidebar Header (Corporate Workspace style) */}
          <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <UserAvatar
                  user={user}
                  name={user?.name}
                  size="md"
                  isOnline={isConnected}
                  showStatus={true}
                />
                <div>
                  <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                    Workspace Chat
                  </h1>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {conversations.length} active chats • {companyMembers.length} team members
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  id="btn-new-chat"
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
                    id="btn-new-group"
                    onClick={() => {
                      fetchContacts();
                      setShowNewGroupModal(true);
                    }}
                    className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Create Channel / Group"
                  >
                    <Users className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Corporate Search Input */}
            <div className="relative mb-2.5">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search conversations, colleagues, or teams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 focus:border-brand-500 dark:focus:border-brand-500 text-slate-900 dark:text-white placeholder-slate-400 transition-all outline-hidden shadow-2xs"
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

            {/* Corporate Filter Chips */}
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              {[
                { id: 'all', label: 'All' },
                { id: 'direct', label: 'Direct Messages' },
                { id: 'company', label: `Colleagues & Mentors (${companyMembers.length})` },
                { id: 'group', label: 'Channels' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterType(tab.id)}
                  className={`px-3 py-1 text-[11px] rounded-lg whitespace-nowrap transition-colors ${
                    filterType === tab.id
                      ? 'bg-brand-600 text-white font-semibold shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700 font-medium'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation List / Member Directory (Corporate Rows) */}
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/40">
            {loadingConversations && loadingContacts ? (
              <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
                <span>Loading conversations and directory...</span>
              </div>
            ) : filterType === 'company' ? (
              /* DEDICATED COMPANY MEMBERS & MENTORS (Corporate Directory) */
              <div>
                <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-850/80 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Company Members & Mentors ({filteredCompanyMembers.length})
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Click to chat
                  </span>
                </div>

                {filteredCompanyMembers.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                    <Briefcase className="w-7 h-7 text-slate-300 dark:text-slate-600" />
                    <p>No company members found matching your search.</p>
                  </div>
                ) : (
                  filteredCompanyMembers.map(renderMemberRow)
                )}
              </div>
            ) : filterType === 'direct' ? (
              /* DIRECT CHAT SECTION: ACTIVE DIRECT CHATS + COMPANY MEMBERS DIRECTORY */
              <div>
                {/* Active Direct Chats */}
                {filteredConversations.length > 0 && (
                  <div>
                    <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-850/80 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Active Chats ({filteredConversations.length})
                      </span>
                    </div>
                    {filteredConversations.map(renderConversationItem)}
                  </div>
                )}

                {/* Company Members Directory */}
                <div>
                  <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-850/80 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Company Members & Mentors ({filteredCompanyMembers.length})
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Click to chat
                    </span>
                  </div>

                  {filteredCompanyMembers.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      No company members found.
                    </div>
                  ) : (
                    filteredCompanyMembers.map(renderMemberRow)
                  )}
                </div>
              </div>
            ) : filterType === 'all' ? (
              /* ALL CONVERSATIONS LIST (Corporate Messenger) */
              filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-3">
                  <MessageSquare className="w-8 h-8 stroke-1 text-slate-300 dark:text-slate-600" />
                  <p>No active conversations found.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilterType('company')}
                  >
                    Browse Company Members ({companyMembers.length})
                  </Button>
                </div>
              ) : (
                <div>
                  {filteredConversations.map(renderConversationItem)}

                  {/* Quick Shortcut to Company Directory */}
                  {companyMembers.length > 0 && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-850/80 text-center border-t border-slate-100 dark:border-slate-800/40">
                      <button
                        type="button"
                        onClick={() => setFilterType('company')}
                        className="text-[11px] font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 inline-flex items-center gap-1"
                      >
                        <Briefcase className="w-3 h-3" />
                        <span>View Company Members Directory ({companyMembers.length})</span>
                      </button>
                    </div>
                  )}
                </div>
              )
            ) : (
              /* GROUP CONVERSATIONS LIST */
              filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-3">
                  <Users className="w-8 h-8 stroke-1 text-slate-300 dark:text-slate-600" />
                  <p>No group conversations found.</p>
                  {canCreateGroup && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        fetchContacts();
                        setShowNewGroupModal(true);
                      }}
                    >
                      Create a Group
                    </Button>
                  )}
                </div>
              ) : (
                filteredConversations.map(renderConversationItem)
              )
            )}
          </div>
        </div>

        {/* Right Area: Active Message Conversation Stream (Corporate Workplace Styled) */}
        <div
          className={`flex-1 min-w-0 min-h-0 flex flex-col bg-slate-50/70 dark:bg-slate-950 h-full overflow-hidden relative transition-all duration-300 ${
            !mobileShowChat ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeConversation ? (
            <>
              {/* Corporate Chat Header */}
              <div className="px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shadow-2xs shrink-0 select-none">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setMobileShowChat(false)}
                    className="md:hidden p-1.5 -ml-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Back to conversations"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  {/* Clickable Header to Open Contact Info Drawer */}
                  <div
                    onClick={() => setShowContactDetails((prev) => !prev)}
                    className="flex items-center gap-3 cursor-pointer min-w-0 group hover:opacity-95 transition-opacity"
                    title="Click to view Contact & Member Profile"
                  >
                    <div className="relative">
                      {activeConversation.type === CONVERSATION_TYPES.GROUP ? (
                        <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                          <Users className="w-5 h-5" />
                        </div>
                      ) : (
                        <UserAvatar
                          sender={activeDetails.partner}
                          name={activeDetails.title}
                          size="md"
                          isOnline={activeDetails.isOnline}
                          showStatus={true}
                        />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {activeDetails.title}
                        </h2>
                        {activeConversation.type === CONVERSATION_TYPES.GROUP ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                            Channel
                          </span>
                        ) : activeDetails.partner?.role ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {activeDetails.partner.role}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {typingUsers.size > 0 ? (
                          <span className="text-brand-600 dark:text-brand-400 font-medium italic">
                            {Array.from(typingUsers.values()).join(', ')} typing...
                          </span>
                        ) : (
                          <>
                            <span className="flex items-center gap-1 font-medium">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  activeDetails.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'
                                }`}
                              />
                              <span>{activeDetails.isOnline ? 'Active Now' : 'Offline'}</span>
                            </span>
                            {activeDetails.subtitle && activeDetails.subtitle !== 'Offline' && activeDetails.subtitle !== 'Online' && (
                              <>
                                <span>•</span>
                                <span className="truncate">{activeDetails.subtitle}</span>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Controls in Header */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Test Live Exchange Button */}
                  {activeConversation.type === CONVERSATION_TYPES.DIRECT && (
                    <button
                      type="button"
                      disabled={simulatingReply}
                      onClick={handleSimulateReply}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border border-brand-200 dark:border-brand-800 bg-brand-50/70 hover:bg-brand-100 dark:bg-brand-950/60 dark:hover:bg-brand-900 text-brand-700 dark:text-brand-300 shadow-2xs cursor-pointer"
                      title="Trigger simulated live reply from colleague with real-time typing indicator & audio chime"
                    >
                      {simulatingReply ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-600" />
                          <span className="hidden sm:inline">Waiting for reply...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                          <span className="hidden sm:inline">Live Test Exchange</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Contact Info toggle */}
                  <button
                    type="button"
                    onClick={() => setShowContactDetails((prev) => !prev)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border cursor-pointer ${
                      showContactDetails
                        ? 'bg-brand-50 dark:bg-brand-950/60 border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-300'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'
                    }`}
                    title={showContactDetails ? 'Hide Profile' : 'View Profile & Details'}
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Member Details</span>
                  </button>

                  {activeConversation.type === CONVERSATION_TYPES.GROUP && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditGroupName(activeConversation.name || '');
                        setEditGroupDesc(activeConversation.description || '');
                        setShowGroupInfoModal(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850"
                    >
                      <Users className="w-3.5 h-3.5 text-brand-600" />
                      <span className="hidden sm:inline">Manage</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Error banner if rate limited or send failed */}
              {errorBanner && (
                <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 text-xs text-red-600 dark:text-red-400 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorBanner}</span>
                  </div>
                  <button
                    onClick={() => setErrorBanner('')}
                    className="p-1 hover:text-red-800 dark:hover:text-red-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Corporate Message Stream */}
              <div
                ref={messagesContainerRef}
                className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/70 dark:bg-slate-950 w-full"
              >
                {loadingMessages ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                    <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs p-6 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-brand-500/10 dark:bg-brand-400/10 flex items-center justify-center text-brand-500 mb-3">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                      No messages yet
                    </p>
                    <p className="text-slate-500 max-w-xs mt-1">
                      Start the discussion! All messages are authenticated and securely logged for institutional audit.
                    </p>
                  </div>
                ) : (
                  messages.map((msg, index) => {
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
                      ? (user?.name || 'You')
                      : (senderObj?.name || (activeConversation?.type === CONVERSATION_TYPES.DIRECT ? activeDetails.title : 'Colleague'));

                    const senderRole = isSender
                      ? (user?.role || '')
                      : (senderObj?.role || (activeConversation?.type === CONVERSATION_TYPES.DIRECT ? (activeDetails.partner?.role || '') : ''));

                    const isReadByOthers = (msg.readBy || []).some(
                      (id) => (id._id || id).toString() !== myId
                    );
                    const msgId = (msg._id || msg.id || index).toString();
                    const groupedReactions = groupReactions(msg.reactions, currentUserId);

                    return (
                      <div
                        key={msg._id || index}
                        className={`w-full flex items-start gap-2.5 sm:gap-3.5 group ${
                          isSender ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {/* Colleague Avatar (Left side) */}
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

                        {/* Message Card Container: Sender on Right (ml-auto), Receiver on Left (mr-auto) */}
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
                              </>
                            ) : (
                              <>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mr-1">
                                  {formatMessageTime(msg.createdAt)}
                                </span>
                                <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-sm bg-brand-50 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300 border border-brand-200/80 dark:border-brand-800/80 leading-none">
                                  You
                                </span>
                                {user?.role && (
                                  <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">
                                    • {user.role}
                                  </span>
                                )}
                              </>
                            )}
                          </div>

                          {/* Message Bubble & Reactions Container */}
                          <div className="relative group/bubble flex items-center gap-1.5 max-w-full">
                            {/* If Sender, reaction trigger button appears on left of bubble */}
                            {isSender && (
                              <button
                                type="button"
                                onClick={() => setActiveReactionMsgId(activeReactionMsgId === msgId ? null : msgId)}
                                className={`reaction-trigger-btn p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-all opacity-0 group-hover/bubble:opacity-100 group-hover:opacity-100 focus:opacity-100 shrink-0 ${
                                  activeReactionMsgId === msgId ? 'opacity-100 bg-slate-200/80 dark:bg-slate-800' : ''
                                }`}
                                title="Add reaction"
                              >
                                <SmilePlus className="w-4 h-4" />
                              </button>
                            )}

                            {/* Message Bubble: Brand Blue on Right, White Card on Left */}
                            <div
                              className={`px-4 py-2.5 rounded-2xl shadow-xs transition-all relative text-xs sm:text-[13px] leading-relaxed wrap-break-word whitespace-pre-wrap select-text ${
                                isSender
                                  ? 'bg-brand-600 dark:bg-brand-600 text-white rounded-tr-xs'
                                  : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-xs border border-slate-200/90 dark:border-slate-700/80'
                              }`}
                            >
                              <p>{msg.content}</p>
                            </div>

                            {/* If Receiver, reaction trigger button appears on right of bubble */}
                            {!isSender && (
                              <button
                                type="button"
                                onClick={() => setActiveReactionMsgId(activeReactionMsgId === msgId ? null : msgId)}
                                className={`reaction-trigger-btn p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-all opacity-0 group-hover/bubble:opacity-100 group-hover:opacity-100 focus:opacity-100 shrink-0 ${
                                  activeReactionMsgId === msgId ? 'opacity-100 bg-slate-200/80 dark:bg-slate-800' : ''
                                }`}
                                title="Add reaction"
                              >
                                <SmilePlus className="w-4 h-4" />
                              </button>
                            )}

                            {/* Floating WhatsApp-style Quick Reaction Pill Bar (Image 2 style) */}
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
                                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-base sm:text-lg hover:scale-125 transition-transform active:scale-95 ${
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
                                {/* Plus button to open more emojis */}
                                <button
                                  type="button"
                                  onClick={() => setShowMoreReactionMsgId(showMoreReactionMsgId === msgId ? null : msgId)}
                                  className="reaction-more-btn w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors ml-0.5"
                                  title="More reactions"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                            {/* Extended Emojis popover if user clicked '+' */}
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

                          {/* Status / Receipt under sent message */}
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

                        {/* Your Avatar (Right side) */}
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

                {/* Typing Indicator */}
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

              {/* Message Input Composer: Single normal text box, emoji button, and send button */}
              <div className="relative p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                {/* Floating Emoji Picker Drawer */}
                {showEmojiPicker && (
                  <div
                    ref={emojiPickerRef}
                    className="absolute bottom-full left-4 mb-2 z-40 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 shadow-2xl p-3 animate-in fade-in slide-in-from-bottom-2 duration-150"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <span>😊</span> Emoji Section
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(false)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Category Tabs */}
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

                    {/* Emoji Grid */}
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

                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
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

                  {/* Single Normal Text Box */}
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
                      placeholder={`Message ${activeDetails.title || 'conversation'}...`}
                      maxLength={2000}
                      className="w-full py-2.5 px-4 text-xs sm:text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 rounded-full border border-slate-200 dark:border-slate-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none resize-none leading-relaxed transition-all max-h-32 min-h-[42px]"
                    />
                    {messageInput.length > 1500 && (
                      <span className="absolute right-3 text-[10px] text-slate-400 pointer-events-none">
                        {messageInput.length}/2000
                      </span>
                    )}
                  </div>

                  {/* Send Button */}
                  <button
                    type="submit"
                    id="btn-send-message"
                    disabled={!messageInput.trim() || sending}
                    className="p-2.5 sm:px-4 sm:py-2.5 rounded-full sm:rounded-xl bg-brand-600 hover:bg-brand-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-semibold transition-all shadow-xs flex items-center justify-center gap-1.5 shrink-0"
                    title="Send Message"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </form>
              </div>
            </>
          ) : (
            /* Empty State when no conversation is selected (Corporate Messenger style) */
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 bg-slate-50/60 dark:bg-slate-950">
              <div className="w-16 h-16 rounded-3xl bg-brand-500/10 dark:bg-brand-400/10 flex items-center justify-center text-brand-600 dark:text-brand-400 mb-4 shadow-sm">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
                Corporate Workspace Messenger
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-6">
                Communicate directly with colleagues, supervisors, mentors, and cohort teams in real time.
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

        {/* Corporate Workspace Contact Info Drawer (Right Panel) */}
        {showContactDetails && activeConversation && (
          <div className="w-full sm:w-80 lg:w-88 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0 h-full overflow-hidden shadow-lg transition-all z-20 absolute sm:relative inset-y-0 right-0">
            {/* Drawer Header */}
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850 shrink-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {activeConversation.type === CONVERSATION_TYPES.GROUP ? 'Channel Details' : 'Member Profile'}
              </h3>
              <button
                type="button"
                onClick={() => setShowContactDetails(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                title="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5">
              {/* Profile Card */}
              <div className="flex flex-col items-center text-center pb-4 border-b border-slate-100 dark:border-slate-800">
                {activeConversation.type === CONVERSATION_TYPES.GROUP ? (
                  <div className="w-20 h-20 rounded-2xl bg-linear-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center font-bold text-2xl shadow-md">
                    <Users className="w-10 h-10" />
                  </div>
                ) : (
                  <UserAvatar
                    sender={activeDetails.partner}
                    name={activeDetails.title}
                    size="xl"
                    isOnline={activeDetails.isOnline}
                    showStatus={true}
                    className="w-20 h-20 text-2xl shadow-md"
                  />
                )}
                <h4 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
                  {activeDetails.title}
                </h4>

                {activeConversation.type === CONVERSATION_TYPES.GROUP ? (
                  <span className="mt-1 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider rounded-full bg-brand-50 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                    Cohort Channel • {activeConversation.participants?.length || 0} Members
                  </span>
                ) : activeDetails.partner?.role ? (
                  <span className="mt-1 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider rounded-full bg-brand-50 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                    {activeDetails.partner.role === 'company'
                      ? 'Enterprise Partner'
                      : activeDetails.partner.role}
                  </span>
                ) : null}

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      activeDetails.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                    }`}
                  />
                  <span>{activeDetails.isOnline ? 'Active Now' : 'Offline'}</span>
                </p>
              </div>

              {/* Bio / About */}
              {(activeDetails.partner?.profile?.bio ||
                activeDetails.partner?.profile?.companyDetails?.description ||
                activeConversation.description) && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    About / Bio
                  </label>
                  <p className="text-xs text-slate-700 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-850/80 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                    &ldquo;
                    {activeDetails.partner?.profile?.bio ||
                      activeDetails.partner?.profile?.companyDetails?.description ||
                      activeConversation.description}
                    &rdquo;
                  </p>
                </div>
              )}

              {/* Organization / Company Information */}
              {(activeDetails.partner?.profile?.companyDetails?.companyName ||
                activeDetails.partner?.profile?.department ||
                activeDetails.partner?.role === 'company') && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Organization & Department
                  </label>
                  <div className="bg-slate-50 dark:bg-slate-850/80 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold">
                      <Building2 className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                      <span className="truncate">
                        {activeDetails.partner?.profile?.companyDetails?.companyName ||
                          activeDetails.partner?.profile?.department ||
                          'Enterprise Partner'}
                      </span>
                    </div>

                    {activeDetails.partner?.profile?.companyDetails?.industry && (
                      <div className="text-slate-600 dark:text-slate-400 pl-6 text-[11px]">
                        Industry: {activeDetails.partner.profile.companyDetails.industry}
                      </div>
                    )}

                    {activeDetails.partner?.profile?.department && (
                      <div className="text-slate-600 dark:text-slate-400 pl-6 text-[11px]">
                        Department: {activeDetails.partner.profile.department}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Direct Contact Information (Email & Phone) */}
              {activeDetails.partner?.email && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Contact Details
                  </label>
                  <div className="bg-slate-50 dark:bg-slate-850/80 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2.5 text-xs">
                    {/* Email */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                        <a
                          href={`mailto:${activeDetails.partner.email}`}
                          className="text-brand-600 dark:text-brand-400 hover:underline truncate"
                        >
                          {activeDetails.partner.email}
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(activeDetails.partner.email);
                          setCopiedField('email');
                          setTimeout(() => setCopiedField(null), 2000);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700"
                        title="Copy email"
                      >
                        {copiedField === 'email' ? (
                          <Check className="w-3.5 h-3.5 text-brand-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Phone */}
                    {(activeDetails.partner?.profile?.phone ||
                      activeDetails.partner?.profile?.companyDetails?.contactPhone) && (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                          <a
                            href={`tel:${
                              activeDetails.partner.profile?.phone ||
                              activeDetails.partner.profile?.companyDetails?.contactPhone
                            }`}
                            className="text-slate-700 dark:text-slate-300 hover:underline truncate"
                          >
                            {activeDetails.partner.profile?.phone ||
                              activeDetails.partner.profile?.companyDetails?.contactPhone}
                          </a>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const p =
                              activeDetails.partner.profile?.phone ||
                              activeDetails.partner.profile?.companyDetails?.contactPhone;
                            navigator.clipboard.writeText(p);
                            setCopiedField('phone');
                            setTimeout(() => setCopiedField(null), 2000);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700"
                          title="Copy phone"
                        >
                          {copiedField === 'phone' ? (
                            <Check className="w-3.5 h-3.5 text-brand-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Group Participants List if Group */}
              {activeConversation.type === CONVERSATION_TYPES.GROUP && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Channel Participants ({activeConversation.participants?.length || 0})
                    </label>
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/80">
                    {(activeConversation.participants || []).map((p) => {
                      const pId = (p._id || p).toString();
                      const pOnline = isUserOnline(pId);
                      return (
                        <div
                          key={pId}
                          className="p-2 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <UserAvatar
                              user={p}
                              name={p.name}
                              size="xs"
                              isOnline={pOnline}
                              showStatus={true}
                            />
                            <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                              {p.name || 'Member'} {pId === currentUserId ? '(You)' : ''}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 capitalize">
                            {p.role || 'Member'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Security / Verification Badge */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 shrink-0 text-brand-600 dark:text-brand-400" />
                <span>Institutional verified contact. Encrypted transmission.</span>
              </div>
            </div>
          </div>
        )}
      </div>

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
                        {online ? 'Active' : 'Offline'}
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

            {/* Quick search input to filter contacts inside modal */}
            {contacts.length > 3 && (
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter members by name, email, or role..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-hidden focus:border-brand-500"
                />
              </div>
            )}

            <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-2 space-y-1">
              {filteredModalContacts.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  <p>No members found.</p>
                  {contacts.length === 0 && (
                    <button
                      type="button"
                      onClick={() => fetchContacts()}
                      className="mt-2 text-brand-600 hover:underline font-medium"
                    >
                      Refresh Contacts
                    </button>
                  )}
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
          {/* Admin Editable Fields */}
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

          {/* Members list */}
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
                      <div className="relative shrink-0">
                        <div className="w-8 h-8 rounded-full bg-linear-to-tr from-brand-600 to-indigo-500 text-white flex items-center justify-center font-bold text-[11px]">
                          {(member.name || 'User').slice(0, 2).toUpperCase()}
                        </div>
                        <span
                          className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white dark:border-[#0d1424] ${
                            online ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        />
                      </div>
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
    </div>
  );
};

export default ChatPage;
