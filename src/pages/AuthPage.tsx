import { useState, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Logo } from '../components/ui/Logo';

interface AuthPageProps {
  isConfigured: boolean;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<{ needsEmailConfirmation: boolean }>;
}

export function AuthPage({ isConfigured, onSignIn, onSignUp }: AuthPageProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const switchMode = (nextMode: 'signin' | 'signup') => {
    setMode(nextMode);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (mode === 'signup' && password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'signin') {
        await onSignIn(trimmedEmail, password);
      } else {
        const result = await onSignUp(trimmedEmail, password);
        if (result.needsEmailConfirmation) {
          setSuccessMessage(
            'Account created! Check your email inbox to confirm your address before signing in.'
          );
          setMode('signin');
          setPassword('');
          setConfirmPassword('');
        }
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Authentication failed. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAF7F2] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-[#E5DEC9] bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size="lg" />
          <h1 className="mt-4 text-xl font-semibold text-[#1C1917]">
            {mode === 'signin' ? 'Welcome back to TULU-GPT' : 'Create your TULU-GPT account'}
          </h1>
          <p className="mt-1.5 text-sm text-[#57534E]">
            Your personal assistant for Tulu language and Tulunadu heritage.
          </p>
        </div>

        {!isConfigured && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-950"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div>
              <p className="font-semibold">Supabase configuration required</p>
              <p className="mt-0.5">
                Copy <code className="font-mono">.env.example</code> to{' '}
                <code className="font-mono">.env</code> and add{' '}
                <code className="font-mono">VITE_SUPABASE_URL</code> and{' '}
                <code className="font-mono">VITE_SUPABASE_ANON_KEY</code>.
              </p>
            </div>
          </div>
        )}

        {/* Mode Tabs */}
        <div
          className="mb-5 grid grid-cols-2 rounded-xl bg-[#F3EFE6] p-1"
          role="tablist"
          aria-label="Authentication mode"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signin'}
            onClick={() => switchMode('signin')}
            className={`rounded-lg py-2 text-sm font-medium transition ${
              mode === 'signin'
                ? 'bg-white text-[#1C1917] shadow-2xs'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            onClick={() => switchMode('signup')}
            className={`rounded-lg py-2 text-sm font-medium transition ${
              mode === 'signup'
                ? 'bg-white text-[#1C1917] shadow-2xs'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            Sign up
          </button>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-relaxed text-red-900"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-900"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="auth-email"
              className="mb-1.5 block text-xs font-medium text-[#44403C]"
            >
              Email address
            </label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-[#DDD4BE] bg-[#FAF7F2]/60 px-3.5 py-2.5 text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:border-[#9A3412] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#9A3412]/15"
            />
          </div>

          <div>
            <label
              htmlFor="auth-password"
              className="mb-1.5 block text-xs font-medium text-[#44403C]"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full rounded-xl border border-[#DDD4BE] bg-[#FAF7F2]/60 py-2.5 pr-10 pl-3.5 text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:border-[#9A3412] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#9A3412]/15"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1 text-[#78716C] hover:text-[#1C1917]"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label
                htmlFor="auth-confirm-password"
                className="mb-1.5 block text-xs font-medium text-[#44403C]"
              >
                Confirm password
              </label>
              <input
                id="auth-confirm-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="w-full rounded-xl border border-[#DDD4BE] bg-[#FAF7F2]/60 px-3.5 py-2.5 text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:border-[#9A3412] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#9A3412]/15"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !isConfigured}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#9A3412] px-4 py-2.5 text-sm font-semibold text-[#FAF7F2] shadow-xs transition hover:bg-[#7C2D12] focus:outline-none focus:ring-2 focus:ring-[#9A3412]/50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            <span>{mode === 'signin' ? 'Sign in' : 'Create account'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
