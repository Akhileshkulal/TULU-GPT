const MAX_TITLE_LENGTH = 48;

/**
 * Derives a readable conversation title from the user's first message.
 */
export function generateChatTitle(rawMessage: string): string {
  const normalized = rawMessage.trim().replace(/\s+/g, ' ');
  if (!normalized) {
    return 'New chat';
  }
  if (normalized.length <= MAX_TITLE_LENGTH) {
    return normalized;
  }

  const sliced = normalized.slice(0, MAX_TITLE_LENGTH);
  const lastSpace = sliced.lastIndexOf(' ');
  const trimmed = lastSpace > 24 ? sliced.slice(0, lastSpace) : sliced;
  return `${trimmed.trim()}…`;
}

/**
 * Formats a timestamp for the sidebar conversation list.
 */
export function formatConversationDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfTarget.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }
  if (diffDays > 1 && diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/**
 * Formats a message timestamp in HH:MM format.
 */
export function formatMessageTime(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
