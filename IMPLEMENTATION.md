# TULU-GPT Web Application --- Implementation Guide

## 1. Project goal

Build a polished, responsive web application for **TULU-GPT**, an AI
assistant focused on the Tulu language, culture, traditions, food,
history, and geography of Tulunadu (Karnataka, India).

The application must use the existing n8n AI workflow as its AI backend.
Do not rebuild the RAG pipeline or replace the existing Gemini/Pinecone
setup.

### Confirmed stack

-   Frontend: React + Vite
-   Language: TypeScript preferred
-   Styling: Tailwind CSS
-   Backend/data/auth: Supabase
-   AI orchestration: Existing n8n workflow
-   LLM: Google Gemini through n8n
-   Vector database: Existing Pinecone index
-   Hosting: Vercel

## 2. Existing n8n workflows

There are two existing workflows.

### A. `Pre-dataprocessing` --- keep as it is

Current flow:

1.  Google Drive Trigger watches the `TULU-GPT` folder for new files.
2.  Download file.
3.  Extract Text.
4.  Split Into Sections (code node; currently uses a maximum of 8,000
    characters per section).
5.  Loop Over Sections.
6.  Default Data Loader with metadata such as `file_name` and `section`.
7.  Recursive Character Text Splitter (chunk overlap configured as 200).
8.  Google Gemini Embeddings.
9.  Pinecone Vector Store in insert mode.
10. Wait node used for rate limiting.

Do not change this workflow unless a real integration issue requires it.

### B. `Retrival` --- existing AI retrieval workflow

Current components:

-   Chat Trigger
-   AI Agent
-   Google Gemini Chat Model
-   Simple Memory (context window length 10)
-   Pinecone Vector Store in retrieve-as-tool mode
-   Google Gemini Embeddings

The AI Agent system prompt contains important project-specific behavior.
Preserve it:

-   TULU-GPT is dedicated to Tulu language, culture, traditions, and
    geography of Tulunadu.
-   If the user writes Tulu in Roman/English script, understand it as
    Tulu.
-   Reply in the language/script appropriate to the user's input:
    -   Tulu in Roman script: Tulu Roman script or English.
    -   Tulu/Kannada script: Tulu/Kannada script.
    -   English: English.
-   Search the knowledge base before answering every question.
-   Search using relevant English terms and original Tulu words when
    applicable.
-   Ground answers in retrieved context; do not invent Tulu words,
    meanings, rituals, or facts.
-   If the knowledge base has no answer, say so honestly.
-   Keep answers warm, clear, and concise.
-   For Tulu vocabulary, show Roman Tulu, Kannada script if known, and
    English meaning.

Preserve the existing Gemini model, Pinecone index, embedding model, and
retrieval configuration.

## 3. Application features

Build the following features.

### Authentication

-   Sign up with email and password.
-   Sign in with email and password.
-   Sign out.
-   Persist the authenticated session using Supabase Auth.
-   Provide clear loading, validation, and error states.
-   Protect chat routes so unauthenticated users are redirected to sign
    in.
-   Do not expose Supabase service-role keys or other server secrets in
    the browser.

### Chat application

-   Responsive desktop and mobile layout.
-   Sidebar with:
    -   TULU-GPT branding.
    -   New Chat button.
    -   Searchable or filterable conversation list if practical.
    -   Previous conversation titles and timestamps.
    -   User profile area and logout.
-   Main chat area with:
    -   Welcome screen when no conversation is selected.
    -   User and assistant message bubbles.
    -   Message timestamps where appropriate.
    -   Clear loading / assistant-thinking indicator.
    -   Error state with retry option.
    -   Auto-scroll to latest message without disrupting users who
        scroll upward.
-   Composer:
    -   Multiline input.
    -   Send button.
    -   Enter to send; Shift+Enter for newline.
    -   Disable sending while a request is in progress.
    -   Keep the input usable on mobile.
-   New conversation:
    -   Create a conversation record when the user starts the first
        message.
    -   Generate a useful title from the first user message (simple
        truncation is acceptable initially).
-   Conversation history:
    -   Load only the signed-in user's conversations.
    -   Selecting a conversation loads its messages in chronological
        order.
    -   Reopening a conversation must show its previous messages.
    -   Continue a conversation by sending another message.
    -   Delete a conversation with confirmation; deleting it must also
        delete its messages.
-   Empty states and helpful onboarding text.

### Visual direction

Create a polished, modern AI chat interface. It should feel like a
finished product, not an admin dashboard or a generic template.

