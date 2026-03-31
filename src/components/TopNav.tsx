'use client';

/**
 * TopNav Component
 * Top navigation bar with logo, navigation links, and ThemeToggle
 *
 * Requirements:
 * - 12.3: Provide a ThemeToggle component accessible from the top navigation
 * - Include links to Browse, Chat, Admin (when authenticated)
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './ThemeToggle';

interface TopNavProps {
  className?: string;
}

export function TopNav({ className = '' }: TopNavProps) {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status on mount and when pathname changes
  useEffect(() => {
    async function checkAuth() {
      try {
        // Try to fetch admin stats - if it succeeds, user is authenticated
        const res = await fetch('/api/admin/stats', { method: 'GET' });
        setIsAuthenticated(res.ok);
      } catch {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    }
    checkAuth();
  }, [pathname]);

  const isActive = (path: string) => {
    if (path === '/browse') {
      return pathname === '/browse' || pathname.startsWith('/browse/');
    }
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const linkClasses = (path: string) =>
    `text-sm transition-colors ${
      isActive(path)
        ? 'text-[var(--color-primary)] font-medium'
        : 'text-[var(--color-foreground-secondary)] hover:text-[var(--color-foreground)]'
    }`;

  return (
    <header
      className={`border-b border-[var(--color-border)] bg-[var(--color-surface)] ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="text-xl font-semibold text-[var(--color-foreground)] hover:text-[var(--color-primary)] transition-colors"
          >
            Knowledgebase
          </Link>

          {/* Navigation and actions */}
          <div className="flex items-center gap-6">
            {/* Navigation links */}
            <nav className="flex items-center gap-4">
              <Link href="/browse" className={linkClasses('/browse')}>
                Browse
              </Link>
              {!isLoading && isAuthenticated && (
                <>
                  <Link href="/chat" className={linkClasses('/chat')}>
                    Chat
                  </Link>
                  <Link href="/admin" className={linkClasses('/admin')}>
                    Admin
                  </Link>
                </>
              )}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {!isLoading && isAuthenticated && (
                <Link
                  href="/entries/new"
                  className="px-3 py-1.5 text-sm rounded-md bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] transition-colors"
                >
                  New Entry
                </Link>
              )}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
