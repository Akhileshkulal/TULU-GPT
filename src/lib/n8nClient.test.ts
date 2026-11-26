import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildConversationSessionId } from './chatApi';
import { extractReplyFromPayload } from './n8nClient';

describe('n8nClient helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds isolated conversation sessionIds per user and chat', () => {
    const s1 = buildConversationSessionId('user-a', 'chat-1');
    const s2 = buildConversationSessionId('user-b', 'chat-1');
    const s3 = buildConversationSessionId('user-a', 'chat-2');

    expect(s1).toBe('user-a:chat-1');
    expect(s1).not.toBe(s2);
    expect(s1).not.toBe(s3);
  });

  it('extracts trimmed reply from standard n8n response object', () => {
    expect(extractReplyFromPayload({ reply: '  Kambala is a traditional buffalo race.  ' })).toBe(
      'Kambala is a traditional buffalo race.'
    );
  });

  it('extracts reply from single-element array response', () => {
    expect(extractReplyFromPayload([{ reply: 'Yaan hushar ulle!' }])).toBe(
      'Yaan hushar ulle!'
    );
  });

  it('throws readable error on empty reply or error field', () => {
    expect(() => extractReplyFromPayload({ reply: '   ' })).toThrow(
      'empty response'
    );
    expect(() => extractReplyFromPayload({ error: 'Workflow failed' })).toThrow(
      'Workflow failed'
    );
  });
});
