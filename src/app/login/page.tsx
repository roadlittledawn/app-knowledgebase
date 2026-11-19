'use client';

/**
 * Login Page
 *
 * Sign-in happens at clang-auth (auth.clintonlangosch.com). This page only
 * forwards there, so old bookmarks and "Sign In" links keep working. After
 * signing in, the auth service returns to `?redirect=` (default /browse).
 */

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { redirectToLogin } from '@/lib/auth/client';

/** Only same-app paths: never `//evil.example` or an absolute URL. */
function safePath(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/browse';
}

function Forward() {
  const searchParams = useSearchParams();
  const target = safePath(searchParams.get('redirect'));

  useEffect(() => {
    redirectToLogin(`${window.location.origin}${target}`);
  }, [target]);

  return (
    <div className="flex-1 flex items-center justify-center p-4 text-[var(--color-foreground-secondary)]">
      Redirecting to sign in…
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <Forward />
    </Suspense>
  );
}
