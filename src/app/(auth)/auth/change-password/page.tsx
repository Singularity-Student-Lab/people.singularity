'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { KeyRound, Lock, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

export default function ChangePasswordPage() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Real-time password validation checks
  const checks = {
    length: newPassword.length >= 10,
    hasLower: /[a-z]/.test(newPassword),
    hasUpper: /[A-Z]/.test(newPassword),
    hasNumber: /\d/.test(newPassword),
    hasSpecial: /[^a-zA-Z\d]/.test(newPassword),
    matches: newPassword.length > 0 && newPassword === confirmPassword,
  };

  const isFormValid =
    checks.length &&
    checks.hasLower &&
    checks.hasUpper &&
    checks.hasNumber &&
    checks.hasSpecial &&
    checks.matches &&
    currentPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      setError('Please ensure your new password satisfies all security requirements.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to update password');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1500);
    } catch {
      setError('A network error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-center py-12 sm:py-16 px-4 sm:px-6 lg:px-8 font-sans text-stone-900">
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
              Security Setup
            </span>
          </div>
        </Link>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white border border-stone-200/90 rounded-2xl p-7 sm:p-9 shadow-[0_8px_30px_rgba(0,0,0,0.04)] space-y-6">
          <div className="border-b border-stone-100 pb-4 space-y-1">
            <h2 className="font-serif text-2xl sm:text-3xl text-stone-950 font-normal tracking-tight">
              Update Password
            </h2>
            <p className="text-xs text-stone-500 font-light leading-relaxed">
              Replace your initial temporary credentials with a secure personal password.
            </p>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50/80 border border-rose-200/80 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 bg-emerald-50/80 border border-emerald-200/80 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
              <span>Password successfully updated. Entering dashboard...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-stone-600 mb-1.5 font-medium">
                Current Temporary Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-stone-400 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter temporary password"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-stone-50/60 border border-stone-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-stone-900 focus:ring-2 focus:ring-stone-900/5 transition-all text-stone-900 placeholder:text-stone-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-stone-600 mb-1.5 font-medium">
                New Strong Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-stone-400 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 10 characters"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-stone-50/60 border border-stone-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-stone-900 focus:ring-2 focus:ring-stone-900/5 transition-all text-stone-900 placeholder:text-stone-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-stone-600 mb-1.5 font-medium">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-stone-400 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-stone-50/60 border border-stone-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-stone-900 focus:ring-2 focus:ring-stone-900/5 transition-all text-stone-900 placeholder:text-stone-400"
                />
              </div>
            </div>

            {/* Password Requirement Checklist */}
            <div className="p-3.5 bg-stone-50/70 border border-stone-200/80 rounded-xl text-[11px] font-mono space-y-1.5 text-stone-600">
              <div className="flex items-center gap-2">
                <span className={checks.length ? 'text-emerald-600 font-bold' : 'text-stone-400'}>
                  {checks.length ? '✓' : '○'}
                </span>
                <span>Minimum 10 characters</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={checks.hasUpper && checks.hasLower ? 'text-emerald-600 font-bold' : 'text-stone-400'}>
                  {checks.hasUpper && checks.hasLower ? '✓' : '○'}
                </span>
                <span>Uppercase & lowercase letters</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={checks.hasNumber ? 'text-emerald-600 font-bold' : 'text-stone-400'}>
                  {checks.hasNumber ? '✓' : '○'}
                </span>
                <span>At least one number</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={checks.hasSpecial ? 'text-emerald-600 font-bold' : 'text-stone-400'}>
                  {checks.hasSpecial ? '✓' : '○'}
                </span>
                <span>At least one special symbol</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={checks.matches ? 'text-emerald-600 font-bold' : 'text-stone-400'}>
                  {checks.matches ? '✓' : '○'}
                </span>
                <span>Passwords match</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isFormValid}
              className="group w-full py-3 px-4 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-mono uppercase tracking-widest font-medium flex items-center justify-center gap-2 shadow-xs hover:shadow-md transition-all duration-200 active:scale-[0.99] cursor-pointer disabled:opacity-40 mt-2"
            >
              <span>{loading ? 'Updating Credentials...' : 'Save & Enter Dashboard'}</span>
              <ArrowRight className="size-3.5 text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
