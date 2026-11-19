/**
 * Browser-side helpers for clang-auth.
 *
 * The access token lives in an HttpOnly cookie (`ca_access`) that frontend code
 * can't read. Same-origin requests to our API send it automatically. When it
 * expires (every 15 minutes) we ask the auth service for a new one using the
 * auth service's own session cookie, then retry.
 *
 * AUTH_BASE_URL is server-only; AuthProvider (root layout) passes it in via
 * setAuthBaseUrl() so it isn't baked into the bundle.
 */

let authBaseUrl = '';

export function setAuthBaseUrl(url: string): void {
  authBaseUrl = url.replace(/\/$/, '');
}

export function getAuthBaseUrl(): string {
  return authBaseUrl;
}

// Remembers that this browser had a session, so signed-out visitors on public
// pages don't trigger a refresh call to the auth service on every page load.
const HINT_KEY = 'kb_had_session';

export function setSessionHint(on: boolean): void {
  try {
    if (on) localStorage.setItem(HINT_KEY, '1');
    else localStorage.removeItem(HINT_KEY);
  } catch {
    // Storage unavailable (private mode etc.): we just refresh less cleverly.
  }
}

export function hasSessionHint(): boolean {
  try {
    return localStorage.getItem(HINT_KEY) === '1';
  } catch {
    return false;
  }
}

/** The auth service's sign-in page, returning to `returnTo` afterwards. */
export function loginUrl(returnTo: string = window.location.href): string {
  return `${authBaseUrl}/login?redirect_uri=${encodeURIComponent(returnTo)}`;
}

export function redirectToLogin(returnTo?: string): void {
  window.location.assign(loginUrl(returnTo));
}

/** Get a fresh access-token cookie. Resolves false if there's no session. */
export async function refreshSession(): Promise<boolean> {
  try {
    const res = await fetch(`${authBaseUrl}/api/session/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * fetch() for our protected API routes. On 401 it refreshes the session and
 * retries once; if there's no session it sends the user to sign in. A 403
 * (signed in without access) is returned as-is: redirecting would loop.
 */
export async function authFetch(input: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status !== 401) return res;
  if (await refreshSession()) {
    return fetch(input, init);
  }
  setSessionHint(false);
  redirectToLogin();
  return res;
}

/** End the clang-auth session. This signs out of every app on the domain. */
export async function logout(): Promise<void> {
  setSessionHint(false);
  try {
    await fetch(`${authBaseUrl}/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
  } catch {
    // Even if the call failed, local state is cleared; the 15-minute access
    // token still expires on its own.
  }
}
