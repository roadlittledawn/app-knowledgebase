'use client';

/**
 * SearchBar Component
 * Input field with submit button for searching the knowledgebase
 *
 * Requirements:
 * - 5.1: Allow users to search using keywords and natural language
 */

import { useState, useCallback, type FormEvent, type KeyboardEvent } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  initialValue?: string;
  isLoading?: boolean;
}

export function SearchBar({
  onSearch,
  placeholder = 'Search entries...',
  initialValue = '',
  isLoading = false,
}: SearchBarProps) {
  const [query, setQuery] = useState(initialValue);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const trimmed = query.trim();
      if (trimmed) {
        onSearch(trimmed);
      }
    },
    [query, onSearch]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const trimmed = query.trim();
        if (trimmed) {
          onSearch(trimmed);
        }
      }
    },
    [query, onSearch]
  );

  const handleClear = useCallback(() => {
    setQuery('');
  }, []);

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <div className="relative flex items-center">
        {/* Search icon */}
        <div className="absolute left-3 pointer-events-none">
          <svg
            className="w-5 h-5 text-[var(--color-foreground-muted)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Input field */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          className="
            w-full pl-10 pr-20 py-2.5
            bg-[var(--color-surface)]
            border border-[var(--color-border)]
            rounded-lg
            text-[var(--color-foreground)]
            placeholder:text-[var(--color-foreground-muted)]
            focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-150
          "
          aria-label="Search"
        />

        {/* Clear button */}
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="
              absolute right-14 p-1
              text-[var(--color-foreground-muted)]
              hover:text-[var(--color-foreground)]
              transition-colors duration-150
            "
            aria-label="Clear search"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="
            absolute right-2 px-3 py-1.5
            bg-[var(--color-primary)]
            text-[var(--color-primary-foreground)]
            text-sm font-medium
            rounded-md
            hover:bg-[var(--color-primary-hover)]
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-150
          "
        >
          {isLoading ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            'Search'
          )}
        </button>
      </div>
    </form>
  );
}