Suggested design: - Calm, warm, contemporary visual identity inspired
subtly by Tulunadu. - Use a restrained palette, strong contrast,
readable typography, and generous spacing. - Avoid excessive gradients,
glassmorphism, oversized cards, and unnecessary animations. - Make the
chat content the visual focus. - Use accessible buttons, labels, focus
states, and keyboard navigation. - Include a simple TULU-GPT
logo/wordmark using text or a small original CSS/SVG treatment; do not
use unlicensed brand assets. - Ensure good responsive behavior at
mobile, tablet, and desktop widths.

## 4. Supabase database design

Create SQL migrations in the project, for example
`supabase/migrations/001_initial_schema.sql`.

### Table: `chats`

Suggested columns:

-   `id uuid primary key default gen_random_uuid()`
-   `user_id uuid not null references auth.users(id) on delete cascade`
-   `title text not null default 'New chat'`
-   `created_at timestamptz not null default now()`
-   `updated_at timestamptz not null default now()`

Add an index on `(user_id, updated_at desc)`.

### Table: `messages`

Suggested columns:

-   `id uuid primary key default gen_random_uuid()`
-   `chat_id uuid not null references public.chats(id) on delete cascade`
-   `user_id uuid not null references auth.users(id) on delete cascade`
-   `role text not null check (role in ('user', 'assistant'))`
-   `content text not null`
-   `created_at timestamptz not null default now()`

Add an index on `(chat_id, created_at asc)` and, if useful,
`(user_id, created_at desc)`.

### Row Level Security

Enable RLS on both tables.

Policies must ensure: - A user can select only their own chats. - A user
can insert chats only with their own `user_id`. - A user can
update/delete only their own chats. - A user can select messages only
when they belong to a chat owned by them. - A user can insert messages
only into a chat they own, and the message `user_id` must equal
`auth.uid()`. - A user can delete messages only from their own chats. -
Do not rely only on frontend filtering for authorization.

Use SQL policy checks based on `auth.uid()` and an ownership check
against `public.chats`.

Add an `updated_at` trigger for chats, or update it explicitly whenever
a message is added.

## 5. Secure n8n integration

### Important security rule

Do not call a secret n8n production webhook directly from browser code
if it is intended to be private. Do not put webhook secrets, Gemini
keys, Pinecone keys, database passwords, or Supabase service-role keys
in `VITE_` environment variables.

Preferred architecture:

**React app → Supabase Edge Function → n8n webhook → Gemini/Pinecone →
Edge Function → React app**

The Supabase Edge Function should:

1.  Receive the user's Supabase access token.
2.  Verify the token and identify the authenticated user.
3.  Validate `chatId` and `message`.
4.  Confirm the chat belongs to the authenticated user.
5.  Call the n8n production webhook using a server-side secret.
6.  Pass a minimal JSON body containing `message`, `chatId`, and
    authenticated `userId`.
7.  Validate the n8n response and return a consistent JSON response.
8.  Never trust a `userId` supplied by the browser without verifying it.

Use Supabase Edge Function secrets for: - `N8N_WEBHOOK_URL` -
`N8N_WEBHOOK_SECRET` (if configured in n8n)

The Edge Function should send a shared secret in a header, and the n8n
workflow should verify it before processing requests. If the chosen n8n
deployment supports webhook authentication, configure it too.

### Expected request from frontend to Edge Function

``` json
{
  "chatId": "uuid",
  "message": "Encha ullar?"
}
```

The user ID should be derived from the verified Supabase JWT on the
server, not trusted from the request body.

### Expected payload from Edge Function to n8n

``` json
{
  "message": "Encha ullar?",
  "chatId": "uuid",
  "userId": "authenticated-user-uuid"
}
```

### Expected n8n response

``` json
{
  "reply": "AI-generated answer"
}
```

Handle errors, timeouts, invalid JSON, and missing `reply` values
gracefully.

## 6. Message persistence and request flow

For each user message:

1.  Confirm the user is authenticated.
2.  Create a chat if this is a new conversation.
3.  Insert the user's message into `messages`.
4.  Call the Supabase Edge Function.
5.  The Edge Function verifies the user and calls n8n.
6.  n8n retrieves relevant context from Pinecone and generates the
    answer with Gemini.
7.  Receive the assistant reply.
8.  Insert the assistant reply into `messages`.
9.  Update the chat's `updated_at`.
10. Render the assistant reply in the UI.

If the AI call fails, retain the user message and show a retry option.
Avoid inserting duplicate user messages when retrying an AI request.

Load the message history from Supabase when a conversation is opened.

### Conversation memory

The Supabase `messages` table is the durable chat history used by the
UI.

For conversational context inside the AI workflow, implement persistent
memory separately. Preferred option: n8n PostgreSQL Chat Memory
connected to the same Supabase PostgreSQL database, using a stable
session key based on the authenticated user's ID and chat ID (for
example, `userId:chatId`).

