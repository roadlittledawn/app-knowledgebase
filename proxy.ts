import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getAuthCookieName } from './src/lib/auth';

/**
 * Next.js 16 Proxy
 *
 * Requirements:
 * - 1.4: WHEN an unauthenticated user attempts to access a protected route, THE System SHALL redirect to the login page
 * - 1.5: WHEN an unauthenticated request is made to a protected API endpoint, THE System SHALL return a 401 Unauthorized response
 */

// Protected page routes - redirect to login if unauthenticated
const PROTECTED_PAGE_ROUTES = ['/admin', '/entries', '/chat'];

// Protected API routes - return 401 if unauthenticated
const PROTECTED_API_ROUTES = ['/api/admin', '/api/chat', '/api/ai'];

// API routes that require auth only for certain methods
const PROTECTED_API_METHODS: Record<string, string[]> = {
  '/api/entries': ['POST', 'PUT', 'DELETE'],
};

function isProtectedPageRoute(pathname: string): boolean {
  return PROTECTED_PAGE_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

function isProtectedApiRoute(pathname: string): boolean {
  return PROTECTED_API_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

function isProtectedApiMethod(pathname: string, method: string): boolean {
  for (const [route, methods] of Object.entries(PROTECTED_API_METHODS)) {
    if (pathname === route || pathname.startsWith(`${route}/`)) {
      return methods.includes(method);
    }
  }
  return false;
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Check if this is a protected route
  const isProtectedPage = isProtectedPageRoute(pathname);
  const isProtectedApi = isProtectedApiRoute(pathname);
  const isProtectedMethod = isProtectedApiMethod(pathname, method);

  // If not a protected route, allow the request
  if (!isProtectedPage && !isProtectedApi && !isProtectedMethod) {
    return NextResponse.next();
  }

  // Get the auth token from cookies
  const token = request.cookies.get(getAuthCookieName())?.value;

  // Verify the token
  const payload = token ? await verifyToken(token) : null;

  // If not authenticated
  if (!payload) {
    // For API routes, return 401
    if (isProtectedApi || isProtectedMethod) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For page routes, redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // User is authenticated, allow the request
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
