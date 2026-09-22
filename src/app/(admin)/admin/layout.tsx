import React from 'react';
import { redirect } from 'next/navigation';
import { getAuthenticatedAdmin } from '@/lib/auth/session';
import { AdminNavbar } from '@/components/navigation/AdminNavbar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuthenticatedAdmin();

  if (!auth) {
    redirect('/auth/login');
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col font-sans text-stone-900">
      <AdminNavbar />

      {/* Admin Content */}
      <main className="flex-1 max-w-6xl 2xl:max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-8 sm:py-12">
        {children}
      </main>
    </div>
  );
}
