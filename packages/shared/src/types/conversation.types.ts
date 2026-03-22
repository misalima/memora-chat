export interface Conversation {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateConversationDto {
  title?: string;
}

export interface UpdateConversationDto {
  title?: string;
}