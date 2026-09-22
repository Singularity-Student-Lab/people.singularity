import { redirect } from 'next/navigation';
import { getAuthenticatedAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db/repository';
import { AdminMembersClient } from './AdminMembersClient';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const auth = await getAuthenticatedAdmin();

  if (!auth) {
    redirect('/auth/login');
  }

  const rawMembers = await db.getAllMembersForAdmin();

  const members = rawMembers.map((m) => ({
    id: m.id,
    slug: m.slug,
    username: m.username,
    fullName: m.fullName,
    title: m.title,
    email: m.email,
    isActive: m.isActive,
    mustChangePassword: m.mustChangePassword,
    tokenVersion: m.tokenVersion,
    createdAt: m.createdAt,
  }));

  return <AdminMembersClient initialMembers={members} />;
}
