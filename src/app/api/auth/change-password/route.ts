import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db/repository';
import { ChangePasswordSchema } from '@/lib/security/validation';
import { signSessionToken, setSessionCookie } from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Session expired' }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = ChangePasswordSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Invalid password format' },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = parseResult.data;

    if (session.role === 'member') {
      const member = await db.findMemberById(session.userId);
      if (!member) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
      }

      // Check current password
      const isValid = await bcrypt.compare(currentPassword, member.passwordHash);
      if (!isValid) {
        return NextResponse.json({ error: 'Incorrect current password' }, { status: 400 });
      }

      // Hash new password with 12 rounds
      const newHash = await bcrypt.hash(newPassword, 12);
      const updated = await db.updateMemberPassword(member.id, newHash);

      // Issue new session token reflecting bumped tokenVersion
      const newToken = await signSessionToken({
        userId: member.id,
        username: member.username,
        role: 'member',
        tokenVersion: updated.tokenVersion,
      });
      await setSessionCookie(newToken);

      await db.recordAudit({
        actorType: 'MEMBER',
        actorId: member.id,
        action: 'PASSWORD_CHANGED',
        targetType: 'Member',
        targetId: member.id,
      });

      return NextResponse.json({ success: true });
    } else {
      // Admin password change
      const admin = await db.findAdminById(session.userId);
      if (!admin) {
        return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
      }

      const isValid = await bcrypt.compare(currentPassword, admin.passwordHash);
      if (!isValid) {
        return NextResponse.json({ error: 'Incorrect current password' }, { status: 400 });
      }

      return NextResponse.json({ error: 'Admin passwords must be updated by the system administrator.' }, { status: 403 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update password';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
