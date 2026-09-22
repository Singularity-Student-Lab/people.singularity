import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'singularity-lab-ultra-secure-jwt-secret-key-at-least-64-characters-long!';
const encodedKey = new TextEncoder().encode(JWT_SECRET);
const COOKIE_NAME = 'singularity_session';

export async function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const pathname = request.nextUrl.pathname;

  // 1. Session decoding for edge route guards
  const token = request.cookies.get(COOKIE_NAME)?.value;
  let sessionPayload: { userId: string; username: string; role: string; tokenVersion: number } | null = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, encodedKey, { algorithms: ['HS256'] });
      sessionPayload = {
        userId: payload.userId as string,
        username: payload.username as string,
        role: payload.role as string,
        tokenVersion: (payload.tokenVersion as number) || 1,
      };
    } catch {
      // Invalid/expired token
      sessionPayload = null;
    }
  }

  // 2. Guard /admin routes
  if (pathname.startsWith('/admin')) {
    if (!sessionPayload || sessionPayload.role !== 'admin') {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 3. Guard /dashboard routes
  if (pathname.startsWith('/dashboard')) {
    if (!sessionPayload) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 4. Redirect already logged-in users away from /auth/login
  if (pathname === '/auth/login' && sessionPayload) {
    if (sessionPayload.role === 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url));
    } else {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // 5. Construct Content Security Policy (CSP)
  const isDev = process.env.NODE_ENV !== 'production';
  const scriptSrc = isDev
    ? `'self' 'unsafe-eval' 'unsafe-inline'`
    : `'self' 'unsafe-inline'`;

  const cspHeader = `
    default-src 'self';
    script-src ${scriptSrc};
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https: blob:;
    font-src 'self' data: https:;
    connect-src 'self' https://api.github.com;
    frame-ancestors 'none';
    form-action 'self';
    base-uri 'self';
    object-src 'none';
  `
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Clone headers and attach nonce
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', cspHeader);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Attach HTTP Security Headers to the response
  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (some API routes handle their own auth responses)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - uploads (public uploaded media files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|uploads).*)',
  ],
};
