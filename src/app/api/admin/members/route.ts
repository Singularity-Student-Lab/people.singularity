import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getAuthenticatedAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db/repository';
import { AdminCreateMemberSchema } from '@/lib/security/validation';

export async function GET() {
  const auth = await getAuthenticatedAdmin();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const members = await db.getAllMembersForAdmin();
  return NextResponse.json({ members });
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedAdmin();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parseResult = AdminCreateMemberSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Validation failed' },
        { status: 400 }
      );
    }

    const { username, fullName, title, email } = parseResult.data;

    // Check username collision
    const existing = await db.findMemberByUsername(username);
    if (existing) {
      return NextResponse.json({ error: 'A member with this username already exists' }, { status: 409 });
    }

    // Generate unique slug
    const baseSlug = username.toLowerCase().replace(/[^a-z0-9]/g, '-');
    let slug = baseSlug;
    let counter = 1;
    while (await db.findMemberBySlug(slug)) {
      slug = `${baseSlug}-${counter++}`;
    }

    // Generate cryptographically secure 16-character temporary password
    const temporaryPassword = `Singularity-${crypto.randomBytes(6).toString('hex')}!`;
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    const newMember = await db.createMember({
      username,
      fullName,
      title,
      email: email || null,
      passwordHash,
      slug,
    });

    await db.recordAudit({
      actorType: 'ADMIN',
      actorId: auth.admin.id,
      action: 'MEMBER_CREATED',
      targetType: 'Member',
      targetId: newMember.id,
      metadata: { username, slug },
    });

    return NextResponse.json({
      success: true,
      member: newMember,
      temporaryPassword, // Provided to admin to issue to member
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create member';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
