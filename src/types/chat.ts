export type MessageRole = 'user' | 'assistant';

export interface Chat {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  user_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
}

export interface ChatEdgeRequest {
  chatId: string;
  message: string;
}

export interface ChatEdgeResponse {
  reply: string;
}

export interface FailedMessageRequest {
  chatId: string;
  message: string;
  errorMessage: string;
}
