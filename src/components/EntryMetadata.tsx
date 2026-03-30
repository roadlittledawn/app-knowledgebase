'use client';

/**
 * EntryMetadata Component
 * Displays entry metadata including topics, tags, languages, and skill level
 *
 * Requirements:
 * - 4.4: Display entry metadata including title, topics, tags, languages, and skill level
 */

import type { EntryFrontmatter } from '@/types/entry';

interface EntryMetadataProps {
  frontmatter: EntryFrontmatter;
}

const skillLevelLabels: Record<number, string> = {
  1: 'Beginner',
  2: 'Elementary',
  3: 'Intermediate',
  4: 'Advanced',
  5: 'Expert',
};

const skillLevelColors: Record<number, string> = {
  1: 'bg-green-500/10 text-green-500 border-green-500/20',
  2: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  3: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  4: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  5: 'bg-red-500/10 text-red-500 border-red-500/20',
};

export function EntryMetadata({ frontmatter }: EntryMetadataProps) {
  return (
    <div className="space-y-4">
      {/* Topics */}
      {frontmatter.topics.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {frontmatter.topics.map((topic) => (
            <span
              key={topic}
              className="px-3 py-1 text-sm rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20"
            >
              {topic}
            </span>
          ))}
        </div>
      )}

      {/* Metadata row */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--color-foreground-secondary)]">
        {/* Skill Level */}
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded-full border ${skillLevelColors[frontmatter.skillLevel]}`}
          >
            {skillLevelLabels[frontmatter.skillLevel]}
          </span>
        </div>

        {/* Tags */}
        {frontmatter.tags.length > 0 && (
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
            <div className="flex flex-wrap gap-1">
              {frontmatter.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs rounded-md bg-[var(--color-surface)] text-[var(--color-foreground-muted)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Languages */}
        {frontmatter.languages.length > 0 && (
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
            <div className="flex flex-wrap gap-1">
              {frontmatter.languages.map((lang) => (
                <span
                  key={lang}
                  className="px-2 py-0.5 text-xs rounded-md bg-[var(--color-secondary)]/10 text-[var(--color-secondary)]"
                >
                  {lang}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
