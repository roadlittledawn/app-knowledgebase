'use client';

/**
 * EntryCard Component
 * Card component for displaying entry summaries in list views
 *
 * Requirements:
 * - 4.3: Render entry MDX content using the DDS component library
 * - 4.4: Display entry metadata including title, topics, tags, languages, and skill level
 */

import Link from 'next/link';
import type { IEntry } from '@/types/entry';

interface EntryCardProps {
  entry: Omit<IEntry, 'body'>;
}

const skillLevelLabels: Record<number, string> = {
  1: 'Beginner',
  2: 'Elementary',
  3: 'Intermediate',
  4: 'Advanced',
  5: 'Expert',
};

const skillLevelColors: Record<number, string> = {
  1: 'bg-green-500/10 text-green-500',
  2: 'bg-blue-500/10 text-blue-500',
  3: 'bg-yellow-500/10 text-yellow-500',
  4: 'bg-orange-500/10 text-orange-500',
  5: 'bg-red-500/10 text-red-500',
};

export function EntryCard({ entry }: EntryCardProps) {
  const { frontmatter, slug, status } = entry;

  return (
    <Link
      href={`/browse/${slug}`}
      className="block p-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface-hover)] transition-colors duration-150"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-[var(--color-foreground)] truncate">
              {frontmatter.title}
            </h3>
            {status === 'draft' && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--color-warning-background)] text-[var(--color-warning)]">
                Draft
              </span>
            )}
            {frontmatter.isPrivate && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--color-error-background)] text-[var(--color-error)]">
                Private
              </span>
            )}
            {frontmatter.needsHelp && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--color-info-background)] text-[var(--color-info)]">
                Needs Help
              </span>
            )}
          </div>

          {/* Topics */}
          {frontmatter.topics.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {frontmatter.topics.map((topic) => (
                <span
                  key={topic}
                  className="px-2 py-0.5 text-xs rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                >
                  {topic}
                </span>
              ))}
            </div>
          )}

          {/* Tags and Languages */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-foreground-muted)]">
            {frontmatter.tags.length > 0 && (
              <div className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
                <span>{frontmatter.tags.slice(0, 3).join(', ')}</span>
                {frontmatter.tags.length > 3 && <span>+{frontmatter.tags.length - 3}</span>}
              </div>
            )}

            {frontmatter.languages.length > 0 && (
              <div className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
                </svg>
                <span>{frontmatter.languages.join(', ')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Skill Level Badge */}
        <div className="flex-shrink-0">
          <span
            className={`px-2.5 py-1 text-xs font-medium rounded-full ${skillLevelColors[frontmatter.skillLevel]}`}
          >
            {skillLevelLabels[frontmatter.skillLevel]}
          </span>
        </div>
      </div>
    </Link>
  );
}
