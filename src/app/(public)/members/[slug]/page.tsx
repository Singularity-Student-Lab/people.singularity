import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { db } from '@/lib/db/repository';
import { fetchGitHubActivity } from '@/lib/github/fetch-contributions';
import { MemberPortfolioTemplate } from '@/components/portfolio/MemberPortfolioTemplate';

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
    <main className="min-h-screen bg-[#FAF8F5] py-6 sm:py-10 px-3 sm:px-6">
      <MemberPortfolioTemplate member={member} githubData={githubData} />
    </main>
  );
}
