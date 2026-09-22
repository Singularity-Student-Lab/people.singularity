import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth/jwt';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db/repository';

export async function POST() {
  const session = await getSession();
  if (session) {
    await db.recordAudit({
      actorType: session.role === 'admin' ? 'ADMIN' : 'MEMBER',
      actorId: session.userId,
      action: 'LOGOUT',
      targetType: 'Session',
    });
  }

  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
