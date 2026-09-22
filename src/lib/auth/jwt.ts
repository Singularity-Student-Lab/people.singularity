import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'singularity-lab-ultra-secure-jwt-secret-key-at-least-64-characters-long!';
const encodedKey = new TextEncoder().encode(JWT_SECRET);

export interface SessionPayload {
  userId: string;
  username: string;
  role: 'admin' | 'member';
  tokenVersion: number;
}

export const COOKIE_NAME = 'singularity_session';

/**
 * Signs a new JWT session token with HS256 and a 15-minute TTL.
 */
export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(encodedKey);
}

/**
 * Cryptographically verifies the JWT session token.
 * Returns payload or null if invalid or expired.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
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
    // Catching this prevents Next.js from throwing an unhandled runtime exception when
    // an invalid session is rejected and redirected.
  }
}