Do not assume that storing messages in Supabase automatically gives the
n8n AI Agent access to that history. They are separate responsibilities.

If PostgreSQL Chat Memory is configured, ensure the memory table/schema
and connection are compatible with n8n's supported PostgreSQL Chat
Memory node. Do not expose database credentials to the frontend. If
direct database access from n8n is not available, retrieve recent
messages server-side and pass only the necessary context through a
secure backend design.

## 7. Environment variables

Create `.env.example` with placeholders only:

``` env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

These two values are intended for the browser. The Supabase
anon/publishable key is safe to expose only when RLS is correctly
configured.

Keep server-only values in Supabase Edge Function secrets, never in the
Vite frontend: - `N8N_WEBHOOK_URL` - `N8N_WEBHOOK_SECRET`

Do not commit `.env` files. Add them to `.gitignore`.

## 8. Suggested project structure

Use a clean, maintainable structure such as:

``` text
tulu-gpt/
├── public/
├── src/
│   ├── components/
│   │   ├── chat/
│   │   ├── layout/
│   │   └── ui/
│   ├── pages/
│   ├── hooks/
│   ├── lib/
│   │   ├── supabase.ts
│   │   └── chatApi.ts
│   ├── types/
│   ├── App.tsx
│   └── main.tsx
├── supabase/
│   ├── migrations/
│   └── functions/
│       └── chat/
├── .env.example
├── .gitignore
├── IMPLEMENTATION.md
└── README.md
```

Adapt this structure if the repository already has a sensible structure.
Do not overwrite existing user work without checking it first.

## 9. Implementation quality requirements

-   Use TypeScript types for chats, messages, and API responses.
-   Separate UI components from data-access logic.
-   Use reusable components.
-   Add clear loading, empty, success, and error states.
-   Validate user input.
-   Handle expired sessions.
-   Use accessible semantic HTML.
-   Avoid hardcoded credentials and fake production data.
-   Do not use localStorage as the permanent chat database.
-   Do not create fake chat history to make the UI look populated.
-   Ensure RLS is enabled and tested.
-   Add basic tests for important data and API behavior where practical.
-   Run lint/build checks and fix errors.
-   Keep dependencies minimal.
-   Do not silently replace the existing n8n workflow or change its
    system prompt.

## 10. Deployment checklist

### Supabase

-   Create Supabase project.
-   Apply SQL migrations.
-   Enable email/password authentication.
-   Configure allowed redirect URLs.
-   Deploy the Edge Function.
-   Set server-side n8n secrets.
-   Test RLS using two different test users.

### n8n

-   Keep the preprocessing workflow unchanged.
-   Configure the retrieval workflow with a production webhook.
-   Verify the shared secret/authentication.
-   Map incoming `message` to the AI Agent prompt.
-   Return JSON containing `reply`.
-   Preserve Gemini and Pinecone connections.
-   Configure persistent memory separately if required.

### Vercel

-   Import the frontend Git repository.
-   Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
-   Configure the correct build command (`npm run build`) and output
    directory (`dist`).
-   Add SPA rewrite configuration if needed.
-   Add the deployed Vercel URL to Supabase Auth redirect settings.
-   Test signup, login, chat, history, delete, logout, and mobile
    layout.

## 11. Work in small milestones

Do not attempt everything in one unverified change. Work in this order:

1.  Inspect the existing repository and report its current structure.
2.  Create the React + Vite + Tailwind application shell.
3.  Build the responsive TULU-GPT UI using realistic empty states, not
    fake conversations.
4.  Add Supabase client configuration and SQL migrations.
5.  Implement signup, login, logout, and protected routes.
6.  Implement chat creation, message persistence, history loading, and
    deletion.
7.  Implement the Supabase Edge Function that securely calls n8n.
8.  Connect the UI to the Edge Function.
9.  Test all flows and fix issues.
10. Prepare Vercel deployment instructions.

After each milestone: - List files created or changed. - Explain any
dashboard action the developer must perform manually. - Run relevant
checks. - Report what is complete and what is blocked. - Do not claim a
feature works until it has been tested.

## 12. First action for the coding agent

Start by inspecting the current workspace and repository. Then:

1.  Tell me whether the workspace is empty or contains an existing
    project.
2.  Identify the package manager and current framework if one exists.
3.  Check for existing environment files without printing secret values.
4.  Propose the exact implementation plan for this repository.
5.  Begin with the frontend shell and design.

Do not ask me to paste API keys into source code. Use placeholders and
explain exactly where I must configure secrets in Supabase and n8n.
