import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  Check,
  Copy,
  RefreshCw,
} from 'lucide-react';
import { formatMessageTime } from '../../lib/chatFormatters';
import { FormattedMessage } from '../../lib/markdown';
import type { FailedMessageRequest, Message } from '../../types/chat';

interface MessageListProps {
  messages: Message[];
  isLoadingMessages: boolean;
  isSending: boolean;
  failedRequest: FailedMessageRequest | null;
  onRetry: () => void;
}

export function MessageList({
  messages,
  isLoadingMessages,
  isSending,
  failedRequest,
  onRetry,
}: MessageListProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const bottomSentinelRef = useRef<HTMLDivElement | null>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const previousCountRef = useRef(0);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setIsNearBottom(distanceFromBottom < 96);
  };

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    const userJustSent =
      messages.length > previousCountRef.current && lastMessage?.role === 'user';
    previousCountRef.current = messages.length;

    if (isNearBottom || userJustSent) {
      bottomSentinelRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isSending, failedRequest, isNearBottom]);

  const scrollToBottom = () => {
    bottomSentinelRef.current?.scrollIntoView({ behavior: 'smooth' });
    setIsNearBottom(true);
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((curr) => (curr === id ? null : curr)), 1800);
    } catch {
      // Clipboard API unavailable
    }
  };

  if (isLoadingMessages) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6" aria-busy="true">
        <div className="mx-auto max-w-3xl space-y-5">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`flex ${idx % 2 === 1 ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`h-16 animate-pulse rounded-2xl ${
                  idx % 2 === 1 ? 'w-2/3 bg-[#E7E0D1]' : 'w-4/5 bg-[#EFECE4]'
                }`}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto px-4 py-6 sm:px-6"
      >
        <div className="mx-auto max-w-3xl space-y-5">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';

            if (isUser) {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[85%] sm:max-w-[75%]">
                    <div className="rounded-2xl rounded-br-sm bg-[#292524] px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap text-[#FAF7F2] shadow-xs">
                      {msg.content}
                    </div>
                    <p className="mt-1 text-right text-[11px] text-[#78716C]">
                      {formatMessageTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            }

            return (
              <div key={msg.id} className="flex items-start gap-3">
                <div
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#9A3412] text-xs font-bold text-[#FAF7F2] shadow-xs"
                  aria-hidden="true"
                >
                  T
                </div>
                <div className="min-w-0 flex-1">
                  <div className="rounded-2xl rounded-tl-sm border border-[#E5DEC9] bg-white px-4 py-3.5 shadow-2xs">
                    <FormattedMessage content={msg.content} />
                  </div>
                  <div className="mt-1.5 flex items-center gap-3 px-1">
                    <span className="text-[11px] text-[#78716C]">
                      {formatMessageTime(msg.created_at)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-[#78716C] transition hover:bg-[#EFE8DC] hover:text-[#1C1917]"
                      aria-label="Copy response"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="h-3 w-3 text-[#14532D]" />
                          <span className="text-[#14532D]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {isSending && (
            <div className="flex items-start gap-3" aria-live="polite">
              <div
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#9A3412] text-xs font-bold text-[#FAF7F2]"
                aria-hidden="true"
              >
                T
              </div>
              <div className="rounded-2xl rounded-tl-sm border border-[#E5DEC9] bg-white px-4 py-3.5 shadow-2xs">
                <div className="flex items-center gap-2.5 text-sm text-[#57534E]">
                  <span className="inline-flex gap-1" aria-hidden="true">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[#9A3412] [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[#9A3412] [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[#9A3412]" />
                  </span>
                  <span>Searching Tulunadu knowledge base…</span>
                </div>
              </div>
            </div>
          )}

          {failedRequest && !isSending && (
            <div
              role="alert"
              className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50/90 p-4 text-sm text-red-900 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" aria-hidden="true" />
                <div>
                  <p className="font-medium">Unable to generate a reply</p>
                  <p className="mt-0.5 text-xs text-red-800">
                    {failedRequest.errorMessage}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-red-700 px-3.5 py-2 text-xs font-medium text-white transition hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-600/40"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Retry</span>
              </button>
            </div>
          )}

          <div ref={bottomSentinelRef} className="h-1" />
        </div>
      </div>

      {!isNearBottom && messages.length > 0 && (
        <button
          type="button"
          onClick={scrollToBottom}
          aria-label="Scroll to latest message"
          className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-[#E5DEC9] bg-white px-3 py-1.5 text-xs font-medium text-[#44403C] shadow-md transition hover:bg-[#FAF7F2]"
        >
          <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Latest</span>
        </button>
      )}
    </div>
  );
}
