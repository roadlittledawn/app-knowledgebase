'use client';

/**
 * SourceCitations Component
 *
 * Displays source citations from RAG responses.
 * Requirement 7.8: Display cited source entries after each AI response
 */

import Link from 'next/link';

export interface SourceCitation {
  id: string;
  title: string;
  slug: string;
  categoryPath: string;
}

interface SourceCitationsProps {
  sources: SourceCitation[];
}

export function SourceCitations({ sources }: SourceCitationsProps) {
  if (sources.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 p-4 rounded-lg bg-[var(--color-background-secondary)] border border-[var(--color-border)]">
      <h4 className="text-sm font-medium text-[var(--color-foreground-secondary)] mb-3">
        Sources ({sources.length})
      </h4>
      <ul className="space-y-2">
        {sources.map((source) => (
          <li key={source.id}>
            <Link
              href={`/browse/${source.categoryPath}/${source.slug}`}
              className="block p-2 rounded hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              <span className="text-[var(--color-primary)] hover:underline">{source.title}</span>
              <span className="block text-xs text-[var(--color-foreground-muted)] mt-0.5">
                {source.categoryPath}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default SourceCitations;
