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
import {
  Menu,
  MoreVertical,
  BookOpen,
  MessageSquare,
  Images,
  Paperclip,
  Settings,
  FilePlus2,
  Search,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { GlobalSearch } from './GlobalSearch';
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

          {/* Global search — desktop, centered */}
          <div className="hidden lg:flex flex-1 justify-center mx-4">
            <div className="w-full max-w-md">
              <GlobalSearch />
            </div>
          </div>

          {/* Spacer (mobile only) */}
          <div className="flex-1 lg:hidden" />

          {/* Desktop right group: nav + new entry + theme */}
          <div className="hidden lg:flex items-center gap-4">
            <nav className="flex items-center gap-4">
              <Link href="/browse" className={`inline-flex items-center gap-1.5 ${linkClasses('/browse')}`}>
                <BookOpen className="w-4 h-4" />
                Browse
              </Link>
              {!isLoading && isAuthenticated && (
                <>
                  <Link
                    href="/chat"
                    className={`inline-flex items-center gap-1.5 ${linkClasses('/chat')}`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    Chat
                  </Link>
                  <Link
                    href="/admin/images"
                    className={`inline-flex items-center gap-1.5 ${linkClasses('/admin/images')}`}
                  >
                    <Images className="w-4 h-4" />
                    Images
                  </Link>
                  <Link
                    href="/admin/files"
                    className={`inline-flex items-center gap-1.5 ${linkClasses('/admin/files')}`}
                  >
                    <Paperclip className="w-4 h-4" />
                    Files
                  </Link>
                  <Link
                    href="/admin"
                    className={`inline-flex items-center gap-1.5 ${linkClasses('/admin')}`}
                  >
                    <Settings className="w-4 h-4" />
                    Admin
                  </Link>
                </>
              )}
            </nav>

            {!isLoading && isAuthenticated && (
              <Link
                href="/entries/new"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] transition-colors"
              >
                <FilePlus2 className="w-4 h-4" />
                New Entry
              </Link>
            )}

            <ThemeToggle />
          </div>

          {/* Theme toggle — mobile */}
          <div className="lg:hidden">
            <ThemeToggle />
          </div>

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
                  href="/search"
                  className={`flex items-center gap-1.5 px-4 py-2 ${linkClasses('/search')}`}
                  onClick={() => setDropdownOpen(false)}
                >
                  <Search className="w-4 h-4" />
                  Search
                </Link>
                <Link
                  href="/browse"
                  className={`flex items-center gap-1.5 px-4 py-2 ${linkClasses('/browse')}`}
                  onClick={() => setDropdownOpen(false)}
                >
                  <BookOpen className="w-4 h-4" />
                  Browse
                </Link>
                {!isLoading && isAuthenticated && (
                  <>
                    <Link
                      href="/chat"
                      className={`flex items-center gap-1.5 px-4 py-2 ${linkClasses('/chat')}`}
                      onClick={() => setDropdownOpen(false)}
                    >
                      <MessageSquare className="w-4 h-4" />
                      Chat
                    </Link>
                    <Link
                      href="/admin/images"
                      className={`flex items-center gap-1.5 px-4 py-2 ${linkClasses('/admin/images')}`}
                      onClick={() => setDropdownOpen(false)}
                    >
                      <Images className="w-4 h-4" />
                      Images
                    </Link>
                    <Link
                      href="/admin/files"
                      className={`flex items-center gap-1.5 px-4 py-2 ${linkClasses('/admin/files')}`}
                      onClick={() => setDropdownOpen(false)}
                    >
                      <Paperclip className="w-4 h-4" />
                      Files
                    </Link>
                    <Link
                      href="/admin"
                      className={`flex items-center gap-1.5 px-4 py-2 ${linkClasses('/admin')}`}
                      onClick={() => setDropdownOpen(false)}
                    >
                      <Settings className="w-4 h-4" />
                      Admin
                    </Link>
                    <Link
                      href="/entries/new"
                      className="flex items-center gap-1.5 px-4 py-2 text-sm text-[var(--color-foreground-secondary)] hover:text-[var(--color-foreground)]"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <FilePlus2 className="w-4 h-4" />
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
