import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, COOKIE_NAME } from '@/lib/auth/jwt';

export async function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const pathname = request.nextUrl.pathname;

  // 1. Session decoding for edge route guards via canonical JWT verifier
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const sessionPayload = token ? await verifySessionToken(token) : null;

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

  // 5. Construct Content Security Policy (CSP) with Nonce Enforcement
  const isDev = process.env.NODE_ENV !== 'production';
  const scriptSrc = isDev
    ? `'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com`
    : `'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com`;

  const cspHeader = `
    default-src 'self';
    script-src ${scriptSrc};
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https: blob: https://*.public.blob.vercel-storage.com;
    font-src 'self' data: https:;
    connect-src 'self' https://api.github.com https://*.supabase.co https://*.public.blob.vercel-storage.com https://challenges.cloudflare.com;
    frame-src 'self' https://challenges.cloudflare.com;
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
