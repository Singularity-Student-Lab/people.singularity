import { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@/lib/db/repository';
import { MembersDirectoryClient } from './members/MembersDirectoryClient';
import { PublicNavbar } from '@/components/navigation/PublicNavbar';

export const metadata: Metadata = {
  title: 'Directory — Singularity Student Lab',
  description: 'Student members and builders at the Singularity Student Lab, SRM University AP.',
};

export const revalidate = 3600; // 1 hour ISR

export default async function HomePage() {
  const rawMembers = await db.findActiveMembers();

  // Map to lightweight directory structure
  const members = rawMembers.map((m) => ({
    id: m.id,
    slug: m.slug,
    fullName: m.fullName,
    title: m.title,
    bio: m.bio,
    profileImageUrl: m.profileImageUrl,
    bioHighlights: m.bioHighlights || [],
    skills: m.skills.map((s) => ({
      skill: {
        id: s.skill.id,
        name: s.skill.name,
        category: s.skill.category,
      },
    })),
  }));

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-stone-900 font-sans">
      <PublicNavbar />

      <main className="flex-1 max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-8 sm:py-12 2xl:py-16 w-full space-y-8 sm:space-y-10">
        <div className="border-b border-stone-200 pb-5 sm:pb-6">
          <h1 className="font-serif text-3xl sm:text-4xl 2xl:text-5xl text-stone-950 font-normal tracking-tight">
            Member Directory
          </h1>
          <p className="text-stone-600 text-sm sm:text-base 2xl:text-lg mt-1.5 font-normal">
            Student members and builders at the Singularity Student Lab, SRM University AP.
          </p>
        </div>

        <MembersDirectoryClient members={members} />
      </main>

      <footer id="lab-footer" className="border-t border-stone-200 mt-20 py-8 text-xs font-mono text-stone-500 bg-stone-100/40 scroll-mt-10">
        <div className="max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-serif text-stone-700 text-sm">Singularity Student Lab</span>
            <span className="text-stone-400 mx-2">•</span>
            <span className="text-[11px] text-stone-500">SRM University AP</span>
          </div>
          <div className="flex items-center gap-5 text-[11px]">
            <Link href="/about" className="text-stone-600 hover:text-stone-900 transition-colors">
              About Lab
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
