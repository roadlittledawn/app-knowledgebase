'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, FileText, Loader2 } from 'lucide-react';
import type { SearchResultSource } from '@/lib/search/merge';

interface QuickResult {
  entry: {
    _id: string;
    slug: string;
    frontmatter: {
      title: string;
      tags: string[];
      languages: string[];
    };
  };
  score: number;
  source: SearchResultSource;
  excerpt?: string;
}

interface SearchResponse {
  results: QuickResult[];
  total: number;
}

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<QuickResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeSearch = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  }, []);

  // Cmd+K shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape' && isOpen) {
        closeSearch();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeSearch]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isOpen]);

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams({ q: q.trim(), mode: 'hybrid', limit: '8' });
      const res = await fetch(`/api/search?${params.toString()}`);
      if (!res.ok) throw new Error('Search failed');
      const data: SearchResponse = await res.json();
      setResults(data.results);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = useCallback(
    (value: string) => {
      setQuery(value);
      setSelectedIndex(-1);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        performSearch(value);
      }, 300);
    },
    [performSearch]
  );

  const navigateToResult = useCallback(
    (slug: string) => {
      closeSearch();
      router.push(`/browse/${slug}`);
    },
    [closeSearch, router]
  );

  const navigateToFullResults = useCallback(() => {
    if (!query.trim()) return;
    closeSearch();
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }, [query, closeSearch, router]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || results.length === 0) {
        if (e.key === 'Enter' && query.trim()) {
          e.preventDefault();
          navigateToFullResults();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < results.length) {
            navigateToResult(results[selectedIndex]!.entry.slug);
          } else {
            navigateToFullResults();
          }
          break;
      }
    },
    [isOpen, results, selectedIndex, query, navigateToResult, navigateToFullResults]
  );

  const showDropdown = isOpen && query.trim().length > 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      {/* Search input */}
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-[var(--color-foreground-muted)] pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search... (Cmd+K)"
          className="
            w-full pl-9 pr-8 py-1.5
            bg-[var(--color-surface)]
            border border-[var(--color-border)]
            rounded-md
            text-sm text-[var(--color-foreground)]
            placeholder:text-[var(--color-foreground-muted)]
            focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent
            transition-colors duration-150
          "
        />
        {query && (
          <button
            type="button"
            onClick={closeSearch}
            className="absolute right-2 p-0.5 cursor-pointer text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown results */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--color-foreground-muted)]" />
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-[var(--color-foreground-muted)]">
              No results found
            </div>
          ) : (
            <>
              <ul className="py-1">
                {results.map((result, index) => (
                  <li key={result.entry._id}>
                    <button
                      onClick={() => navigateToResult(result.entry.slug)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`
                        w-full flex items-center gap-3 px-4 py-2.5 text-left cursor-pointer
                        transition-colors duration-75
                        ${
                          index === selectedIndex
                            ? 'bg-[var(--color-surface-hover)]'
                            : 'hover:bg-[var(--color-surface-hover)]'
                        }
                      `}
                    >
                      <FileText className="w-4 h-4 flex-shrink-0 text-[var(--color-foreground-muted)]" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-[var(--color-foreground)] truncate">
                          {result.entry.frontmatter.title}
                        </div>
                        {result.entry.frontmatter.tags.length > 0 && (
                          <div className="text-xs text-[var(--color-foreground-muted)] truncate mt-0.5">
                            {result.entry.frontmatter.tags.slice(0, 3).join(', ')}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-[var(--color-foreground-muted)] flex-shrink-0">
                        {Math.round(result.score * 100)}%
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <button
                onClick={navigateToFullResults}
                className="w-full px-4 py-2.5 text-sm text-[var(--color-primary)] hover:bg-[var(--color-surface-hover)] border-t border-[var(--color-border)] cursor-pointer text-center"
              >
                See all results
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
