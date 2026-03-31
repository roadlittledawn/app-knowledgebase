'use client';

/**
 * RelatedEntries Component
 * Displays related entries linked from the current entry
 *
 * Requirements:
 * - 4.5: Display related entries linked from the current entry
 */

import Link from 'next/link';
import type { IEntry } from '@/types/entry';

interface RelatedEntriesProps {
  entries: Omit<IEntry, 'body'>[];
}

export function RelatedEntries({ entries }: RelatedEntriesProps) {
  if (entries.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-[var(--color-foreground)] mb-4">Related Entries</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {entries.map((entry) => (
          <Link
            key={entry._id}
            href={`/browse/${entry.slug}`}
            className="flex items-start gap-3 p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface-hover)] transition-colors duration-150"
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-md bg-[var(--color-primary)]/10 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-[var(--color-primary)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-[var(--color-foreground)] truncate">
                {entry.frontmatter.title}
              </h3>
              {entry.frontmatter.tags.length > 0 && (
                <p className="text-xs text-[var(--color-foreground-muted)] mt-1 truncate">
                  {entry.frontmatter.tags.slice(0, 3).join(' · ')}
                </p>
              )}
            </div>
            <svg
              className="w-4 h-4 text-[var(--color-foreground-muted)] flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>
    </section>
  );
}
