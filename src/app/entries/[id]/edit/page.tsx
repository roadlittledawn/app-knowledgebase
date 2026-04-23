'use client';

/**
 * Edit Entry Page
 * Page for editing existing knowledge entries
 *
 * Requirements:
 * - 6.1: Display a split-pane layout with Monaco editor and preview pane
 * - 6.2: Use react-resizable-panels for adjustable pane sizes
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { EntryEditor } from '@/components/EntryEditor';
import type { CategoryTreeNode } from '@/types/category';
import type { IEntry } from '@/types/entry';

export default function EditEntryPage() {
  const router = useRouter();
  const params = useParams();
  const entryId = params.id as string;

  const [entry, setEntry] = useState<IEntry | null>(null);
  const [categories, setCategories] = useState<CategoryTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch entry and categories
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch entry and categories in parallel
        const [entryRes, categoriesRes] = await Promise.all([
          fetch(`/api/entries/${entryId}`),
          fetch('/api/categories/tree'),
        ]);

        if (!entryRes.ok) {
          if (entryRes.status === 404) {
            throw new Error('Entry not found');
          }
          throw new Error('Failed to fetch entry');
        }

        if (!categoriesRes.ok) {
          throw new Error('Failed to fetch categories');
        }

        const [entryData, categoriesData] = await Promise.all([
          entryRes.json(),
          categoriesRes.json(),
        ]);

        setEntry(entryData.entry);
        setCategories(categoriesData.tree);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    if (entryId) {
      fetchData();
    }
  }, [entryId]);

  // Handle save - update existing entry
  const handleSave = useCallback(
    async (entryData: Partial<IEntry>) => {
      const res = await fetch(`/api/entries/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: entryData.slug,
          categoryId: entryData.categoryId,
          status: entryData.status,
          frontmatter: entryData.frontmatter,
          body: entryData.body,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update entry');
      }

      const { entry: updatedEntry } = await res.json();
      setEntry(updatedEntry);
      return updatedEntry;
    },
    [entryId]
  );

  // Handle delete
  const handleDelete = useCallback(async () => {
    const res = await fetch(`/api/entries/${entryId}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to delete entry');
    }

    // Redirect to browse page after deletion
    router.push('/browse');
  }, [entryId, router]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--color-background)]">
        <div className="animate-pulse text-[var(--color-foreground-muted)]">Loading...</div>
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--color-background)]">
        <div className="text-center">
          <p className="text-[var(--color-error)] mb-4">{error || 'Entry not found'}</p>
          <Link href="/browse" className="text-[var(--color-primary)] hover:underline">
            Return to Browse
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Sub-header with back button and entry title */}
      <div className="flex-shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="px-4 h-12 flex items-center gap-4">
          <Link
            href="/admin"
            className="text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] transition-colors"
            aria-label="Back to admin dashboard"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </Link>
          <h1 className="text-base font-medium text-[var(--color-foreground)]">Edit Entry</h1>
          {entry.status === 'published' && entry.slug ? (
            <Link
              href={`/browse/${entry.slug}`}
              target="_blank"
              className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] hover:underline whitespace-nowrap"
              title="Open in new tab"
            >
              View Published Entry
            </Link>
          ) : null}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <EntryEditor
          entry={entry}
          categories={categories}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
