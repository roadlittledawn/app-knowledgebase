'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SearchResults } from '@/components/SearchResults';
import { SearchBar } from '@/components/SearchBar';
import type { IEntry } from '@/types/entry';
import type { SearchResultSource } from '@/lib/search/merge';

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

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ q: q.trim(), mode: 'hybrid', limit: '30' });
      const res = await fetch(`/api/search?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Search failed');
      }
      const data: SearchResponse = await res.json();
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, [initialQuery, performSearch]);

  const handleSearch = useCallback(
    (q: string) => {
      setQuery(q);
      performSearch(q);
      router.replace(`/search?q=${encodeURIComponent(q)}`);
    },
    [performSearch, router]
  );

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-[var(--color-foreground)] mb-6">Search</h1>

        <div className="mb-6">
          <SearchBar
            onSearch={handleSearch}
            placeholder="Search entries..."
            initialValue={query}
            isLoading={isLoading}
          />
        </div>

        <SearchResults
          results={results}
          query={query}
          isLoading={isLoading}
          error={error}
        />
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-[var(--color-foreground-muted)]">Loading...</div>
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
