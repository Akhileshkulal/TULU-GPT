import { useEffect, useRef, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowUp, Loader2 } from 'lucide-react';

interface MessageComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (message: string) => Promise<boolean>;
  isSending: boolean;
  disabled?: boolean;
}

export function MessageComposer({
  value,
  onChange,
  onSend,
  isSending,
  disabled = false,
}: MessageComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  const submitMessage = async () => {
    if (isSending || disabled || !value.trim()) return;
    const text = value;
    onChange('');
    const sent = await onSend(text);
    if (!sent) {
      onChange(text);
    }
    textareaRef.current?.focus();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await submitMessage();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submitMessage();
    }
  };

  const canSend = Boolean(value.trim()) && !isSending && !disabled;

  return (
    <div className="border-t border-[#E5DEC9] bg-[#FAF7F2]/95 px-3 py-3 sm:px-6 sm:py-4">
      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
        <div className="flex items-end gap-2 rounded-2xl border border-[#DDD4BE] bg-white p-2 shadow-xs transition focus-within:border-[#9A3412] focus-within:ring-2 focus-within:ring-[#9A3412]/15">
          <label htmlFor="chat-composer" className="sr-only">
            Message TULU-GPT
          </label>
          <textarea
            id="chat-composer"
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending || disabled}
            placeholder="Ask in English, Roman Tulu (Encha ullar?), or Kannada script…"
            maxLength={4000}
            className="max-h-40 min-h-[42px] flex-1 resize-none bg-transparent px-2.5 py-2 text-[15px] leading-relaxed text-[#1C1917] placeholder:text-[#78716C] focus:outline-none disabled:opacity-60"
          />

          <button
            type="submit"
            disabled={!canSend}
            aria-label={isSending ? 'Sending message' : 'Send message'}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#9A3412] text-[#FAF7F2] transition hover:bg-[#7C2D12] focus:outline-none focus:ring-2 focus:ring-[#9A3412]/50 disabled:cursor-not-allowed disabled:bg-[#D6CFC2] disabled:text-[#78716C]"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <ArrowUp className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>

        <div className="mt-1.5 flex items-center justify-between px-1 text-[11px] text-[#78716C]">
          <span className="hidden sm:inline">
            Press <kbd className="rounded border border-[#DDD4BE] bg-white px-1">Enter</kbd>{' '}
            to send, <kbd className="rounded border border-[#DDD4BE] bg-white px-1">Shift + Enter</kbd>{' '}
            for a new line
          </span>
          <span className="sm:hidden">Tap send to ask TULU-GPT</span>
          {value.length > 3200 && (
            <span className={value.length >= 3900 ? 'text-red-700' : ''}>
              {value.length}/4000
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
