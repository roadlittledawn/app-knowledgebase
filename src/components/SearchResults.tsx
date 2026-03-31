'use client';

/**
 * SearchResults Component
 * Displays search results with entry cards and metadata
 *
 * Requirements:
 * - 5.1: Display search results from hybrid search
 * - 5.9: Show excerpts highlighting matched content
 */

import Link from 'next/link';
import type { IEntry } from '@/types/entry';
import type { SearchResultSource } from '@/lib/search/merge';

interface SearchResult {
  entry: Omit<IEntry, 'body'>;
  score: number;
  source: SearchResultSource;
  excerpt?: string;
}

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
  isLoading?: boolean;
  error?: string | null;
}

/**
 * Highlight matched terms in text
 */
function highlightMatches(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;

  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const regex = new RegExp(
    `(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'gi'
  );

  const parts = text.split(regex);

  return parts.map((part, i) => {
    const isMatch = terms.some((term) => part.toLowerCase() === term.toLowerCase());
    if (isMatch) {
      return (
        <mark
          key={i}
          className="bg-[var(--color-primary)]/20 text-[var(--color-foreground)] px-0.5 rounded"
        >
          {part}
        </mark>
      );
    }
    return part;
  });
}

/**
 * Source badge component
 */
function SourceBadge({ source }: { source: SearchResultSource }) {
  const colors = {
    atlas: 'bg-blue-500/10 text-blue-500',
    pinecone: 'bg-purple-500/10 text-purple-500',
    both: 'bg-green-500/10 text-green-500',
  };

  const labels = {
    atlas: 'Text',
    pinecone: 'Semantic',
    both: 'Both',
  };

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${colors[source]}`}>{labels[source]}</span>
  );
}

/**
 * Single search result card
 */
function SearchResultCard({ result, query }: { result: SearchResult; query: string }) {
  const { entry, score, source, excerpt } = result;

  return (
    <article className="p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg hover:border-[var(--color-primary)] transition-colors duration-150">
      <Link href={`/browse/${entry.slug}`} className="block">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Title */}
            <h3 className="text-lg font-semibold text-[var(--color-foreground)] truncate">
              {highlightMatches(entry.frontmatter.title, query)}
            </h3>

            {/* Metadata row */}
            <div className="flex items-center gap-2 mt-1 text-sm text-[var(--color-foreground-muted)]">
              <SourceBadge source={source} />
              <span className="text-xs">Score: {(score * 100).toFixed(0)}%</span>
              {entry.frontmatter.skillLevel && (
                <span className="text-xs">Level {entry.frontmatter.skillLevel}</span>
              )}
            </div>

            {/* Excerpt */}
            {excerpt && (
              <p className="mt-2 text-sm text-[var(--color-foreground-muted)] line-clamp-2">
                {highlightMatches(excerpt, query)}
              </p>
            )}

            {/* Tags */}
            {entry.frontmatter.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {entry.frontmatter.tags.slice(0, 5).map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 bg-[var(--color-surface-hover)] text-[var(--color-foreground-muted)] rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Status indicator */}
          {entry.status === 'draft' && (
            <span className="flex-shrink-0 text-xs px-2 py-1 bg-yellow-500/10 text-yellow-500 rounded">
              Draft
            </span>
          )}
        </div>
      </Link>
    </article>
  );
}

export function SearchResults({ results, query, isLoading, error }: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 bg-[var(--color-surface)] rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="text-[var(--color-error)]">{error}</div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="p-8 text-center">
        <svg
          className="w-12 h-12 mx-auto text-[var(--color-foreground-muted)] mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-[var(--color-foreground-muted)]">
          No results found for &quot;{query}&quot;
        </p>
        <p className="text-sm text-[var(--color-foreground-muted)] mt-1">
          Try different keywords or check your spelling
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-foreground-muted)]">
        {results.length} {results.length === 1 ? 'result' : 'results'} for &quot;{query}&quot;
      </p>
      {results.map((result) => (
        <SearchResultCard key={result.entry._id} result={result} query={query} />
      ))}
    </div>
  );
}
