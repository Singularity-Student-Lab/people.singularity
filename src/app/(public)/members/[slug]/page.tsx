import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import { db } from '@/lib/db/repository';
import { fetchGitHubActivity } from '@/lib/github/fetch-contributions';
import { MemberPortfolioTemplate } from '@/components/portfolio/MemberPortfolioTemplate';
import { PublicNavbar } from '@/components/navigation/PublicNavbar';

export const revalidate = 3600; // ISR revalidate every hour
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const members = await db.findActiveMembers();
    return members.map((m) => ({ slug: m.slug }));
  } catch {
    return [];
  }
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const member = await db.findMemberBySlug(slug);

  if (!member || !member.isActive) {
    return {
      title: 'Member Not Found — Singularity Student Lab',
    };
  }

  return {
    title: `${member.fullName} — Portfolio`,
    description: `${member.fullName}, ${member.title}. ${member.bio.slice(0, 150)}`,
    openGraph: {
      title: `${member.fullName} — Portfolio`,
      description: member.title,
      images: member.profileImageUrl ? [{ url: member.profileImageUrl }] : [],
    },
  };
}

export default async function MemberPortfolioPage({ params }: PageProps) {
  const { slug } = await params;
  const member = await db.findMemberBySlug(slug);

  // Security enforcement: inactive or non-existent members return 404
  if (!member || !member.isActive) {
    notFound();
  }

  // Fetch public GitHub activity server-side with resilient fallback
  const githubData = await fetchGitHubActivity(member.githubUsername);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-stone-900 font-sans">
      <PublicNavbar />

      <main className="flex-1 w-full py-8 sm:py-12 px-4 sm:px-6 lg:px-8 2xl:px-12">
        <MemberPortfolioTemplate member={member} githubData={githubData} />
      </main>

      <footer className="border-t border-stone-200 mt-20 py-8 text-xs font-mono text-stone-500 bg-stone-100/40">
        <div className="max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-serif text-stone-700 text-sm">Singularity Student Lab</span>
            <span className="text-stone-400 mx-2">•</span>
            <span className="text-[11px] text-stone-500">SRM University AP</span>
          </div>
          <div className="flex items-center gap-5 text-[11px]">
            <Link href="/" className="text-stone-600 hover:text-stone-900 transition-colors">
              Directory
            </Link>
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
