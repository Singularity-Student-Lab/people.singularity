import { SignJWT, jwtVerify } from 'jose';

export interface SessionPayload {
  userId: string;
  username: string;
  role: 'admin' | 'member';
  tokenVersion: number;
}

export const COOKIE_NAME = 'singularity_session';

/**
 * Returns the cryptographically secure JWT secret or fails closed immediately.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length < 32) {
    throw new Error(
      '[Security Exception] JWT_SECRET environment variable is missing or shorter than 32 characters. Halting to prevent forged tokens.'
    );
  }
  return secret;
}

/**
 * Encodes the secret key for HS256 JWT operations.
 */
export function getJwtEncodedKey(): Uint8Array {
  return new TextEncoder().encode(getJwtSecret());
}

/**
 * Signs a new JWT session token with HS256 and a 15-minute TTL.
 */
export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(getJwtEncodedKey());
}

/**
 * Cryptographically verifies the JWT session token.
 * Returns payload or null if invalid or expired.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtEncodedKey(), {
      algorithms: ['HS256'],
    });
    return {
      userId: payload.userId as string,
      username: payload.username as string,
      role: payload.role as 'admin' | 'member',
      tokenVersion: (payload.tokenVersion as number) || 1,
    };
  } catch {
    return null;
  }
}

/**
 * Sets the session cookie with HttpOnly, Secure, and SameSite=Strict.
 */
export async function setSessionCookie(token: string) {
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 15 * 60, // 15 minutes
    });
  } catch {
    // In Next.js, cookies can only be mutated in Route Handlers or Server Actions
  }
}

/**
 * Clears the session cookie on logout or revocation.
 * Safe to call from both Route Handlers/Server Actions and Server Components.
 */
export async function clearSessionCookie() {
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
    });
  } catch {
    // In Next.js App Router, cookies cannot be modified during Server Component renders.
  }
}
