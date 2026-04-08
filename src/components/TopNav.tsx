'use client';

/**
 * TopNav Component
 * Top navigation bar with logo, navigation links, and ThemeToggle
 *
 * Requirements:
 * - 12.3: Provide a ThemeToggle component accessible from the top navigation
 * - Include links to Browse, Chat, Admin (when authenticated)
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, MoreVertical } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useMobileNav } from './MobileNavContext';

interface TopNavProps {
  className?: string;
}

export function TopNav({ className = '' }: TopNavProps) {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { open } = useMobileNav();

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

  // Close dropdown on outside click
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

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
      <div className="px-4">
        <div className="flex items-center h-16 gap-2">
          {/* Hamburger button — mobile only */}
          <button
            className="lg:hidden p-1.5 rounded-md hover:bg-[var(--color-surface-hover)] text-[var(--color-foreground-secondary)]"
            onClick={open}
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo */}
          <Link
            href="/"
            className="text-xl font-semibold text-[var(--color-foreground)] hover:text-[var(--color-primary)] transition-colors"
          >
            Knowledgebase
          </Link>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Desktop nav links */}
          <nav className="hidden lg:flex items-center gap-4">
            <Link href="/browse" className={linkClasses('/browse')}>
              Browse
            </Link>
            {!isLoading && isAuthenticated && (
              <>
                <Link href="/chat" className={linkClasses('/chat')}>
                  Chat
                </Link>
                <Link href="/admin/images" className={linkClasses('/admin/images')}>
                  Images
                </Link>
                <Link href="/admin" className={linkClasses('/admin')}>
                  Admin
                </Link>
              </>
            )}
          </nav>

          {/* Desktop New Entry button */}
          {!isLoading && isAuthenticated && (
            <Link
              href="/entries/new"
              className="hidden lg:flex px-3 py-1.5 text-sm rounded-md bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] transition-colors"
            >
              New Entry
            </Link>
          )}

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Mobile actions dropdown */}
          <div className="lg:hidden relative" ref={dropdownRef}>
            <button
              className="p-1.5 rounded-md hover:bg-[var(--color-surface-hover)] text-[var(--color-foreground-secondary)]"
              onClick={() => setDropdownOpen((prev) => !prev)}
              aria-label="More actions"
              aria-expanded={dropdownOpen}
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 z-50 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg py-1">
                <Link
                  href="/browse"
                  className={`block px-4 py-2 text-sm ${linkClasses('/browse')}`}
                  onClick={() => setDropdownOpen(false)}
                >
                  Browse
                </Link>
                {!isLoading && isAuthenticated && (
                  <>
                    <Link
                      href="/chat"
                      className={`block px-4 py-2 text-sm ${linkClasses('/chat')}`}
                      onClick={() => setDropdownOpen(false)}
                    >
                      Chat
                    </Link>
                    <Link
                      href="/admin/images"
                      className={`block px-4 py-2 text-sm ${linkClasses('/admin/images')}`}
                      onClick={() => setDropdownOpen(false)}
                    >
                      Images
                    </Link>
                    <Link
                      href="/admin"
                      className={`block px-4 py-2 text-sm ${linkClasses('/admin')}`}
                      onClick={() => setDropdownOpen(false)}
                    >
                      Admin
                    </Link>
                    <Link
                      href="/entries/new"
                      className="block px-4 py-2 text-sm text-[var(--color-foreground-secondary)] hover:text-[var(--color-foreground)]"
                      onClick={() => setDropdownOpen(false)}
                    >
                      New Entry
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
