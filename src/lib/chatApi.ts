import { isSupabaseConfigured, requireSupabase } from './supabase';
import {
  BackendApiError,
  isDirectWebhookConfigured,
  sendMessageToN8n,
} from './n8nClient';
import {
  createLocalChat,
  deleteLocalChat,
  insertLocalMessage,
  listLocalChats,
  listLocalMessages,
  touchLocalChat,
} from './localStore';
import type { Chat, ChatEdgeResponse, Message, MessageRole } from '../types/chat';

const MAX_MESSAGE_LENGTH = 4000;

export class ApiError extends Error {
  readonly isAuthError: boolean;

  constructor(message: string, isAuthError = false) {
    super(message);
    this.name = 'ApiError';
    this.isAuthError = isAuthError;
  }
}

export function buildConversationSessionId(userId: string, chatId: string): string {
  return `${userId}:${chatId}`;
}

export function validateUserMessage(rawMessage: string): string {
  const trimmed = rawMessage.trim();
  if (!trimmed) {
    throw new ApiError('Please enter a message before sending.');
  }
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new ApiError(
      `Message is too long (${trimmed.length} characters). Please keep it under ${MAX_MESSAGE_LENGTH} characters.`
    );
  }
  return trimmed;
}

export async function fetchUserChats(userId: string): Promise<Chat[]> {
  if (!isSupabaseConfigured) {
    return listLocalChats(userId);
  }

  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('chats')
    .select('id, user_id, title, created_at, updated_at')
    .order('updated_at', { ascending: false });

  if (error) {
    throw new ApiError(`Failed to load conversations: ${error.message}`);
  }
  return (data ?? []) as Chat[];
}

export async function createUserChat(userId: string, title: string): Promise<Chat> {
  if (!isSupabaseConfigured) {
    return createLocalChat(userId, title);
  }

  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('chats')
    .insert({ user_id: userId, title })
    .select('id, user_id, title, created_at, updated_at')
    .single();

  if (error || !data) {
    throw new ApiError(
      `Failed to start a new conversation: ${error?.message ?? 'Unknown error'}`
    );
  }
  return data as Chat;
}

export async function deleteUserChat(chatId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    deleteLocalChat(chatId);
    return;
  }

  const supabase = requireSupabase();
  const { error } = await supabase.from('chats').delete().eq('id', chatId);

  if (error) {
    throw new ApiError(`Failed to delete conversation: ${error.message}`);
  }
}

export async function touchChatUpdatedAt(chatId: string): Promise<string> {
  if (!isSupabaseConfigured) {
    return touchLocalChat(chatId);
  }

  const supabase = requireSupabase();
  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from('chats')
    .update({ updated_at: nowIso })
    .eq('id', chatId);

  if (error) {
    throw new ApiError(`Failed to update conversation timestamp: ${error.message}`);
  }
  return nowIso;
}

export async function fetchChatMessages(chatId: string): Promise<Message[]> {
  if (!isSupabaseConfigured) {
    return listLocalMessages(chatId);
  }

  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('messages')
    .select('id, chat_id, user_id, role, content, created_at')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new ApiError(`Failed to load messages: ${error.message}`);
  }
  return (data ?? []) as Message[];
}

export async function insertChatMessage(params: {
  chatId: string;
  userId: string;
  role: MessageRole;
  content: string;
}): Promise<Message> {
  if (!isSupabaseConfigured) {
    return insertLocalMessage(params);
  }

  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('messages')
    .insert({
      chat_id: params.chatId,
      user_id: params.userId,
      role: params.role,
      content: params.content,
    })
    .select('id, chat_id, user_id, role, content, created_at')
    .single();

  if (error || !data) {
    throw new ApiError(
      `Failed to save message: ${error?.message ?? 'Unknown error'}`
    );
  }
  return data as Message;
}

/**
 * Parses and validates the JSON response returned by the `chat` Supabase Edge Function.
 */
export function parseAssistantResponse(payload: unknown): string {
  if (typeof payload !== 'object' || payload === null) {
    throw new ApiError('Received an unexpected response format from TULU-GPT.');
  }
  const record = payload as Partial<ChatEdgeResponse> & { error?: string };
  if (typeof record.error === 'string' && record.error.trim()) {
    throw new ApiError(record.error);
  }
  if (typeof record.reply !== 'string' || !record.reply.trim()) {
    throw new ApiError('TULU-GPT returned an empty reply. Please try again.');
  }
  return record.reply.trim();
}

export async function requestAssistantReply(params: {
  chatId: string;
  userId: string;
  message: string;
}): Promise<string> {
  // Direct n8n webhook mode (prototype / VITE_N8N_WEBHOOK_URL configured)
  if (isDirectWebhookConfigured) {
    try {
      const sessionId = buildConversationSessionId(params.userId, params.chatId);
      return await sendMessageToN8n({
        message: params.message,
        sessionId,
      });
    } catch (err) {
      if (err instanceof BackendApiError) {
        throw new ApiError(err.message);
      }
      throw new ApiError(
        err instanceof Error ? err.message : 'Unable to reach TULU-GPT backend.'
      );
    }
  }

  // Supabase Edge Function mode (when VITE_SUPABASE_URL is configured and webhook is server-side)
  const supabase = requireSupabase();

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    throw new ApiError(
      'Your session has expired. Please sign in again to continue.',
      true
    );
  }

  const { data, error } = await supabase.functions.invoke('chat', {
    body: {
      chatId: params.chatId,
      message: params.message,
    },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    const status = (error as { context?: { status?: number } }).context?.status;
    if (status === 401) {
      throw new ApiError(
        'Your session has expired. Please sign in again to continue.',
        true
      );
    }

    let detailedMessage = error.message || 'Unable to reach TULU-GPT assistant.';
    const contextBody = (error as { context?: Response }).context;
    if (contextBody && typeof contextBody.json === 'function') {
      try {
        const parsed = (await contextBody.json()) as { error?: string };
        if (parsed?.error) {
          detailedMessage = parsed.error;
        }
      } catch {
        // Ignore JSON parse fallback failures
      }
    }
    throw new ApiError(detailedMessage);
  }

  return parseAssistantResponse(data);
}
