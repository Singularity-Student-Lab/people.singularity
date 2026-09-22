import { Metadata } from 'next';
import Link from 'next/link';
import { PublicNavbar } from '@/components/navigation/PublicNavbar';

export const metadata: Metadata = {
  title: 'About — Singularity Student Lab',
  description: 'Vision & Mission of the Singularity Student Lab.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-stone-900 font-sans">
      <PublicNavbar />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 w-full flex items-center">
        <section aria-labelledby="vision-mission-heading" className="w-full">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-16 items-start">
            {/* Left Column: Heading */}
            <div className="md:col-span-5 space-y-3">
              <span className="block font-mono text-xs text-stone-500 tracking-widest uppercase">
                01 // NORTH STAR
              </span>
              <h1
                id="vision-mission-heading"
                className="font-sans font-extrabold text-3xl sm:text-4xl lg:text-5xl text-stone-950 tracking-tight uppercase leading-none"
              >
                VISION &<br />MISSION
              </h1>
            </div>

            {/* Right Column: Quotes & Statements */}
            <div className="md:col-span-7 space-y-8">
              {/* 01 Vision */}
              <div className="space-y-3">
                <span className="block font-mono text-xs sm:text-sm font-semibold tracking-wider text-stone-900 uppercase">
                  01 VISION
                </span>
                <p className="text-base sm:text-lg text-stone-800 leading-relaxed font-normal">
                  &ldquo;We aim to revolutionize the future of technology by driving groundbreaking research and fostering an environment where innovation knows no bounds. Through inclusive collaboration, we strive to create transformative solutions that bridge the gap between ideas and real-world impact.&rdquo;
                </p>
              </div>

              {/* Dividing Line */}
              <hr className="border-t border-stone-200/90 w-full" />

              {/* 02 Mission */}
              <div className="space-y-3">
                <span className="block font-mono text-xs sm:text-sm font-semibold tracking-wider text-stone-900 uppercase">
                  02 MISSION
                </span>
                <p className="text-base sm:text-lg text-stone-800 leading-relaxed font-normal">
                  &ldquo;To push the limits of technological advancement with cutting-edge tools and research-driven innovation. We are dedicated to knowledge sharing and empowering the next generation of tech leaders, ensuring a future where technology serves all.&rdquo;
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200 py-8 text-xs font-mono text-stone-500 bg-stone-100/40 mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-serif text-stone-700 text-sm">Singularity Student Lab</span>
            <span className="text-stone-400 mx-2">•</span>
            <span className="text-[11px] text-stone-500">SRM University AP</span>
          </div>
          <div className="flex items-center gap-5 text-[11px]">
            <Link href="/" className="text-stone-600 hover:text-stone-900 transition-colors">
              Directory
            </Link>
            <Link href="/auth/login" className="text-stone-600 hover:text-stone-900 transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
