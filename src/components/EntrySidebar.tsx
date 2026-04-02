import Link from 'next/link';
import type { IEntry } from '@/types/entry';

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

interface EntrySidebarProps {
  entry: Omit<IEntry, 'body'>;
  relatedEntries: Omit<IEntry, 'body'>[];
  authenticated: boolean;
}

export function EntrySidebar({ entry, relatedEntries, authenticated }: EntrySidebarProps) {
  const hasStatusBadges =
    entry.status === 'draft' || entry.frontmatter.isPrivate || entry.frontmatter.needsHelp;

  return (
    <div className="p-5 space-y-6 text-sm">
      {/* Edit button */}
      {authenticated && (
        <Link
          href={`/entries/${entry._id}/edit`}
          className="block w-full text-center px-3 py-2 rounded-md bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] transition-colors font-medium"
        >
          Edit Entry
        </Link>
      )}

      {/* Status */}
      {hasStatusBadges && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-foreground-muted)] mb-2">
            Status
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {entry.status === 'draft' && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--color-warning-background)] text-[var(--color-warning)]">
                Draft
              </span>
            )}
            {entry.frontmatter.isPrivate && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--color-error-background)] text-[var(--color-error)]">
                Private
              </span>
            )}
            {entry.frontmatter.needsHelp && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--color-info-background)] text-[var(--color-info)]">
                Needs Help
              </span>
            )}
          </div>
        </div>
      )}

      {/* Skill Level */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-foreground-muted)] mb-2">
          Skill Level
        </h3>
        <span
          className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full border ${skillLevelColors[entry.frontmatter.skillLevel]}`}
        >
          {skillLevelLabels[entry.frontmatter.skillLevel]}
        </span>
      </div>

      {/* Tags */}
      {entry.frontmatter.tags.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-foreground-muted)] mb-2">
            Tags
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {entry.frontmatter.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs rounded-md bg-[var(--color-surface)] text-[var(--color-foreground-muted)] border border-[var(--color-border)]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Languages */}
      {entry.frontmatter.languages.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-foreground-muted)] mb-2">
            Languages
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {entry.frontmatter.languages.map((lang) => (
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

      {/* Related Entries */}
      {relatedEntries.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-foreground-muted)] mb-2">
            Related
          </h3>
          <ul className="space-y-2">
            {relatedEntries.map((related) => (
              <li key={related._id}>
                <Link
                  href={`/browse/${related.slug}`}
                  className="flex items-start gap-2 text-xs text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] hover:underline"
                >
                  <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] mt-1" />
                  <span>{related.frontmatter.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* External Resources */}
      {entry.frontmatter.resources.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-foreground-muted)] mb-2">
            Resources
          </h3>
          <ul className="space-y-2">
            {entry.frontmatter.resources.map((resource, i) => (
              <li key={i}>
                <a
                  href={resource.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 text-xs text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] hover:underline"
                >
                  <svg
                    className="shrink-0 w-3.5 h-3.5 mt-0.5"
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
                  <span>{resource.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Last Updated */}
      <div className="pt-4 border-t border-[var(--color-border)]">
        <p className="text-xs text-[var(--color-foreground-muted)]">
          Updated{' '}
          {new Date(entry.updatedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </p>
      </div>
    </div>
  );
}
