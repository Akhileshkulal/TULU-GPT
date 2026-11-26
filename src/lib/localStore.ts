import type { Chat, Message, MessageRole } from '../types/chat';

const CLIENT_ID_KEY = 'tulugpt_client_id';
const CHATS_KEY = 'tulugpt_prototype_chats_v1';
const MESSAGES_KEY = 'tulugpt_prototype_messages_v1';
const ACTIVE_CHAT_KEY_PREFIX = 'tulugpt_active_chat_';

function createUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const r = Math.floor(Math.random() * 16);
    const v = char === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota issues
  }
}

export function getOrCreatePrototypeClientId(): string {
  try {
    const existing = window.localStorage.getItem(CLIENT_ID_KEY);
    if (existing && existing.trim()) {
      return existing.trim();
    }
    const created = `user-${createUuid()}`;
    window.localStorage.setItem(CLIENT_ID_KEY, created);
    return created;
  } catch {
    return `user-${createUuid()}`;
  }
}

export function getStoredActiveChatId(userId: string): string | null {
  try {
    return window.localStorage.getItem(`${ACTIVE_CHAT_KEY_PREFIX}${userId}`);
  } catch {
    return null;
  }
}

export function setStoredActiveChatId(userId: string, chatId: string | null): void {
  try {
    const key = `${ACTIVE_CHAT_KEY_PREFIX}${userId}`;
    if (chatId) {
      window.localStorage.setItem(key, chatId);
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage errors
  }
}

export function listLocalChats(userId: string): Chat[] {
  const chats = readJson<Chat[]>(CHATS_KEY, []);
  return chats
    .filter((c) => c.user_id === userId)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

export function createLocalChat(userId: string, title: string): Chat {
  const now = new Date().toISOString();
  const chat: Chat = {
    id: createUuid(),
    user_id: userId,
    title,
    created_at: now,
    updated_at: now,
  };
  const chats = readJson<Chat[]>(CHATS_KEY, []);
  writeJson(CHATS_KEY, [chat, ...chats]);
  return chat;
}

export function deleteLocalChat(chatId: string): void {
  const chats = readJson<Chat[]>(CHATS_KEY, []);
  writeJson(
    CHATS_KEY,
    chats.filter((c) => c.id !== chatId)
  );
  const messages = readJson<Message[]>(MESSAGES_KEY, []);
  writeJson(
    MESSAGES_KEY,
    messages.filter((m) => m.chat_id !== chatId)
  );
}

export function touchLocalChat(chatId: string): string {
  const now = new Date().toISOString();
  const chats = readJson<Chat[]>(CHATS_KEY, []);
  writeJson(
    CHATS_KEY,
    chats.map((c) => (c.id === chatId ? { ...c, updated_at: now } : c))
  );
  return now;
}

export function listLocalMessages(chatId: string): Message[] {
  const messages = readJson<Message[]>(MESSAGES_KEY, []);
  return messages
    .filter((m) => m.chat_id === chatId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

export function insertLocalMessage(params: {
  chatId: string;
  userId: string;
  role: MessageRole;
  content: string;
}): Message {
  const msg: Message = {
    id: createUuid(),
    chat_id: params.chatId,
    user_id: params.userId,
    role: params.role,
    content: params.content,
    created_at: new Date().toISOString(),
  };
  const messages = readJson<Message[]>(MESSAGES_KEY, []);
  writeJson(MESSAGES_KEY, [...messages, msg]);
  return msg;
}
