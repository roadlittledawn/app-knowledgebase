'use client';

/**
 * New Entry Page
 * Page for creating new knowledge entries
 *
 * Requirements:
 * - 6.1: Display a split-pane layout with Monaco editor and preview pane
 * - 6.2: Use react-resizable-panels for adjustable pane sizes
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { EntryEditor } from '@/components/EntryEditor';
import type { CategoryTreeNode } from '@/types/category';
import type { IEntry } from '@/types/entry';

export default function NewEntryPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch categories for the CategoryPicker
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch('/api/categories/tree');
        if (!res.ok) throw new Error('Failed to fetch categories');
        const data = await res.json();
        setCategories(data.tree);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load categories');
      } finally {
        setLoading(false);
      }
    }
    fetchCategories();
  }, []);

  // Handle save - create new entry
  const handleSave = useCallback(
    async (entryData: Partial<IEntry>) => {
      const res = await fetch('/api/entries', {
        method: 'POST',
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
        throw new Error(data.error || 'Failed to create entry');
      }

      const { entry } = await res.json();
      // Redirect to edit page after creation
      router.push(`/entries/${entry._id}/edit`);
    },
    [router]
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--color-background)]">
        <div className="animate-pulse text-[var(--color-foreground-muted)]">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--color-background)]">
        <div className="text-center">
          <p className="text-[var(--color-error)] mb-4">{error}</p>
          <Link href="/browse" className="text-[var(--color-primary)] hover:underline">
            Return to Browse
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Sub-header with back button and title */}
      <div className="flex-shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="px-4 h-12 flex items-center gap-4">
          <Link
            href="/browse"
            className="text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] transition-colors"
            aria-label="Back to browse"
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
          <h1 className="text-base font-medium text-[var(--color-foreground)]">New Entry</h1>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <EntryEditor categories={categories} onSave={handleSave} />
      </div>
    </div>
  );
}
