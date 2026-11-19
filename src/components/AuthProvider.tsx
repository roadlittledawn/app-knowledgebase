'use client';

/**
 * AuthProvider / useAuth
 *
 * One source of truth for "who is signed in" in the browser, backed by
 * GET /api/auth/me. Also keeps the 15-minute clang-auth token fresh while a
 * signed-in tab is open, so public pages (which show private entries only to
 * the admin) don't silently fall back to the public view.
 *
 * Anonymous visitors never call the auth service: we only try a refresh when
 * this browser has signed in before (session hint) or the page is protected.
 * The auth service is rate-limited across all apps.
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  hasSessionHint,
  loginUrl,
  logout as endSession,
  refreshSession,
  setAuthBaseUrl,
  setSessionHint,
} from '@/lib/auth/client';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous' | 'forbidden';

export interface AuthUser {
  email: string;
  name: string | null;
  roles: string[];
  exp: number;
}

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  signIn: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PROTECTED_PREFIXES = ['/admin', '/entries', '/chat'];
/** Refresh this long before the token expires. */
const REFRESH_LEAD_MS = 60_000;

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

type MeResult = { status: 200; user: AuthUser } | { status: 401 | 403 };

async function fetchMe(): Promise<MeResult> {
  try {
    const res = await fetch('/api/auth/me', { cache: 'no-store' });
    if (res.ok) return { status: 200, user: (await res.json()) as AuthUser };
    return { status: res.status === 403 ? 403 : 401 };
  } catch {
    return { status: 401 };
  }
}

interface AuthProviderProps {
  authBaseUrl: string;
  children: React.ReactNode;
}

export function AuthProvider({ authBaseUrl, children }: AuthProviderProps) {
  // Set synchronously so children's effects (authFetch calls) see it.
  setAuthBaseUrl(authBaseUrl);

  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusRef = useRef<AuthStatus>('loading');
  const pathRef = useRef(pathname);
  // The refresh timer calls the latest applyMe() through this ref.
  const applyRef = useRef<(me: MeResult) => Promise<void>>(async () => {});
  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  /**
   * Act on a /api/auth/me result: on 401, try one refresh (if this browser had
   * a session, or the page is protected), then update state and schedule the
   * next proactive refresh. Passing { status: 401 } forces a refresh.
   */
  const applyMe = useCallback(
    async (initial: MeResult) => {
      let me = initial;
      let refreshed = false;
      if (me.status === 401 && (hasSessionHint() || isProtectedPath(pathRef.current))) {
        if (await refreshSession()) {
          refreshed = true;
          me = await fetchMe();
        }
      }

      if (timer.current) clearTimeout(timer.current);
      if (me.status === 200) {
        const signedInUser = me.user;
        // Server components rendered without a valid token (public view):
        // re-render them now that we have one.
        if (refreshed && statusRef.current !== 'authenticated') router.refresh();
        statusRef.current = 'authenticated';
        setSessionHint(true);
        setUser(signedInUser);
        setStatus('authenticated');
        const delay = Math.max(signedInUser.exp * 1000 - Date.now() - REFRESH_LEAD_MS, 5_000);
        timer.current = setTimeout(() => void applyRef.current({ status: 401 }), delay);
      } else {
        if (me.status === 401) setSessionHint(false);
        statusRef.current = me.status === 403 ? 'forbidden' : 'anonymous';
        setUser(null);
        setStatus(statusRef.current);
      }
    },
    [router]
  );

  useEffect(() => {
    applyRef.current = applyMe;
    void fetchMe().then(applyMe);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [applyMe]);

  // Timers are throttled in background tabs: re-check when the tab returns.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') void fetchMe().then(applyMe);
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [applyMe]);

  const signIn = useCallback(() => {
    window.location.assign(loginUrl(window.location.href));
  }, []);

  const signOut = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    await endSession();
    statusRef.current = 'anonymous';
    setUser(null);
    setStatus('anonymous');
    if (isProtectedPath(pathRef.current)) {
      router.push('/browse');
    }
    router.refresh();
  }, [router]);

  return (
    <AuthContext.Provider value={{ status, user, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
