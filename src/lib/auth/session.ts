import { cookies } from 'next/headers';
import { COOKIE_NAME, verifySessionToken, clearSessionCookie, SessionPayload } from './jwt';
import { db } from '../db/repository';

export interface AuthenticatedMemberResult {
  session: SessionPayload;
  member: NonNullable<Awaited<ReturnType<typeof db.findMemberById>>>;
}

export interface AuthenticatedAdminResult {
  session: SessionPayload;
  admin: NonNullable<Awaited<ReturnType<typeof db.findAdminById>>>;
}

/**
 * Returns raw verified JWT session payload without DB lookup.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Live Database verification for member session.
 * Re-checks isActive, lockedUntil, and tokenVersion against the DB on every single request.
 * If revoked or inactive, clears cookie and returns null immediately.
 */
export async function getAuthenticatedMember(): Promise<AuthenticatedMemberResult | null> {
  const session = await getSession();
  if (!session || session.role !== 'member') return null;

  const member = await db.findMemberById(session.userId);
  if (!member) {
    await clearSessionCookie();
    return null;
  }

  // Check 1: Account deactivated
  if (!member.isActive) {
    await clearSessionCookie();
    return null;
  }

  // Check 2: Immediate token version revocation
  if (member.tokenVersion !== session.tokenVersion) {
    await clearSessionCookie();
    return null;
  }

  // Check 3: Account locked out
  if (member.lockedUntil && new Date(member.lockedUntil) > new Date()) {
    await clearSessionCookie();
    return null;
  }

  return { session, member };
}

/**
 * Live Database verification for admin session.
 * Re-checks tokenVersion against DB on every single request.
 */
export async function getAuthenticatedAdmin(): Promise<AuthenticatedAdminResult | null> {
  const session = await getSession();
  if (!session || session.role !== 'admin') return null;

  const admin = await db.findAdminById(session.userId);
  if (!admin) {
    await clearSessionCookie();
    return null;
  }

  if (admin.tokenVersion !== session.tokenVersion) {
    await clearSessionCookie();
    return null;
  }

  return { session, admin };
}
