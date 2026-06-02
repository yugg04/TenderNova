'use client';

import Link from 'next/link';
import { getProviders, signIn, signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Mail, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

type Step = 'form' | 'otp' | 'verified';

export default function LoginPage() {
  const [mode, setMode] = useState('login');
  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [providers, setProviders] = useState<Record<string, any>>({});
  const [pending, setPending] = useState({ email: '', password: '' });
  const router = useRouter();
  const toast = useToast();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('mode') === 'register') setMode('register');
    getProviders().then(data => setProviders(data ?? {}));
  }, []);

  useEffect(() => {
    if (!resendSeconds) return;
    const id = window.setInterval(() => setResendSeconds(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(id);
  }, [resendSeconds]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim().toLowerCase();
    const password = String(form.get('password') ?? '');

    setLoading(true);
    if (mode === 'register') {
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name: form.get('name') })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? 'Could not create account.');
        if (result.verified) {
          toast(result.warning ?? 'Account created successfully.', 'success');
          const login = await signIn('credentials', { redirect: false, email, password });
          if (login?.ok) router.push('/dashboard');
          else setMode('login');
          return;
        }
        setPending({ email, password });
        setStep('otp');
        setResendSeconds(60);
        toast('Verification code sent to your email.', 'success');
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Could not create account.', 'error');
      } finally {
        setLoading(false);
      }
      return;
    }

    const response = await signIn('credentials', { redirect: false, email, password, mode });
    setLoading(false);
    if (response?.ok) {
      toast('Welcome back', 'success');
      router.push('/dashboard');
    } else {
      toast(cleanAuthError(response?.error ?? undefined), 'error');
    }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const code = String(form.get('code') ?? '').trim();
    setLoading(true);
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pending.email, code })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Verification failed.');
      setStep('verified');
      toast('Email verified successfully.', 'success');
      const login = await signIn('credentials', { redirect: false, email: pending.email, password: pending.password });
      if (login?.ok) router.push('/dashboard');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Verification failed.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    if (resendSeconds > 0 || !pending.email) return;
    setResending(true);
    try {
      const response = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pending.email })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Could not resend code.');
      setResendSeconds(60);
      toast('A new code was sent.', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not resend code.', 'error');
    } finally {
      setResending(false);
    }
  }

  function googleLogin() {
    if (!providers.google) {
      toast('Google login is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in frontend/.env, then restart npm run dev.', 'error');
      return;
    }
    signIn('google', { callbackUrl: '/dashboard' });
  }

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10 [background:radial-gradient(circle_at_top,rgba(99,102,241,0.25),transparent_36%),#0A0B0F]">
      {status === 'authenticated' ? (
        <div className="glass w-full max-w-md rounded-lg p-7 text-center shadow-glass">
          <Brand />
          <h1 className="text-2xl font-bold">You are already logged in</h1>
          <p className="mt-2 text-sm text-slate-400">{session.user?.email}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link href="/dashboard" className="rounded-lg bg-gradient-to-r from-indigoGlow to-cyanGlow px-4 py-3 font-semibold">Open Dashboard</Link>
            <button onClick={() => signOut({ callbackUrl: '/' })} className="rounded-lg border border-white/10 px-4 py-3 font-semibold hover:bg-white/10">Logout</button>
          </div>
        </div>
      ) : step === 'otp' ? (
        <form onSubmit={verifyOtp} className="glass w-full max-w-md rounded-lg p-7 shadow-glass">
          <Brand />
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-cyanGlow/15 text-cyan-100"><Mail className="h-5 w-5" /></div>
          <h1 className="mt-5 text-3xl font-bold">Verify your email</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">Enter the 6 digit code sent to {pending.email}. The code expires in 5 minutes.</p>
          <input required name="code" inputMode="numeric" maxLength={6} pattern="[0-9]{6}" className="mt-6 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-center text-2xl tracking-[0.4em] outline-none focus:border-cyanGlow" placeholder="000000" />
          <button disabled={loading} className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigoGlow to-cyanGlow px-4 py-3 font-semibold disabled:opacity-60">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Verify Account
          </button>
          <button type="button" disabled={resendSeconds > 0 || resending} onClick={resendOtp} className="mt-4 w-full rounded-lg border border-white/10 px-4 py-3 text-sm text-cyan-100 disabled:cursor-not-allowed disabled:opacity-50">
            {resending ? 'Sending...' : resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : 'Resend code'}
          </button>
          <button type="button" onClick={() => { setStep('form'); setMode('register'); }} className="mt-4 w-full text-sm text-slate-400 hover:text-white">Use a different email</button>
        </form>
      ) : step === 'verified' ? (
        <div className="glass w-full max-w-md rounded-lg p-7 text-center shadow-glass">
          <Brand />
          <CheckCircle2 className="mx-auto h-12 w-12 text-emeraldGlow" />
          <h1 className="mt-5 text-3xl font-bold">Email verified</h1>
          <p className="mt-2 text-sm text-slate-400">Your TenderNova account is active. Redirecting to dashboard.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="glass w-full max-w-md rounded-lg p-7 shadow-glass">
          <Brand />
          <h1 className="text-3xl font-bold">{mode === 'register' ? 'Create account' : 'Welcome back'}</h1>
          <p className="mt-2 text-sm text-slate-400">{mode === 'register' ? 'Create your TenderNova account securely with Google.' : 'Sign in with Google or your verified email account.'}</p>
          <button type="button" onClick={googleLogin} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold hover:bg-white/10">
            <GoogleMark /> Continue with Google
          </button>
          {mode === 'login' && <>
            <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-slate-500"><span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" /></div>
            <input required name="email" type="email" className="mt-4 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-cyanGlow" placeholder="Email" />
            <input required name="password" type="password" className="mt-4 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-cyanGlow" placeholder="Password" />
            <button disabled={loading} className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigoGlow to-cyanGlow px-4 py-3 font-semibold disabled:opacity-60">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Login
            </button>
          </>}
          <button type="button" onClick={() => setMode(mode === 'register' ? 'login' : 'register')} className="mt-4 w-full text-sm text-cyan-200">
            {mode === 'register' ? 'Already have an account? Login' : 'Need an account? Register'}
          </button>
        </form>
      )}
    </main>
  );
}

function Brand() {
  return (
    <Link href="/" className="mb-8 flex items-center gap-3">
      <span className="grid h-11 w-11 place-items-center rounded-lg bg-gradient-to-br from-indigoGlow to-cyanGlow"><Sparkles className="h-5 w-5" /></span>
      <span className="text-xl font-bold">TenderNova</span>
    </Link>
  );
}

function cleanAuthError(error?: string) {
  if (!error) return 'Check your credentials and try again.';
  if (error.includes('Verify your email')) return 'Verify your email before signing in.';
  if (error.includes('Incorrect password')) return 'Incorrect email or password.';
  if (error.includes('No account')) return 'No verified account was found for this email.';
  return 'Unable to sign in. Please check your details and try again.';
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  );
}
