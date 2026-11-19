'use client';

/**
 * Shown on protected pages to someone signed in to clang-auth without a
 * `kb:admin` grant. Deliberately not a redirect: they're signed in, so sending
 * them to sign-in would bounce straight back here in a loop.
 */

import Link from 'next/link';
import { useAuth } from './AuthProvider';

export function NoAccess({ email }: { email: string }) {
  const { signOut } = useAuth();
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-sm p-6 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] shadow-lg text-center space-y-4">
        <h1 className="text-xl font-semibold text-[var(--color-foreground)]">No access</h1>
        <p className="text-sm text-[var(--color-foreground-secondary)]">
          You&apos;re signed in as <strong>{email}</strong>, but that account doesn&apos;t have
          access to the Knowledgebase admin.
        </p>
        <div className="flex justify-center gap-4 text-sm">
          <Link href="/browse" className="text-[var(--color-primary)] hover:underline">
            Browse entries
          </Link>
          <button
            type="button"
            onClick={() => void signOut()}
            className="text-[var(--color-primary)] hover:underline cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
