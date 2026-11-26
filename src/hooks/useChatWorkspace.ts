import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ApiError,
  createUserChat,
  deleteUserChat,
  fetchChatMessages,
  fetchUserChats,
  insertChatMessage,
  requestAssistantReply,
  touchChatUpdatedAt,
  validateUserMessage,
} from '../lib/chatApi';
import { generateChatTitle } from '../lib/chatFormatters';
import { getStoredActiveChatId, setStoredActiveChatId } from '../lib/localStore';
import type { Chat, FailedMessageRequest, Message } from '../types/chat';

interface UseChatWorkspaceOptions {
  userId: string | null;
  onSessionExpired: () => Promise<void>;
}

export function useChatWorkspace({ userId, onSessionExpired }: UseChatWorkspaceOptions) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);

  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [failedRequest, setFailedRequest] = useState<FailedMessageRequest | null>(null);

  // Guard against stale async responses when switching chats rapidly
  const activeChatIdRef = useRef<string | null>(null);
  activeChatIdRef.current = activeChatId;

  const selectChat = useCallback(
    async (chatId: string) => {
      activeChatIdRef.current = chatId;
      setActiveChatId(chatId);
      if (userId) {
        setStoredActiveChatId(userId, chatId);
      }
      setFailedRequest(null);
      setWorkspaceError(null);
      setIsLoadingMessages(true);

      try {
        const loaded = await fetchChatMessages(chatId);
        if (activeChatIdRef.current === chatId) {
          setMessages(loaded);
        }
      } catch (err) {
        if (activeChatIdRef.current === chatId) {
          setWorkspaceError(
            err instanceof Error ? err.message : 'Unable to load conversation messages.'
          );
        }
      } finally {
        if (activeChatIdRef.current === chatId) {
          setIsLoadingMessages(false);
        }
      }
    },
    [userId]
  );

  const loadChats = useCallback(async () => {
    if (!userId) {
      setChats([]);
      setActiveChatId(null);
      setMessages([]);
      return;
    }

    setIsLoadingChats(true);
    setWorkspaceError(null);
    try {
      const list = await fetchUserChats(userId);
      setChats(list);

      // Restore the previously open conversation (and its sessionId) after page refresh
      const storedChatId = getStoredActiveChatId(userId);
      if (storedChatId && list.some((chat) => chat.id === storedChatId)) {
        await selectChat(storedChatId);
      } else if (storedChatId) {
        setStoredActiveChatId(userId, null);
      }
    } catch (err) {
      setWorkspaceError(
        err instanceof Error ? err.message : 'Unable to load your chat history.'
      );
    } finally {
      setIsLoadingChats(false);
    }
  }, [selectChat, userId]);

  useEffect(() => {
    setActiveChatId(null);
    setMessages([]);
    setFailedRequest(null);
    setSearchQuery('');
    loadChats();
  }, [loadChats]);

  const startNewChat = useCallback(() => {
    activeChatIdRef.current = null;
    setActiveChatId(null);
    if (userId) {
      setStoredActiveChatId(userId, null);
    }
    setMessages([]);
    setFailedRequest(null);
    setWorkspaceError(null);
  }, [userId]);

  const callAssistantAndSaveReply = useCallback(
    async (chatId: string, messageText: string) => {
      if (!userId) return;

      const reply = await requestAssistantReply({
        chatId,
        userId,
        message: messageText,
      });

      const assistantMsg = await insertChatMessage({
        chatId,
        userId,
        role: 'assistant',
        content: reply,
      });

      const updatedAt = await touchChatUpdatedAt(chatId);

      if (activeChatIdRef.current === chatId) {
        setMessages((prev) => [...prev, assistantMsg]);
      }

      setChats((prev) => {
        const updated = prev.map((chat) =>
          chat.id === chatId ? { ...chat, updated_at: updatedAt } : chat
        );
        return updated.sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      });
    },
    [userId]
  );

  const sendMessage = useCallback(
    async (rawInput: string): Promise<boolean> => {
      if (!userId || isSending) return false;

      let cleanMessage: string;
      try {
        cleanMessage = validateUserMessage(rawInput);
      } catch (err) {
        setWorkspaceError(err instanceof Error ? err.message : 'Invalid message.');
        return false;
      }

      setWorkspaceError(null);
      setFailedRequest(null);
      setIsSending(true);

      let targetChatId = activeChatId;

      try {
        if (!targetChatId) {
          const title = generateChatTitle(cleanMessage);
          const createdChat = await createUserChat(userId, title);
          targetChatId = createdChat.id;
          activeChatIdRef.current = createdChat.id;
          setActiveChatId(createdChat.id);
          setStoredActiveChatId(userId, createdChat.id);
          setChats((prev) => [createdChat, ...prev]);
        }

        const savedUserMsg = await insertChatMessage({
          chatId: targetChatId,
          userId,
          role: 'user',
          content: cleanMessage,
        });

        if (activeChatIdRef.current === targetChatId) {
          setMessages((prev) => [...prev, savedUserMsg]);
        }

        const updatedAt = await touchChatUpdatedAt(targetChatId);
        setChats((prev) => {
          const updated = prev.map((chat) =>
            chat.id === targetChatId ? { ...chat, updated_at: updatedAt } : chat
          );
          return updated.sort(
            (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          );
        });
      } catch (err) {
        setIsSending(false);
        setWorkspaceError(
          err instanceof Error ? err.message : 'Could not send your message.'
        );
        return false;
      }

      try {
        await callAssistantAndSaveReply(targetChatId, cleanMessage);
      } catch (err) {
        if (err instanceof ApiError && err.isAuthError) {
          await onSessionExpired();
          setIsSending(false);
          return true;
        }
        setFailedRequest({
          chatId: targetChatId,
          message: cleanMessage,
          errorMessage:
            err instanceof Error
              ? err.message
              : 'Failed to get a response from TULU-GPT.',
        });
      } finally {
        setIsSending(false);
      }

      return true;
    },
    [activeChatId, callAssistantAndSaveReply, isSending, onSessionExpired, userId]
  );

  const retryFailedMessage = useCallback(async () => {
    if (!failedRequest || isSending) return;

    const { chatId, message } = failedRequest;
    setFailedRequest(null);
    setWorkspaceError(null);
    setIsSending(true);

    try {
      await callAssistantAndSaveReply(chatId, message);
    } catch (err) {
      if (err instanceof ApiError && err.isAuthError) {
        await onSessionExpired();
        setIsSending(false);
        return;
      }
      setFailedRequest({
        chatId,
        message,
        errorMessage:
          err instanceof Error
            ? err.message
            : 'Retry failed. Please check your connection and try again.',
      });
    } finally {
      setIsSending(false);
    }
  }, [callAssistantAndSaveReply, failedRequest, isSending, onSessionExpired]);

  const deleteChat = useCallback(
    async (chatId: string) => {
      setDeletingChatId(chatId);
      setWorkspaceError(null);
      try {
        await deleteUserChat(chatId);
        setChats((prev) => prev.filter((c) => c.id !== chatId));
        if (activeChatIdRef.current === chatId) {
          activeChatIdRef.current = null;
          setActiveChatId(null);
          if (userId) {
            setStoredActiveChatId(userId, null);
          }
          setMessages([]);
          setFailedRequest(null);
        }
      } catch (err) {
        setWorkspaceError(
          err instanceof Error ? err.message : 'Unable to delete conversation.'
        );
      } finally {
        setDeletingChatId(null);
      }
    },
    [userId]
  );

  const filteredChats = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter((chat) => chat.title.toLowerCase().includes(q));
  }, [chats, searchQuery]);

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeChatId) ?? null,
    [chats, activeChatId]
  );

  return {
    chats,
    filteredChats,
    activeChat,
    activeChatId,
    messages,
    searchQuery,
    setSearchQuery,
    isLoadingChats,
    isLoadingMessages,
    isSending,
    deletingChatId,
    workspaceError,
    clearWorkspaceError: () => setWorkspaceError(null),
    failedRequest,
    selectChat,
    startNewChat,
    sendMessage,
    retryFailedMessage,
    deleteChat,
    reloadChats: loadChats,
  };
}
