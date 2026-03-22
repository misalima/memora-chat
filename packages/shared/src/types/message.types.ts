export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

export interface SendMessageDto {
  content: string;
  conversationId?: string;
}

export interface SendMessageResponse {
  message: Message;
  response: string;
  sources?: Array<{
    type: string;
    filename?: string;
    content: string;
  }>;
}