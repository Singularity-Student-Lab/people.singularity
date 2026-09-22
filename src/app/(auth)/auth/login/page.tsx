'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, KeyRound, User, AlertCircle, RotateCw, ArrowRight, ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

function LoginFormContent() {
  const router = useRouter();
  const [redirectPath, setRedirectPath] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setRedirectPath(params.get('redirect') || '');
    }
  }, []);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Real Captcha State
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaSvg, setCaptchaSvg] = useState<string | null>(null);
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [captchaError, setCaptchaError] = useState<string | null>(null);

  const loadCaptcha = async () => {
    setCaptchaLoading(true);
    setCaptchaError(null);
    setCaptchaInput('');
    try {
      const res = await fetch('/api/auth/captcha');
      if (!res.ok) throw new Error('Failed to load challenge');
      const data = await res.json();
      setCaptchaToken(data.token);
      setCaptchaSvg(data.svg);
    } catch {
      setCaptchaError('Failed to load security challenge. Please click reload.');
    } finally {
      setCaptchaLoading(false);
    }
  };

  // Automatically load real captcha on page mount
  useEffect(() => {
    loadCaptcha();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter your username or email.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    if (!captchaInput.trim()) {
      setError('Please enter the 5-character security code shown in the image.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
          captchaToken,
          captchaAnswer: captchaInput.trim().toUpperCase(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Authentication failed. Please verify credentials.');
        setLoading(false);
        // Refresh challenge automatically on failed login
        loadCaptcha();
        return;
      }

      // Handle redirect based on mustChangePassword and role
      if (data.mustChangePassword) {
        router.push('/auth/change-password');
      } else if (data.role === 'admin') {
        router.push(redirectPath || '/admin');
      } else {
        router.push(redirectPath || '/dashboard');
      }
      router.refresh();
    } catch {
      setError('An unexpected network error occurred. Please try again.');
      setLoading(false);
      loadCaptcha();
    }
  };

  return (
    <div className="bg-white border border-stone-200/90 rounded-2xl p-7 sm:p-9 shadow-[0_8px_30px_rgba(0,0,0,0.04)] space-y-6">
      <div className="border-b border-stone-100 pb-4 space-y-1">
        <h2 className="font-serif text-2xl sm:text-3xl text-stone-950 font-normal tracking-tight">
          Sign In
        </h2>
        <p className="text-xs text-stone-500 font-light leading-relaxed">
          Enter your credentials to manage your member portfolio.
        </p>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50/80 border border-rose-200/80 rounded-xl text-rose-800 text-xs flex items-start gap-2.5">
          <AlertCircle className="size-4 shrink-0 mt-0.5 text-rose-600" />
          <div className="space-y-1">
            <p className="font-medium">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-stone-600 mb-1.5 font-medium">
            Username / Email
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-stone-400 pointer-events-none" />
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. member@singularitylab.org"
              className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-stone-50/60 border border-stone-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-stone-900 focus:ring-2 focus:ring-stone-900/5 transition-all text-stone-900 placeholder:text-stone-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-stone-600 mb-1.5 font-medium">
            Password
          </label>
          <div className="relative">
            <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-stone-400 pointer-events-none" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-stone-50/60 border border-stone-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-stone-900 focus:ring-2 focus:ring-stone-900/5 transition-all text-stone-900 placeholder:text-stone-400"
            />
          </div>
        </div>

        {/* Security Verification */}
        <div className="p-4 bg-stone-50/70 border border-stone-200/80 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-stone-800">
              <ShieldCheck className="size-4 text-stone-600" />
              <span className="font-mono text-[11px] uppercase tracking-wider font-semibold text-stone-700">
                Security Check
              </span>
            </div>

            <button
              type="button"
              onClick={loadCaptcha}
              disabled={captchaLoading}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono text-stone-600 hover:text-stone-950 bg-white border border-stone-200 hover:border-stone-300 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              title="Generate new verification code"
            >
              <RotateCw className={`size-3 ${captchaLoading ? 'animate-spin' : ''}`} />
              <span>{captchaLoading ? 'Loading...' : 'New code'}</span>
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-end gap-3">
              {/* SVG Captcha Image */}
              <div className="w-[185px] sm:w-[200px] h-[54px] rounded-xl overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                {captchaSvg ? (
                  <div
                    className="w-full h-full flex items-center justify-center select-none"
                    dangerouslySetInnerHTML={{ __html: captchaSvg }}
                  />
                ) : (
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-stone-400">
                    <RotateCw className="size-3.5 animate-spin" />
                    <span>Loading...</span>
                  </div>
                )}
              </div>

              {/* Code Input */}
              <div className="flex-1">
                <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-500 mb-1">
                  Enter Code
                </label>
                <input
                  type="text"
                  maxLength={5}
                  required
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
                  placeholder="CODE"
                  className="w-full h-[54px] px-3 text-base font-mono uppercase tracking-[0.25em] text-center font-bold bg-white border border-stone-200 rounded-xl focus:outline-hidden focus:border-stone-900 focus:ring-2 focus:ring-stone-900/5 shadow-2xs transition-all placeholder:text-stone-300 placeholder:tracking-normal placeholder:font-normal placeholder:text-xs"
                />
              </div>
            </div>

            {captchaError && (
              <p className="text-[11px] font-mono text-rose-700 font-medium">
                {captchaError}
              </p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="group w-full py-3 px-4 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-mono uppercase tracking-widest font-medium flex items-center justify-center gap-2 shadow-xs hover:shadow-md transition-all duration-200 active:scale-[0.99] cursor-pointer disabled:opacity-50 mt-2"
        >
          <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
          <ArrowRight className="size-3.5 text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-center py-12 sm:py-16 px-4 sm:px-6 lg:px-8 font-sans font-absans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <Link href="/" className="inline-flex flex-col items-center gap-3 group">
          <div className="size-13 rounded-2xl bg-black p-2.5 flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.08)] border border-stone-800 group-hover:scale-105 transition-transform duration-200">
            <Image
              src="/singularity_logo.webp"
              alt="Singularity Logo"
              width={42}
              height={42}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <div className="space-y-1">
            <span className="font-serif text-2xl sm:text-3xl font-normal tracking-tight text-stone-950 group-hover:text-stone-700 transition-colors block">
              Singularity Student Lab
            </span>
            <span className="text-[11px] font-mono uppercase tracking-widest text-stone-500 block">
              SRM University AP
            </span>
          </div>
        </Link>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md">
        <LoginFormContent />

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-stone-500 hover:text-stone-900 transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            <span>Return to Member Directory</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
