import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getAuthenticatedAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db/repository';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await getAuthenticatedAdmin();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await context.params;
    const body = await request.json();
    const { action, isActive } = body;

    const member = await db.findMemberById(id);
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    if (action === 'TOGGLE_ACTIVE') {
      const updated = await db.toggleMemberActive(id, Boolean(isActive));

      await db.recordAudit({
        actorType: 'ADMIN',
        actorId: auth.admin.id,
        action: isActive ? 'MEMBER_ACTIVATED' : 'MEMBER_DEACTIVATED',
        targetType: 'Member',
        targetId: id,
        metadata: { tokenVersionBumped: !isActive },
      });

      return NextResponse.json({ success: true, member: updated });
    }

    if (action === 'RESET_PASSWORD') {
      const temporaryPassword = `Singularity-${crypto.randomBytes(6).toString('hex')}!`;
      const newHash = await bcrypt.hash(temporaryPassword, 12);
      const updated = await db.resetMemberPassword(id, newHash);

      await db.recordAudit({
        actorType: 'ADMIN',
        actorId: auth.admin.id,
        action: 'PASSWORD_RESET_BY_ADMIN',
        targetType: 'Member',
        targetId: id,
        metadata: { tokenVersionBumped: true },
      });

      return NextResponse.json({
        success: true,
        member: updated,
        temporaryPassword,
      });
    }

    if (action === 'REVOKE_SESSIONS') {
      await db.incrementMemberTokenVersion(id);

      await db.recordAudit({
        actorType: 'ADMIN',
        actorId: auth.admin.id,
        action: 'SESSIONS_REVOKED_BY_ADMIN',
        targetType: 'Member',
        targetId: id,
        metadata: { tokenVersionBumped: true },
      });

      return NextResponse.json({ success: true, message: 'All sessions successfully revoked.' });
    }

    return NextResponse.json({ error: 'Invalid action requested' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Operation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
