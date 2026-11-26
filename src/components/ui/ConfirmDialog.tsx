import { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Delete',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isLoading) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C1917]/40 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
    >
      <div className="w-full max-w-md rounded-2xl border border-[#E5DEC9] bg-[#FFFFFF] p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 id="confirm-dialog-title" className="text-base font-semibold text-[#1C1917]">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-lg p-1.5 text-[#78716C] transition hover:bg-[#F3EFE6] hover:text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#9A3412]/40 disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p id="confirm-dialog-desc" className="mt-3 text-sm leading-relaxed text-[#57534E]">
          {description}
        </p>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-xl border border-[#E5DEC9] bg-white px-4 py-2 text-sm font-medium text-[#44403C] transition hover:bg-[#FAF7F2] focus:outline-none focus:ring-2 focus:ring-[#9A3412]/40 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="rounded-xl bg-red-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-600/40 disabled:opacity-60"
          >
            {isLoading ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
