import api from '../api';

export interface SendMessageData {
  content: string;
  conversationId?: string;
}

export const sendMessage = async (data: SendMessageData) => {
  const response = await api.post('/api/chat/send', data);
  return response.data;
};

export const getConversations = async () => {
  const response = await api.get('/api/chat/conversations');
  return response.data;
};

export const getMessages = async (conversationId: string) => {
  const response = await api.get(`/api/chat/conversations/${conversationId}/messages`);
  return response.data;
};
