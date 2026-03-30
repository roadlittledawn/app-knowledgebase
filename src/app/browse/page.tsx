'use client';

/**
 * Browse Page
 * Main page for browsing knowledge entries organized by category
 *
 * Requirements:
 * - 4.1: Display categories hierarchically based on the Category collection
 * - 4.2: When a user selects a category, display entries belonging to that category
 * - 4.8: Display the count of entries in each category
 * - 5.1: Search the knowledgebase using keywords and natural language
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { CategoryTree } from '@/components/CategoryTree';
import { EntryCard } from '@/components/EntryCard';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SearchBar } from '@/components/SearchBar';
import { SearchResults } from '@/components/SearchResults';
import type { CategoryTreeNode } from '@/types/category';
import type { IEntry } from '@/types/entry';
import type { SearchResultSource } from '@/lib/search/merge';

interface EntriesResponse {
  entries: Omit<IEntry, 'body'>[];
  total: number;
  page: number;
  pages: number;
}

interface SearchResult {
  entry: Omit<IEntry, 'body'>;
  score: number;
  source: SearchResultSource;
  excerpt?: string;
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
  mode: string;
}

export default function BrowsePage() {
  const [tree, setTree] = useState<CategoryTreeNode[]>([]);
  const [entries, setEntries] = useState<Omit<IEntry, 'body'>[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearchMode, setIsSearchMode] = useState(false);

  // Fetch category tree
  useEffect(() => {
    async function fetchTree() {
      try {
        const res = await fetch('/api/categories/tree');
        if (!res.ok) throw new Error('Failed to fetch categories');
        const data = await res.json();
        setTree(data.tree);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load categories');
      } finally {
        setLoading(false);
      }
    }
    fetchTree();
  }, []);

  // Fetch entries when category or page changes
  const fetchEntries = useCallback(async () => {
    setEntriesLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategoryId) {
        params.set('categoryId', selectedCategoryId);
      }
      params.set('page', page.toString());
      params.set('limit', '20');

      const res = await fetch(`/api/entries?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch entries');
      const data: EntriesResponse = await res.json();
      setEntries(data.entries);
      setTotalPages(data.pages);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load entries');
    } finally {
      setEntriesLoading(false);
    }
  }, [selectedCategoryId, page]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleCategorySelect = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
    setPage(1); // Reset to first page when category changes
    // Exit search mode when selecting a category
    setIsSearchMode(false);
    setSearchQuery('');
    setSearchResults([]);
    setSearchError(null);
  };

  // Handle search
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    setIsSearchMode(true);
    setIsSearching(true);
    setSearchError(null);

    try {
      const params = new URLSearchParams({ q: query, mode: 'hybrid', limit: '20' });
      const res = await fetch(`/api/search?${params.toString()}`);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Search failed');
      }

      const data: SearchResponse = await res.json();
      setSearchResults(data.results);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Clear search and return to browse mode
  const handleClearSearch = useCallback(() => {
    setIsSearchMode(false);
    setSearchQuery('');
    setSearchResults([]);
    setSearchError(null);
  }, []);

  const getCategoryName = (categoryId: string | null): string => {
    if (!categoryId) return 'All Entries';
    const findCategory = (nodes: CategoryTreeNode[]): string | null => {
      for (const node of nodes) {
        if (node._id === categoryId) return node.name;
        if (node.children.length > 0) {
          const found = findCategory(node.children);
          if (found) return found;
        }
      }
      return null;
    };
    return findCategory(tree) || 'Unknown Category';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-[var(--color-foreground-muted)]">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[var(--color-error)]">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="text-xl font-semibold text-[var(--color-foreground)]">
              Knowledgebase
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/browse" className="text-sm text-[var(--color-primary)] font-medium">
                Browse
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0 border-r border-[var(--color-border)] bg-[var(--color-background-secondary)] overflow-y-auto">
          <div className="p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-foreground-muted)] mb-2">
              Categories
            </h2>
            <CategoryTree
              tree={tree}
              selectedCategoryId={selectedCategoryId ?? undefined}
              onSelect={handleCategorySelect}
            />
          </div>
        </aside>

        {/* Entry list */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-8">
            {/* Search bar */}
            <div className="mb-6">
              <SearchBar
                onSearch={handleSearch}
                placeholder="Search entries..."
                initialValue={searchQuery}
                isLoading={isSearching}
              />
            </div>

            {/* Search mode indicator and clear button */}
            {isSearchMode && (
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-[var(--color-foreground-muted)]">Search results</span>
                <button
                  onClick={handleClearSearch}
                  className="text-sm text-[var(--color-primary)] hover:underline"
                >
                  Clear search
                </button>
              </div>
            )}

            {/* Content: either search results or browse entries */}
            {isSearchMode ? (
              <SearchResults
                results={searchResults}
                query={searchQuery}
                isLoading={isSearching}
                error={searchError}
              />
            ) : (
              <>
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
                    {getCategoryName(selectedCategoryId)}
                  </h1>
                  <p className="text-sm text-[var(--color-foreground-muted)] mt-1">
                    {total} {total === 1 ? 'entry' : 'entries'}
                  </p>
                </div>

                {entriesLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="h-32 bg-[var(--color-surface)] rounded-lg animate-pulse"
                      />
                    ))}
                  </div>
                ) : entries.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-[var(--color-foreground-muted)]">
                      No entries found in this category.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {entries.map((entry) => (
                        <EntryCard key={entry._id} entry={entry} />
                      ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="mt-8 flex items-center justify-center gap-2">
                        <button
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="px-3 py-1.5 text-sm rounded-md border border-[var(--color-border)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--color-surface-hover)]"
                        >
                          Previous
                        </button>
                        <span className="text-sm text-[var(--color-foreground-muted)]">
                          Page {page} of {totalPages}
                        </span>
                        <button
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                          className="px-3 py-1.5 text-sm rounded-md border border-[var(--color-border)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--color-surface-hover)]"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
