'use client';

import { useState, useEffect } from 'react';
import { FileExplorerNav } from '@/components/FileExplorerNav';
import { EntryCard } from '@/components/EntryCard';
import { ResizableLayout } from '@/components/ResizableLayout';
import { MobileDrawer } from '@/components/MobileDrawer';
import { useMobileNav } from '@/components/MobileNavContext';
import type { FileExplorerTreeNode } from '@/types/category';
import type { IEntry } from '@/types/entry';

interface EntriesResponse {
  entries: Omit<IEntry, 'body'>[];
  total: number;
}

function BrowsePageContent() {
  const { close } = useMobileNav();
  const [tree, setTree] = useState<FileExplorerTreeNode[]>([]);
  const [recentEntries, setRecentEntries] = useState<Omit<IEntry, 'body'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [treeRes, entriesRes] = await Promise.all([
          fetch('/api/categories/tree-with-entries'),
          fetch('/api/entries?limit=12&sort=-updatedAt'),
        ]);

        if (!treeRes.ok) throw new Error('Failed to fetch categories');
        if (!entriesRes.ok) throw new Error('Failed to fetch entries');

        const treeData = await treeRes.json();
        const entriesData: EntriesResponse = await entriesRes.json();

        setTree(treeData.tree);
        setRecentEntries(entriesData.entries);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-[var(--color-foreground-muted)]">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[var(--color-error)]">{error}</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex min-h-0">
      {/* Mobile drawer */}
      <MobileDrawer>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-foreground-muted)] mb-2">
          Browse
        </h2>
        <FileExplorerNav tree={tree} onEntryClick={close} />
      </MobileDrawer>

      <ResizableLayout
        sidebar={<FileExplorerNav tree={tree} onEntryClick={close} />}
      >
        <main className="h-full overflow-y-auto overflow-x-hidden">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
                Knowledgebase
              </h1>
              <p className="text-sm text-[var(--color-foreground-muted)] mt-1">
                Browse the category tree to find entries, or use search (Cmd+K) to find something specific.
              </p>
            </div>

            <section>
              <h2 className="text-lg font-semibold text-[var(--color-foreground)] mb-4">
                Recently Updated
              </h2>
              {recentEntries.length === 0 ? (
                <p className="text-[var(--color-foreground-muted)]">No entries yet.</p>
              ) : (
                <div className="space-y-3">
                  {recentEntries.map((entry) => (
                    <EntryCard key={entry._id} entry={entry} />
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </ResizableLayout>
    </div>
  );
}

export default function BrowsePage() {
  return <BrowsePageContent />;
}
