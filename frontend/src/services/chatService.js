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
   * Send a message (text, file attachment, or reply)
   * @param {string} id - Conversation ID
   * @param {string|FormData|Object} payload - Message text or payload object/FormData
   */
  async sendMessage(id, payload) {
    if (payload instanceof FormData) {
      const response = await apiClient.post(`/api/chat/conversations/${id}/messages`, payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    }

    if (typeof payload === 'object' && payload !== null && payload.file) {
      const formData = new FormData();
      if (payload.content) formData.append('content', payload.content);
      if (payload.replyTo) formData.append('replyTo', payload.replyTo);
      if (payload.clientMsgId) formData.append('clientMsgId', payload.clientMsgId);
      formData.append('file', payload.file);

      const response = await apiClient.post(`/api/chat/conversations/${id}/messages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    }

    const body = typeof payload === 'string' ? { content: payload } : payload;
    const response = await apiClient.post(`/api/chat/conversations/${id}/messages`, body);
    return response.data;
  },

  /**
   * Upload an attachment directly
   * @param {File} file
   */
  async uploadAttachment(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/api/chat/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /**
   * Securely download attachment as blob and trigger browser save
   * @param {string} fileKey - Filename on server
   * @param {string} fileName - Original display filename
   */
  async downloadAttachment(fileKey, fileName = 'attachment') {
    const response = await apiClient.get(`/api/chat/attachments/${fileKey}`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], {
      type: response.headers['content-type'] || 'application/octet-stream',
    });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 5000);
    return true;
  },

  /**
   * Edit an existing message
   * @param {string} messageId - Message ID
   * @param {string} content - New content
   */
  async editMessage(messageId, content) {
    const response = await apiClient.patch(`/api/chat/messages/${messageId}`, { content });
    return response.data;
  },

  /**
   * Delete a message (for everyone or for me)
   * @param {string} messageId - Message ID
   * @param {'everyone'|'me'} mode - Deletion mode
   */
  async deleteMessage(messageId, mode = 'everyone') {
    const response = await apiClient.delete(`/api/chat/messages/${messageId}`, {
      data: { mode },
    });
    return response.data;
  },

  /**
   * Forward a message to one or more conversations
   * @param {string} messageId - Message ID
   * @param {string[]} targetConversationIds - Target conversation IDs
   */
  async forwardMessage(messageId, targetConversationIds) {
    const response = await apiClient.post(`/api/chat/messages/${messageId}/forward`, {
      targetConversationIds,
    });
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

  /**
   * Toggle emoji reaction on a message
   * @param {string} messageId - Message ID
   * @param {string} emoji - Unicode Emoji string
   */
  async toggleReaction(messageId, emoji) {
    const response = await apiClient.patch(`/api/chat/messages/${messageId}/react`, { emoji });
    return response.data;
  },
};

export default chatService;
