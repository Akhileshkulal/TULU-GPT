import { useState } from 'react';
import {
  LogOut,
  MessageSquare,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Logo } from '../ui/Logo';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { formatConversationDate } from '../../lib/chatFormatters';
import type { Chat } from '../../types/chat';

interface SidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  isLoadingChats: boolean;
  deletingChatId: string | null;
  userEmail: string;
  canSignOut?: boolean;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => Promise<void>;
  onSignOut?: () => Promise<void>;
}

export function Sidebar({
  chats,
  activeChatId,
  searchQuery,
  onSearchChange,
  isLoadingChats,
  deletingChatId,
  userEmail,
  canSignOut = true,
  isOpenMobile,
  onCloseMobile,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onSignOut,
}: SidebarProps) {
  const [chatToDelete, setChatToDelete] = useState<Chat | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleConfirmDelete = async () => {
    if (!chatToDelete) return;
    await onDeleteChat(chatToDelete.id);
    setChatToDelete(null);
  };

  const handleSignOut = async () => {
    if (!onSignOut) return;
    setIsSigningOut(true);
    try {
      await onSignOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  const sidebarBody = (
    <div className="flex h-full flex-col bg-[#F3EFE6] text-[#1C1917]">
      {/* Brand header */}
      <div className="flex items-center justify-between border-b border-[#E5DEC9] px-4 py-3.5">
        <Logo size="sm" showTagline />
        <button
          type="button"
          onClick={onCloseMobile}
          className="rounded-lg p-1.5 text-[#57534E] transition hover:bg-[#E7E0D1] hover:text-[#1C1917] lg:hidden"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* New Chat & Search */}
      <div className="space-y-2.5 p-3">
        <button
          type="button"
          onClick={() => {
            onNewChat();
            onCloseMobile();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#9A3412] px-3.5 py-2.5 text-sm font-medium text-[#FAF7F2] shadow-xs transition hover:bg-[#7C2D12] focus:outline-none focus:ring-2 focus:ring-[#9A3412]/50"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>New chat</span>
        </button>

        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#78716C]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search conversations…"
            aria-label="Search conversations"
            className="w-full rounded-xl border border-[#E5DEC9] bg-[#FAF7F2] py-2 pr-3 pl-9 text-sm text-[#1C1917] placeholder:text-[#78716C] focus:border-[#9A3412] focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Conversation list */}
      <nav
        className="flex-1 overflow-y-auto px-2.5 pb-3"
        aria-label="Previous conversations"
      >
        <div className="mb-1.5 px-2 text-[11px] font-semibold tracking-wider text-[#78716C] uppercase">
          Conversations
        </div>

        {isLoadingChats ? (
          <div className="space-y-2 px-1.5 pt-1" aria-busy="true">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-12 animate-pulse rounded-xl bg-[#E7E0D1]/80"
              />
            ))}
          </div>
        ) : chats.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#DDD4BE] px-3 py-6 text-center">
            <MessageSquare
              className="mx-auto mb-2 h-5 w-5 text-[#A8A29E]"
              aria-hidden="true"
            />
            <p className="text-xs font-medium text-[#57534E]">
              {searchQuery.trim()
                ? 'No matching conversations'
                : 'No conversations yet'}
            </p>
            <p className="mt-1 text-[11px] text-[#78716C]">
              {searchQuery.trim()
                ? 'Try a different keyword.'
                : 'Send your first message to begin.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-1">
            {chats.map((chat) => {
              const isActive = chat.id === activeChatId;
              return (
                <li key={chat.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectChat(chat.id);
                      onCloseMobile();
                    }}
                    className={`flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 pr-9 text-left transition focus:outline-none focus:ring-2 focus:ring-[#9A3412]/40 ${
                      isActive
                        ? 'bg-[#FFFFFF] text-[#1C1917] shadow-xs ring-1 ring-[#E5DEC9]'
                        : 'text-[#44403C] hover:bg-[#EAE3D3]'
                    }`}
                  >
                    <MessageSquare
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        isActive ? 'text-[#9A3412]' : 'text-[#78716C]'
                      }`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-snug">
                        {chat.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#78716C]">
                        {formatConversationDate(chat.updated_at)}
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setChatToDelete(chat);
                    }}
                    disabled={deletingChatId === chat.id}
                    aria-label={`Delete conversation ${chat.title}`}
                    title="Delete conversation"
                    className={`absolute top-1/2 right-1.5 -translate-y-1/2 rounded-lg p-1.5 text-[#78716C] transition hover:bg-red-50 hover:text-red-700 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-600/40 ${
                      isActive ? 'opacity-100' : 'opacity-100 lg:opacity-0 lg:group-hover:opacity-100'
                    }`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      {/* User profile & Sign out */}
      <div className="border-t border-[#E5DEC9] p-3">
        <div className="flex items-center justify-between gap-2 rounded-xl bg-[#FAF7F2] px-3 py-2.5 ring-1 ring-[#E5DEC9]">
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#14532D] text-xs font-semibold text-[#FAF7F2] uppercase"
              aria-hidden="true"
            >
              {userEmail.slice(0, 1) || 'U'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-[#1C1917]" title={userEmail}>
                {userEmail}
              </p>
              <p className="text-[11px] text-[#78716C]">
                {canSignOut ? 'Signed in' : 'Direct n8n session'}
              </p>
            </div>
          </div>

          {canSignOut && onSignOut && (
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              title="Sign out"
              aria-label="Sign out"
              className="shrink-0 rounded-lg p-1.5 text-[#57534E] transition hover:bg-[#EAE3D3] hover:text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#9A3412]/40 disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={Boolean(chatToDelete)}
        title="Delete conversation?"
        description={
          chatToDelete
            ? `This will permanently delete "${chatToDelete.title}" and all of its messages.`
            : ''
        }
        confirmLabel="Delete chat"
        isLoading={Boolean(chatToDelete && deletingChatId === chatToDelete.id)}
        onConfirm={handleConfirmDelete}
        onCancel={() => setChatToDelete(null)}
      />
    </div>
  );

  return (
    <>
      {/* Desktop persistent sidebar */}
      <aside className="hidden h-full w-72 shrink-0 border-r border-[#E5DEC9] lg:block">
        {sidebarBody}
      </aside>

      {/* Mobile slide-over drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-[#1C1917]/40 backdrop-blur-[1px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 h-full w-80 max-w-[85vw] border-r border-[#E5DEC9] shadow-2xl">
            {sidebarBody}
          </aside>
        </div>
      )}
    </>
  );
}
