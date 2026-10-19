import apiClient from '../api/client';

export const CONVERSATION_TYPES = {
  DIRECT: 'direct',
  GROUP: 'group',
};

export const chatService = {
  /**
   * Fetch all conversations for the authenticated user
   */
  async getConversations() {
    const response = await apiClient.get('/api/chat/conversations');
    return response.data;
  },

  /**
   * Create a new direct or group conversation
   * @param {Object} data - { type: 'direct'|'group', recipientId, name, description, participantIds }
   */
  async createConversation(data) {
    const response = await apiClient.post('/api/chat/conversations', data);
    return response.data;
  },

  /**
   * Retrieve single conversation details
   */
  async getConversationById(id) {
    const response = await apiClient.get(`/api/chat/conversations/${id}`);
    return response.data;
  },

  /**
   * Fetch paginated message history for a conversation
   * @param {string} id - Conversation ID
   * @param {Object} params - { page, limit }
   */
  async getMessages(id, params = {}) {
    const response = await apiClient.get(`/api/chat/conversations/${id}/messages`, { params });
    return response.data;
  },

  /**
   * Send a safe text message
   * @param {string} id - Conversation ID
   * @param {string} content - Message text content (1-2000 chars)
   */
  async sendMessage(id, content) {
    const response = await apiClient.post(`/api/chat/conversations/${id}/messages`, { content });
    return response.data;
  },

  /**
   * Simulate a live real-time response from the conversation partner
   * @param {string} id - Conversation ID
   * @param {string} [customMessage] - Optional custom message
   */
  async simulateReply(id, customMessage) {
    const response = await apiClient.post(`/api/chat/conversations/${id}/simulate-reply`, { customMessage });
    return response.data;
  },

  /**
   * Mark a conversation as read
   */
  async markConversationRead(id) {
    const response = await apiClient.patch(`/api/chat/conversations/${id}/read`);
    return response.data;
  },

  /**
   * Manage group details & members
   * @param {string} id - Conversation ID
   * @param {Object} data - { name, description, addMemberIds, removeMemberIds, action, userId }
   */
  async updateGroupMembers(id, data) {
    const response = await apiClient.patch(`/api/chat/conversations/${id}/members`, data);
    return response.data;
  },

  /**
   * Directory of permitted contacts for starting new chats
   */
  async getContacts() {
    const response = await apiClient.get('/api/chat/contacts');
    return response.data;
  },

  /**
   * Fetch online users IDs
   */
  async getOnlineUsers() {
    const response = await apiClient.get('/api/chat/online-users');
    return response.data;
  },
};

export default chatService;
