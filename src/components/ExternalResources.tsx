'use client';

/**
 * ExternalResources Component
 * Displays external resources associated with an entry
 *
 * Requirements:
 * - 4.6: Display external resources associated with the entry
 */

import type { Resource } from '@/types/entry';

interface ExternalResourcesProps {
  resources: Resource[];
}

export function ExternalResources({ resources }: ExternalResourcesProps) {
  if (resources.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-[var(--color-foreground)] mb-4">
        External Resources
      </h2>
      <ul className="space-y-2">
        {resources.map((resource, index) => (
          <li key={index}>
            <a
              href={resource.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface-hover)] transition-colors duration-150 group"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-md bg-[var(--color-secondary)]/10 flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-[var(--color-secondary)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-[var(--color-foreground)] group-hover:text-[var(--color-primary)]">
                  {resource.title}
                </span>
                <p className="text-xs text-[var(--color-foreground-muted)] truncate mt-0.5">
                  {resource.linkUrl}
                </p>
              </div>
              <svg
                className="w-4 h-4 text-[var(--color-foreground-muted)] flex-shrink-0 group-hover:text-[var(--color-primary)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
