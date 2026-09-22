import React from 'react';
import { redirect } from 'next/navigation';
import { getAuthenticatedMember } from '@/lib/auth/session';
import { MemberNavbar } from '@/components/navigation/MemberNavbar';

export default async function MemberDashboardLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuthenticatedMember();

  if (!auth) {
    redirect('/auth/login');
  }

  // Force password change on first login
  if (auth.member.mustChangePassword) {
    redirect('/auth/change-password');
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col font-sans text-stone-900">
      <MemberNavbar memberSlug={auth.member.slug} />

      {/* Main Workspace Area */}
      <main className="flex-1 max-w-5xl xl:max-w-6xl 2xl:max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-8 sm:py-12">
        {children}
      </main>
    </div>
  );
}
