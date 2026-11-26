const N8N_TIMEOUT_MS = 45_000;

export class BackendApiError extends Error {
  readonly isCorsOrNetworkError: boolean;
  readonly statusCode?: number;

  constructor(
    message: string,
    options?: { isCorsOrNetworkError?: boolean; statusCode?: number }
  ) {
    super(message);
    this.name = 'BackendApiError';
    this.isCorsOrNetworkError = Boolean(options?.isCorsOrNetworkError);
    this.statusCode = options?.statusCode;
  }
}

export function getChatApiEndpoint(): string {
  return import.meta.env.VITE_N8N_WEBHOOK_URL?.trim() ?? '';
}

export const isDirectWebhookConfigured = Boolean(getChatApiEndpoint());

/**
 * Extracts and validates the `reply` string from the n8n Respond to Webhook JSON payload.
 */
export function extractReplyFromPayload(payload: unknown): string {
  if (Array.isArray(payload) && payload.length > 0) {
    return extractReplyFromPayload(payload[0]);
  }
  if (typeof payload !== 'object' || payload === null) {
    throw new BackendApiError(
      'Received an unexpected response format from TULU-GPT.'
    );
  }

  const record = payload as { reply?: unknown; error?: unknown; message?: unknown };
  if (typeof record.error === 'string' && record.error.trim()) {
    throw new BackendApiError(record.error.trim());
  }
  if (typeof record.reply !== 'string' || !record.reply.trim()) {
    throw new BackendApiError(
      'TULU-GPT returned an empty response. Please try again.'
    );
  }
  return record.reply.trim();
}

/**
 * Sends a chat message to the configured n8n webhook (or future server-side /api/chat route).
 * Keeps the exact original user message intact (English, Roman Tulu, or Kannada script).
 */
export async function sendMessageToN8n(params: {
  message: string;
  sessionId: string;
}): Promise<string> {
  const endpoint = getChatApiEndpoint();
  if (!endpoint) {
    throw new BackendApiError(
      'Chat endpoint is not configured. Set VITE_N8N_WEBHOOK_URL in .env.local.'
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), N8N_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        message: params.message,
        sessionId: params.sessionId,
      }),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new BackendApiError(
        'The request timed out while waiting for TULU-GPT. Please try again.'
      );
    }
    throw new BackendApiError(
      'Network or CORS error: Could not reach the TULU-GPT backend. Check your internet connection or n8n Allowed Origins (CORS) settings.',
      { isCorsOrNetworkError: true }
    );
  } finally {
    clearTimeout(timeoutId);
  }

  const rawText = await response.text();

  if (!response.ok) {
    let serverError = `TULU-GPT backend returned HTTP ${response.status}.`;
    if (rawText) {
      try {
        const parsedErr = JSON.parse(rawText) as { error?: string; message?: string };
        if (parsedErr?.error) {
          serverError = parsedErr.error;
        } else if (parsedErr?.message) {
          serverError = parsedErr.message;
        }
      } catch {
        // Keep status-based error message if response body is not JSON
      }
    }
    throw new BackendApiError(serverError, { statusCode: response.status });
  }

  if (!rawText.trim()) {
    throw new BackendApiError(
      'TULU-GPT returned an empty response. Please try again.'
    );
  }

  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(rawText);
  } catch {
    throw new BackendApiError(
      'TULU-GPT returned an invalid JSON response. Please try again.'
    );
  }

  return extractReplyFromPayload(parsedPayload);
}
