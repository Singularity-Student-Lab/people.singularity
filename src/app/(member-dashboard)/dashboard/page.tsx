import { redirect } from 'next/navigation';
import { getAuthenticatedMember } from '@/lib/auth/session';
import { db } from '@/lib/db/repository';
import { MemberDashboardClient } from './MemberDashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const auth = await getAuthenticatedMember();

  if (!auth) {
    redirect('/auth/login');
  }

  const allSkills = await db.getAllSkills();

  return (
    <MemberDashboardClient
      initialMember={auth.member}
      allSkills={allSkills}
    />
  );
}
