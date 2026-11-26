import { describe, expect, it } from 'vitest';
import {
  formatConversationDate,
  formatMessageTime,
  generateChatTitle,
} from './chatFormatters';
import { parseAssistantResponse, validateUserMessage } from './chatApi';

describe('generateChatTitle', () => {
  it('returns New chat for empty or whitespace input', () => {
    expect(generateChatTitle('   ')).toBe('New chat');
  });

  it('keeps short messages intact with normalized whitespace', () => {
    expect(generateChatTitle('  Encha   ullar?  ')).toBe('Encha ullar?');
  });

  it('truncates long messages cleanly at word boundaries', () => {
    const title = generateChatTitle(
      'Can you explain the origins and cultural significance of Bhoota Kola in Tulunadu?'
    );
    expect(title.length).toBeLessThanOrEqual(49);
    expect(title.endsWith('…')).toBe(true);
  });
});

describe('validateUserMessage', () => {
  it('trims valid messages', () => {
    expect(validateUserMessage('  Encha ullar?  ')).toBe('Encha ullar?');
  });

  it('throws on blank messages', () => {
    expect(() => validateUserMessage('   \n  ')).toThrow(
      'Please enter a message before sending.'
    );
  });

  it('throws when exceeding max length', () => {
    const oversized = 'a'.repeat(4001);
    expect(() => validateUserMessage(oversized)).toThrow('Message is too long');
  });
});

describe('parseAssistantResponse', () => {
  it('returns trimmed reply when valid', () => {
    expect(parseAssistantResponse({ reply: '  Yaan hushar ulle!  ' })).toBe(
      'Yaan hushar ulle!'
    );
  });

  it('throws when payload has an error field', () => {
    expect(() => parseAssistantResponse({ error: 'Unauthorized' })).toThrow(
      'Unauthorized'
    );
  });

  it('throws when reply is missing or blank', () => {
    expect(() => parseAssistantResponse({})).toThrow('empty reply');
    expect(() => parseAssistantResponse({ reply: '   ' })).toThrow('empty reply');
  });
});

describe('date formatters', () => {
  it('handles invalid dates gracefully', () => {
    expect(formatConversationDate('not-a-date')).toBe('');
    expect(formatMessageTime('not-a-date')).toBe('');
  });

  it('formats valid ISO timestamps', () => {
    const nowIso = new Date().toISOString();
    expect(formatConversationDate(nowIso).length).toBeGreaterThan(0);
    expect(formatMessageTime(nowIso).length).toBeGreaterThan(0);
  });
});
