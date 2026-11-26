import { createClient } from '@supabase/supabase-js';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_MESSAGE_LENGTH = 4000;
const N8N_TIMEOUT_MS = 45_000;

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function extractReply(payload: unknown): string | null {
  if (Array.isArray(payload) && payload.length > 0) {
    return extractReply(payload[0]);
  }
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }
  const record = payload as Record<string, unknown>;
  if (typeof record.reply === 'string' && record.reply.trim().length > 0) {
    return record.reply.trim();
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL')?.trim();
  const n8nWebhookSecret = Deno.env.get('N8N_WEBHOOK_SECRET')?.trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables.');
    return jsonResponse({ error: 'Server authentication is misconfigured.' }, 500);
  }

  if (!n8nWebhookUrl) {
    console.error('Missing N8N_WEBHOOK_URL Edge Function secret.');
    return jsonResponse(
      { error: 'AI backend webhook is not configured yet.' },
      500
    );
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Missing or invalid authorization header.' }, 401);
  }

  // Verify the caller's JWT with Supabase Auth (never trust userId from request body)
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: authHeader },
    },
  });

  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser();

  if (authError || !user) {
    return jsonResponse({ error: 'Unauthorized or expired session.' }, 401);
  }

  let body: { chatId?: unknown; message?: unknown };
  try {
    body = (await req.json()) as { chatId?: unknown; message?: unknown };
  } catch {
    return jsonResponse({ error: 'Invalid JSON request body.' }, 400);
  }

  const chatId = typeof body.chatId === 'string' ? body.chatId.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (!UUID_REGEX.test(chatId)) {
    return jsonResponse({ error: 'A valid chatId UUID is required.' }, 400);
  }

  if (!message) {
    return jsonResponse({ error: 'Message cannot be empty.' }, 400);
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return jsonResponse(
      { error: `Message exceeds ${MAX_MESSAGE_LENGTH} character limit.` },
      400
    );
  }

  // Confirm the chat exists and belongs to the authenticated user (RLS enforces user_id = auth.uid())
  const { data: chatRow, error: chatError } = await supabaseClient
    .from('chats')
    .select('id, user_id')
    .eq('id', chatId)
    .maybeSingle();

  if (chatError) {
    console.error('Failed to verify chat ownership:', chatError.message);
    return jsonResponse({ error: 'Unable to verify conversation access.' }, 500);
  }

  if (!chatRow || chatRow.user_id !== user.id) {
    return jsonResponse({ error: 'Conversation not found.' }, 404);
  }

  // Forward validated request to n8n Webhook Trigger
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), N8N_TIMEOUT_MS);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (n8nWebhookSecret) {
      headers['x-webhook-secret'] = n8nWebhookSecret;
    }

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        message,
        sessionId: `${user.id}:${chatId}`,
        chatId,
        userId: user.id,
      }),
    });

    const rawText = await n8nResponse.text();

    if (!n8nResponse.ok) {
      console.error(`n8n webhook returned HTTP ${n8nResponse.status}:`, rawText);
      return jsonResponse(
        { error: 'TULU-GPT AI workflow could not process this request.' },
        502
      );
    }

    let parsedPayload: unknown;
    try {
      parsedPayload = JSON.parse(rawText);
    } catch {
      console.error('n8n webhook returned non-JSON body:', rawText);
      return jsonResponse(
        { error: 'AI workflow returned an invalid response format.' },
        502
      );
    }

    const reply = extractReply(parsedPayload);
    if (!reply) {
      console.error('n8n webhook JSON missing "reply" field:', parsedPayload);
      return jsonResponse(
        { error: 'AI workflow response did not contain a reply.' },
        502
      );
    }

    return jsonResponse({ reply }, 200);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return jsonResponse(
        { error: 'TULU-GPT took too long to respond. Please retry.' },
        504
      );
    }
    console.error('Error calling n8n webhook:', err);
    return jsonResponse(
      { error: 'Unable to connect to the TULU-GPT AI workflow.' },
      502
    );
  } finally {
    clearTimeout(timeoutId);
  }
});
