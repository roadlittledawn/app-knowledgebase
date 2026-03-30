'use client';

/**
 * RecentEntries Component
 * Displays lists of recently created and recently updated entries
 *
 * Requirements: 10.3
 * - 10.3: Display lists of recently created and recently updated entries
 */

import Link from 'next/link';

interface RecentEntry {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

interface RecentEntriesProps {
  recentlyCreated: RecentEntry[];
  recentlyUpdated: RecentEntry[];
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

interface EntryListProps {
  title: string;
  entries: RecentEntry[];
  dateField: 'createdAt' | 'updatedAt';
  icon: React.ReactNode;
}

function EntryList({ title, entries, dateField, icon }: EntryListProps) {
  return (
    <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[var(--color-primary)]">{icon}</span>
        <h3 className="text-lg font-semibold text-[var(--color-foreground)]">{title}</h3>
      </div>
      {entries.length === 0 ? (
        <p className="text-[var(--color-foreground-muted)] text-sm">No entries yet</p>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry) => (
            <li key={entry.id}>
              <Link
                href={`/entries/${entry.id}/edit`}
                className="flex items-center justify-between gap-2 p-2 -mx-2 rounded-md hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                <span className="text-sm text-[var(--color-foreground)] truncate flex-1">
                  {entry.title}
                </span>
                <span className="text-xs text-[var(--color-foreground-muted)] flex-shrink-0">
                  {formatRelativeTime(entry[dateField])}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function RecentEntries({ recentlyCreated, recentlyUpdated }: RecentEntriesProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <EntryList
        title="Recently Created"
        entries={recentlyCreated}
        dateField="createdAt"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
        }
      />
      <EntryList
        title="Recently Updated"
        entries={recentlyUpdated}
        dateField="updatedAt"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        }
      />
    </div>
  );
}
