import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedMember } from '@/lib/auth/session';
import { db } from '@/lib/db/repository';

export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthenticatedMember();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { skillIds } = body;

    if (!Array.isArray(skillIds)) {
      return NextResponse.json({ error: 'skillIds must be an array of IDs' }, { status: 400 });
    }

    await db.updateMemberSkills(auth.member.id, skillIds);

    await db.recordAudit({
      actorType: 'MEMBER',
      actorId: auth.member.id,
      action: 'SKILLS_UPDATED',
      targetType: 'Member',
      targetId: auth.member.id,
      metadata: { skillCount: skillIds.length },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update skills';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
