import React, { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import chatService, { CONVERSATION_TYPES } from '../services/chatService';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import StatusBadge from '../components/common/StatusBadge';

export const ChatPage = () => {
  const { user } = useAuth();
  const {
    socket,
    isConnected,
    isUserOnline,
    joinConversation,
    leaveConversation,
    sendTyping,
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
  const [filterType, setFilterType] = useState('all'); // 'all' | 'direct' | 'group'
  const [typingUsers, setTypingUsers] = useState(new Map()); // userId -> name
  const [errorBanner, setErrorBanner] = useState('');

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

  // Mobile layout state
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const currentUserId = user?.id || user?._id?.toString();
  const canCreateGroup = ['admin', 'coordinator', 'mentor', 'company'].includes(user?.role);

  // Auto-scroll to bottom of messages
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
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
      await chatService.markConversationRead(convId);
      setConversations((prev) =>
        prev.map((c) => (c._id === convId ? { ...c, unreadCount: 0 } : c))
      );
    } catch (err) {
      console.warn('Could not mark conversation as read:', err);
    }
  }, []);

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
  }, [fetchConversations]);

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

      joinConversation(conv._id);
      fetchMessages(conv._id);

      if (conv.unreadCount > 0) {
        markAsRead(conv._id);
      }
    },
    [activeConversation, joinConversation, leaveConversation, fetchMessages, markAsRead]
  );

  // Real-time Socket Event Listeners
  useEffect(() => {
    if (!socket) return;

    // Receive message in current conversation
    const handleChatMessage = ({ conversationId, message }) => {
      if (activeConversation?._id === conversationId) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === message._id)) return prev;
          return [...prev, message];
        });
        setTimeout(() => scrollToBottom(true), 50);
        markAsRead(conversationId);
      }
    };

    // Receive message notification across all conversations
    const handleNewMessageAlert = ({ conversationId, message }) => {
      setConversations((prev) => {
        const index = prev.findIndex((c) => c._id === conversationId);
        if (index === -1) {
          // If conversation wasn't in list yet, refresh full list
          fetchConversations();
          return prev;
        }

        const updated = [...prev];
        const existing = updated[index];
        const isCurrent = activeConversation?._id === conversationId;
        const isSender = message.sender?._id === currentUserId || message.sender === currentUserId;

        updated[index] = {
          ...existing,
          lastMessage: message,
          lastMessageAt: message.createdAt || new Date().toISOString(),
          unreadCount: isCurrent || isSender ? 0 : (existing.unreadCount || 0) + 1,
        };

        // Move to top of list
        const [moved] = updated.splice(index, 1);
        return [moved, ...updated];
      });
    };

    // Conversation metadata updated (name, participants)
    const handleConversationUpdated = ({ conversationId, conversation }) => {
      setConversations((prev) =>
        prev.map((c) => (c._id === conversationId ? { ...c, ...conversation } : c))
      );
      if (activeConversation?._id === conversationId) {
        setActiveConversation((prev) => ({ ...prev, ...conversation }));
      }
    };

    // Read update from peer
    const handleReadUpdate = ({ conversationId, userId, readAt }) => {
      if (activeConversation?._id === conversationId) {
        setMessages((prev) =>
          prev.map((m) => {
            const readByList = m.readBy || [];
            if (!readByList.includes(userId)) {
              return { ...m, readBy: [...readByList, userId] };
            }
            return m;
          })
        );
      }
    };

    // Typing status
    const handleTyping = ({ conversationId, userId, userName, isTyping }) => {
      if (activeConversation?._id === conversationId && userId !== currentUserId) {
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

    socket.on('chat:message', handleChatMessage);
    socket.on('chat:new_message', handleNewMessageAlert);
    socket.on('conversation:updated', handleConversationUpdated);
    socket.on('chat:read_update', handleReadUpdate);
    socket.on('chat:typing', handleTyping);

    return () => {
      socket.off('chat:message', handleChatMessage);
      socket.off('chat:new_message', handleNewMessageAlert);
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
        await fetchConversations();
        selectConversation(conv);
      }
    } catch (err) {
      console.error('Failed to create direct chat:', err);
    }
  };

  // Create new group
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim() || selectedParticipants.length < 1) return;

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

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    if (filterType === 'direct' && c.type !== CONVERSATION_TYPES.DIRECT) return false;
    if (filterType === 'group' && c.type !== CONVERSATION_TYPES.GROUP) return false;
    if (!searchQuery.trim()) return true;

    const details = getConversationDetails(c);
    const q = searchQuery.toLowerCase();
    return (
      details.title.toLowerCase().includes(q) ||
      (c.lastMessage?.content || '').toLowerCase().includes(q)
    );
  });

  const activeDetails = getConversationDetails(activeConversation);

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col -m-6 bg-slate-50 dark:bg-[#070b14] overflow-hidden">
      {/* Top Banner if Socket Disconnected */}
      {!isConnected && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Real-time connection reconnecting... Messages remain safely persisted in MongoDB.</span>
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
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Conversations Directory */}
        <div
          className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1424] transition-all duration-300 ${
            mobileShowChat ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Sidebar Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-brand-500/10 dark:bg-brand-400/10 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                    Messages
                  </h1>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isConnected ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    />
                    <span>{isConnected ? 'Socket Connected' : 'Connecting...'}</span>
                  </div>
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
                  className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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
                    className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Create Group Conversation"
                  >
                    <Users className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-brand-500 dark:focus:border-brand-400 focus:bg-white dark:focus:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 transition-all outline-hidden"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex gap-1">
              {[
                { id: 'all', label: 'All' },
                { id: 'direct', label: 'Direct' },
                { id: 'group', label: 'Groups' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterType(tab.id)}
                  className={`flex-1 py-1 text-[11px] font-medium rounded-lg transition-colors ${
                    filterType === tab.id
                      ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400 font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {loadingConversations ? (
              <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
                <span>Loading conversations...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-3">
                <MessageSquare className="w-8 h-8 stroke-1 text-slate-300 dark:text-slate-600" />
                <p>No conversations found.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    fetchContacts();
                    setShowNewChatModal(true);
                  }}
                >
                  Start a Chat
                </Button>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = activeConversation?._id === conv._id;
                const details = getConversationDetails(conv);
                const hasUnread = (conv.unreadCount || 0) > 0;

                return (
                  <button
                    key={conv._id}
                    type="button"
                    onClick={() => selectConversation(conv)}
                    className={`w-full p-3.5 flex items-start gap-3 text-left transition-colors relative ${
                      isSelected
                        ? 'bg-brand-500/10 dark:bg-brand-400/10 border-l-4 border-brand-500'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {/* Avatar with Status indicator */}
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-linear-to-tr from-brand-600 to-indigo-500 text-white flex items-center justify-center font-semibold text-xs shadow-xs">
                        {conv.type === CONVERSATION_TYPES.GROUP ? (
                          <Users className="w-5 h-5" />
                        ) : (
                          details.title.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      {conv.type === CONVERSATION_TYPES.DIRECT && (
                        <span
                          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-[#0d1424] ${
                            details.isOnline ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        />
                      )}
                    </div>

                    {/* Conversation preview snippet */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span
                          className={`text-xs truncate ${
                            hasUnread
                              ? 'font-bold text-slate-900 dark:text-white'
                              : 'font-medium text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {details.title}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                          {conv.lastMessageAt ? formatMessageTime(conv.lastMessageAt) : ''}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-[11px] truncate ${
                            hasUnread
                              ? 'font-semibold text-slate-900 dark:text-slate-100'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {conv.lastMessage?.content ? (
                            conv.lastMessage.content
                          ) : (
                            <span className="italic text-slate-400">No messages yet</span>
                          )}
                        </p>

                        {hasUnread && (
                          <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-brand-600 text-white min-w-4 text-center leading-tight">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Area: Active Message Conversation Stream */}
        <div
          className={`flex-1 flex flex-col bg-white dark:bg-[#090e1a] transition-all duration-300 ${
            !mobileShowChat ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-[#0d1424] shadow-xs">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setMobileShowChat(false)}
                    className="md:hidden p-1.5 -ml-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    title="Back to list"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-linear-to-tr from-brand-600 to-indigo-500 text-white flex items-center justify-center font-bold text-xs">
                      {activeConversation.type === CONVERSATION_TYPES.GROUP ? (
                        <Users className="w-5 h-5" />
                      ) : (
                        activeDetails.title.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    {activeConversation.type === CONVERSATION_TYPES.DIRECT && (
                      <span
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-[#0d1424] ${
                          activeDetails.isOnline ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      />
                    )}
                  </div>

                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{activeDetails.title}</span>
                      {activeConversation.type === CONVERSATION_TYPES.GROUP && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-sm bg-brand-50 dark:bg-brand-950/80 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
                          Group
                        </span>
                      )}
                    </h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {activeDetails.subtitle}
                    </p>
                  </div>
                </div>

                {/* Right controls in header */}
                <div className="flex items-center gap-2">
                  {activeConversation.type === CONVERSATION_TYPES.GROUP && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditGroupName(activeConversation.name || '');
                        setEditGroupDesc(activeConversation.description || '');
                        setShowGroupInfoModal(true);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-800"
                    >
                      <Info className="w-4 h-4 text-brand-500" />
                      <span className="hidden sm:inline">Group Info</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Error banner if rate limited or send failed */}
              {errorBanner && (
                <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 text-xs text-red-600 dark:text-red-400 flex items-center justify-between">
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

              {/* Message Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/60 dark:bg-[#070b14]">
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
                      Say hello to start the conversation! All messages are authenticated and persisted.
                    </p>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isSender =
                      msg.sender?._id === currentUserId ||
                      msg.sender === currentUserId;
                    const senderName = msg.sender?.name || 'User';
                    const isReadByOthers = (msg.readBy || []).some(
                      (id) => (id._id || id).toString() !== currentUserId
                    );

                    return (
                      <div
                        key={msg._id || index}
                        className={`flex flex-col ${isSender ? 'items-end' : 'items-start'}`}
                      >
                        {/* Group Sender Name */}
                        {activeConversation.type === CONVERSATION_TYPES.GROUP && !isSender && (
                          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 ml-2 mb-1">
                            {senderName} {msg.sender?.role ? `(${msg.sender.role})` : ''}
                          </span>
                        )}

                        <div
                          className={`max-w-[85%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl shadow-xs transition-all ${
                            isSender
                              ? 'bg-brand-600 dark:bg-brand-500 text-white rounded-tr-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-xs border border-slate-200/80 dark:border-slate-700/80'
                          }`}
                        >
                          <p className="text-xs leading-relaxed wrap-break-word whitespace-pre-wrap select-text">
                            {msg.content}
                          </p>

                          <div
                            className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                              isSender
                                ? 'text-brand-100 dark:text-brand-100/80'
                                : 'text-slate-400 dark:text-slate-500'
                            }`}
                          >
                            <span>{formatMessageTime(msg.createdAt)}</span>
                            {isSender && (
                              <span>
                                {isReadByOthers ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-sky-200" title="Read" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" title="Sent" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Typing Indicator Bubble */}
                {typingUsers.size > 0 && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 italic animate-pulse">
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150" />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-300" />
                    </span>
                    <span>
                      {Array.from(typingUsers.values()).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                    </span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Footer */}
              <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1424]">
                <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                  <div className="flex-1 relative">
                    <textarea
                      rows={1}
                      value={messageInput}
                      onChange={handleInputChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Type a safe text message... (Press Enter to send)"
                      maxLength={2000}
                      className="w-full px-4 py-2.5 text-xs rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-brand-500 dark:focus:border-brand-400 focus:bg-white dark:focus:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 resize-none outline-hidden max-h-32 min-h-[42px]"
                    />
                    <div className="absolute right-3 bottom-2 text-[10px] text-slate-400">
                      {messageInput.length > 1800 ? `${messageInput.length}/2000` : ''}
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="btn-send-message"
                    disabled={!messageInput.trim() || sending}
                    className="p-2.5 rounded-2xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all shadow-md shrink-0 flex items-center justify-center"
                    title="Send Message"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </form>
              </div>
            </>
          ) : (
            /* Empty State when no conversation is selected */
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <div className="w-16 h-16 rounded-3xl bg-brand-500/10 dark:bg-brand-400/10 flex items-center justify-center text-brand-600 dark:text-brand-400 mb-4 shadow-sm">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
                Real-Time Messaging Center
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-6">
                Connect directly with mentors, coordinators, and peers with encrypted authorization and persistent history.
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
                    Create Group
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
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
                        <div className="relative">
                          <div className="w-9 h-9 rounded-full bg-linear-to-tr from-brand-600 to-indigo-500 text-white flex items-center justify-center font-bold text-xs">
                            {contact.name.slice(0, 2).toUpperCase()}
                          </div>
                          <span
                            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-white dark:border-[#0d1424] ${
                              online ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                          />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-white">
                            {contact.name}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {contact.role} {contact.profile?.department ? `• ${contact.profile.department}` : ''}
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
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Members ({selectedParticipants.length} selected)
            </label>
            <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-2 space-y-1">
              {contacts.map((contact) => {
                const checked = selectedParticipants.includes(contact._id);
                return (
                  <label
                    key={contact._id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer"
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
              disabled={!groupName.trim() || selectedParticipants.length === 0 || creatingGroup}
            >
              {creatingGroup ? 'Creating...' : 'Create Group'}
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
