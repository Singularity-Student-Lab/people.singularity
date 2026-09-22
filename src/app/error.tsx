'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Application Error]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF8F5] text-stone-900 px-4 py-16 font-sans">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <span className="font-mono text-xs text-red-600/90 tracking-widest uppercase font-semibold">
            500 // Unexpected Error
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl text-stone-950 font-normal tracking-tight">
            An unexpected error occurred
          </h1>
          <p className="text-sm text-stone-600 font-normal leading-relaxed max-w-sm mx-auto">
            The application encountered a temporary glitch. Please try again or return to the directory.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto px-5 py-2.5 bg-stone-950 hover:bg-stone-800 text-white text-xs font-mono rounded-lg transition-colors cursor-pointer"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-mono rounded-lg transition-colors"
          >
            ← Return to Directory
          </Link>
        </div>

        <div className="pt-8 border-t border-stone-200/60 text-[11px] font-mono text-stone-400">
          Singularity Student Lab • SRM University AP
        </div>
      </div>
    </div>
  );
}
