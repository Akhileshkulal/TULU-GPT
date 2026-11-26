import { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { getOrCreatePrototypeClientId } from './lib/localStore';
import { isDirectWebhookConfigured } from './lib/n8nClient';
import { AuthPage } from './pages/AuthPage';
import { ChatPage } from './pages/ChatPage';

export function App() {
  const { user, isLoading, isConfigured, signIn, signUp, signOut } = useAuth();
  const prototypeUserId = useMemo(() => getOrCreatePrototypeClientId(), []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#FAF7F2] text-[#57534E]">
        <Loader2 className="h-6 w-6 animate-spin text-[#9A3412]" aria-hidden="true" />
        <p className="text-sm font-medium">Loading TULU-GPT…</p>
      </div>
    );
  }

  // If Supabase Auth is not configured yet, allow direct n8n prototype mode
  if (!isConfigured && isDirectWebhookConfigured) {
    return (
      <ChatPage
        userId={prototypeUserId}
        userEmail="Local Session"
        canSignOut={false}
      />
    );
  }

  if (!user) {
    return (
      <AuthPage
        isConfigured={isConfigured}
        onSignIn={signIn}
        onSignUp={signUp}
      />
    );
  }

  return (
    <ChatPage
      userId={user.id}
      userEmail={user.email ?? 'User'}
      canSignOut
      onSignOut={signOut}
    />
  );
}

export default App;
