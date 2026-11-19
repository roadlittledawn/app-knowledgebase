import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_COOKIE, loginUrl, resolveToken } from './lib/auth/clang-auth';

/**
 * Next.js 16 Proxy: auth gate and CSRF check.
 *
 * Sessions come from clang-auth (the `ca_access` cookie, see
 * docs/clang-auth-migration.md).
 *
 * - Protected page, signed out → redirect to the auth service's sign-in page,
 *   which returns here afterwards (silently, if a session already exists).
 * - Protected API, signed out → 401, so authFetch() can refresh and retry.
 * - Signed in without a `kb:admin` grant → 403 for APIs. Pages pass through and
 *   their layout renders a "no access" message. Never a redirect: it would loop.
 * - State-changing API requests must come from this app's own origin. The
 *   cookie is shared across *.clintonlangosch.com and SameSite=Lax treats
 *   sibling subdomains as same-site, so this blocks forged cross-app requests.
 *
 * Route handlers check auth again (getSession / isAuthenticated); this is the
 * first line, not the only one.
 */

// Protected page routes: redirect to sign-in if signed out
const PROTECTED_PAGE_ROUTES = ['/admin', '/entries', '/chat'];

// Protected API routes: 401 if signed out
const PROTECTED_API_ROUTES = ['/api/admin', '/api/chat', '/api/ai', '/api/images', '/api/files'];

// API routes that require auth only for certain methods
const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];
const PROTECTED_API_METHODS: Record<string, string[]> = {
  '/api/entries': WRITE_METHODS,
  '/api/categories': WRITE_METHODS,
};

function matches(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function isProtectedApiMethod(pathname: string, method: string): boolean {
  for (const [route, methods] of Object.entries(PROTECTED_API_METHODS)) {
    if (matches(pathname, route)) return methods.includes(method);
  }
  return false;
}

function originOf(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * This app's public origin as the browser sees it. From the Host header (or
 * Vercel's x-forwarded-host) rather than nextUrl, which can report the dev
 * server's bind address instead of kb.localtest.me.
 */
function requestOrigin(request: NextRequest): string {
  const host =
    request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? request.nextUrl.host;
  const proto =
    request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol.replace(/:$/, '');
  return `${proto}://${host}`;
}

/** Same-origin check for state-changing requests (Origin, else Referer). */
function isSameOrigin(request: NextRequest): boolean {
  const source =
    originOf(request.headers.get('origin')) ?? originOf(request.headers.get('referer'));
  return source === requestOrigin(request);
}

export default async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const method = request.method;
  const isApi = pathname.startsWith('/api/');

  if (isApi && WRITE_METHODS.includes(method) && !isSameOrigin(request)) {
    return NextResponse.json({ error: 'Cross-origin request refused' }, { status: 403 });
  }

  const isProtectedPage = PROTECTED_PAGE_ROUTES.some((r) => matches(pathname, r));
  const isProtectedApi =
    PROTECTED_API_ROUTES.some((r) => matches(pathname, r)) ||
    isProtectedApiMethod(pathname, method);

  if (!isProtectedPage && !isProtectedApi) {
    return NextResponse.next();
  }

  const auth = await resolveToken(request.cookies.get(ACCESS_COOKIE)?.value);

  if (auth.status === 'anonymous') {
    if (isProtectedApi) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(loginUrl(`${requestOrigin(request)}${pathname}${search}`));
  }

  if (auth.status === 'forbidden' && isProtectedApi) {
    return NextResponse.json({ error: "You don't have access to this app" }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
