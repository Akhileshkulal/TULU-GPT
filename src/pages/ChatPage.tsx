import { useState } from 'react';
import { AlertCircle, Menu, Plus, X } from 'lucide-react';
import { Sidebar } from '../components/layout/Sidebar';
import { WelcomeScreen } from '../components/chat/WelcomeScreen';
import { MessageList } from '../components/chat/MessageList';
import { MessageComposer } from '../components/chat/MessageComposer';
import { useChatWorkspace } from '../hooks/useChatWorkspace';

interface ChatPageProps {
  userId: string;
  userEmail: string;
  canSignOut?: boolean;
  onSignOut?: () => Promise<void>;
}

export function ChatPage({
  userId,
  userEmail,
  canSignOut = true,
  onSignOut,
}: ChatPageProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [composerDraft, setComposerDraft] = useState('');

  const {
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
    clearWorkspaceError,
    failedRequest,
    selectChat,
    startNewChat,
    sendMessage,
    retryFailedMessage,
    deleteChat,
  } = useChatWorkspace({
    userId,
    onSessionExpired: async () => {
      if (onSignOut) {
        await onSignOut();
      }
    },
  });

  const handleStarterPrompt = async (prompt: string) => {
    setComposerDraft('');
    await sendMessage(prompt);
  };

  const showWelcome = !activeChatId && messages.length === 0 && !isLoadingMessages;

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#FAF7F2] text-[#1C1917]">
      <Sidebar
        chats={filteredChats}
        activeChatId={activeChatId}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isLoadingChats={isLoadingChats}
        deletingChatId={deletingChatId}
        userEmail={userEmail}
        canSignOut={canSignOut}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onNewChat={() => {
          startNewChat();
          setComposerDraft('');
        }}
        onSelectChat={selectChat}
        onDeleteChat={deleteChat}
        onSignOut={onSignOut}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#E5DEC9] bg-[#FAF7F2]/90 px-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              aria-label="Open conversations menu"
              className="rounded-xl p-2 text-[#44403C] transition hover:bg-[#EFE8DC] focus:outline-none focus:ring-2 focus:ring-[#9A3412]/40 lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <h2 className="truncate text-sm font-semibold text-[#1C1917]">
              {activeChat ? activeChat.title : 'New conversation'}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => {
              startNewChat();
              setComposerDraft('');
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#DDD4BE] bg-white px-3 py-1.5 text-xs font-medium text-[#44403C] transition hover:bg-[#F3EFE6] focus:outline-none focus:ring-2 focus:ring-[#9A3412]/40 lg:hidden"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>New</span>
          </button>
        </header>

        {workspaceError && (
          <div
            role="alert"
            className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-900 sm:mx-6"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-700" aria-hidden="true" />
              <span>{workspaceError}</span>
            </div>
            <button
              type="button"
              onClick={clearWorkspaceError}
              aria-label="Dismiss error"
              className="rounded p-1 text-red-700 hover:bg-red-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {showWelcome ? (
          <WelcomeScreen onSelectPrompt={handleStarterPrompt} disabled={isSending} />
        ) : (
          <MessageList
            messages={messages}
            isLoadingMessages={isLoadingMessages}
            isSending={isSending}
            failedRequest={failedRequest}
            onRetry={retryFailedMessage}
          />
        )}

        <MessageComposer
          value={composerDraft}
          onChange={setComposerDraft}
          onSend={sendMessage}
          isSending={isSending}
        />
      </main>
    </div>
  );
}
