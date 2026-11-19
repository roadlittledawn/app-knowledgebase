import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { ACCESS_COOKIE, loginUrl, resolveToken, type AuthState, type Session } from './clang-auth';

/**
 * Server-side auth for route handlers and server components. The only
 * supported way to ask "is the admin signed in?" in this app.
 *
 * `cache()` dedupes verification within one server-component render, so a
 * layout and its page verify the token once.
 */
export const getAuthState = cache(async (): Promise<AuthState> => {
  const cookieStore = await cookies();
  return resolveToken(cookieStore.get(ACCESS_COOKIE)?.value);
});

/** The signed-in admin, or null (anonymous, or signed in without access). */
export async function getSession(): Promise<Session | null> {
  const state = await getAuthState();
  return state.status === 'ok' ? state.session : null;
}

export async function isAuthenticated(): Promise<boolean> {
  return (await getSession()) !== null;
}

/**
 * Sign-in URL that returns to `path` on this app. For server components,
 * which don't see the request URL; proxy.ts builds its own from the request.
 */
export async function loginUrlFor(path: string): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'https';
  return loginUrl(`${proto}://${host}${path}`);
}
