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

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedMember();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, category } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'Skill name must be at least 2 characters' }, { status: 400 });
    }

    const validCategories = [
      'CORE_LANGUAGES',
      'FRAMEWORKS_LIBRARIES',
      'SYSTEMS_INFRA',
      'AI_ML',
      'TOOLS_DEV',
    ] as const;

    type ValidCategory = (typeof validCategories)[number];

    if (!validCategories.includes(category as ValidCategory)) {
      return NextResponse.json({ error: 'Invalid skill category' }, { status: 400 });
    }

    const cleanName = name.trim().slice(0, 50);

    const skill = await db.findOrCreateSkill(cleanName, category as ValidCategory);

    // Automatically attach to authenticated member
    await db.attachMemberSkill(auth.member.id, skill.id);

    await db.recordAudit({
      actorType: 'MEMBER',
      actorId: auth.member.id,
      action: 'CUSTOM_SKILL_ADDED',
      targetType: 'Skill',
      targetId: skill.id,
      metadata: { skillName: cleanName, category },
    });

    return NextResponse.json({ success: true, skill });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create skill';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
