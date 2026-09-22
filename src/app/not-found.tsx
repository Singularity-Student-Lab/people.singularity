import Link from 'next/link';
import Image from 'next/image';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF8F5] text-stone-900 px-4 py-16 font-sans select-none">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center mb-2">
          <div className="w-12 h-12 rounded-xl bg-white border border-stone-200 shadow-sm flex items-center justify-center">
            <Image
              src="/singularity_logo.webp"
              alt="Singularity Logo"
              width={28}
              height={28}
              className="object-contain"
            />
          </div>
        </div>

        <div className="space-y-2">
          <span className="font-mono text-xs text-stone-400 tracking-widest uppercase">
            Error 404 // Page Not Found
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl text-stone-950 font-normal tracking-tight">
            Nothing at this coordinate
          </h1>
          <p className="text-sm text-stone-600 font-normal leading-relaxed max-w-sm mx-auto">
            The profile, resource, or destination you requested does not exist or has been relocated.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto px-5 py-2.5 bg-stone-950 hover:bg-stone-800 text-white text-xs font-mono rounded-lg transition-colors shadow-xs"
          >
            ← Return to Directory
          </Link>
          <Link
            href="/about"
            className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-mono rounded-lg transition-colors"
          >
            About Lab
          </Link>
        </div>

        <div className="pt-8 border-t border-stone-200/60 text-[11px] font-mono text-stone-400">
          Singularity Student Lab • SRM University AP
        </div>
      </div>
    </div>
  );
}
