'use client';

/**
 * Browse Page
 * Main page for browsing knowledge entries organized by category
 *
 * Requirements:
 * - 4.1: Display categories hierarchically based on the Category collection
 * - 4.2: When a user selects a category, display entries belonging to that category
 * - 4.8: Display the count of entries in each category
 * - 5.1: Search the knowledgebase using keywords and natural language
 */

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CategoryTree } from '@/components/CategoryTree';
import { EntryCard } from '@/components/EntryCard';
import { SearchBar } from '@/components/SearchBar';
import { SearchResults } from '@/components/SearchResults';
import { TagFilter } from '@/components/TagFilter';
import { MobileDrawer } from '@/components/MobileDrawer';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { useMobileNav } from '@/components/MobileNavContext';
import type { CategoryTreeNode } from '@/types/category';
import type { IEntry } from '@/types/entry';
import type { SearchResultSource } from '@/lib/search/merge';

interface TagsResponse {
  tags: string[];
  languages: string[];
}

interface EntriesResponse {
  entries: Omit<IEntry, 'body'>[];
  total: number;
  page: number;
  pages: number;
}

interface SearchResult {
  entry: Omit<IEntry, 'body'>;
  score: number;
  source: SearchResultSource;
  excerpt?: string;
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
  mode: string;
}

/**
 * Collect a category's ID plus all of its descendants' IDs, so a parent category
 * page rolls up entries from every nested sub-category. Returns just the id if
 * the node isn't found yet (e.g. tree still loading).
 */
function collectCategoryAndDescendantIds(tree: CategoryTreeNode[], targetId: string): string[] {
  const findNode = (nodes: CategoryTreeNode[]): CategoryTreeNode | null => {
    for (const node of nodes) {
      if (node._id === targetId) return node;
      const found = findNode(node.children);
      if (found) return found;
    }
    return null;
  };

  const collect = (node: CategoryTreeNode): string[] => [
    node._id,
    ...node.children.flatMap(collect),
  ];

  const node = findNode(tree);
  return node ? collect(node) : [targetId];
}

/** Find a category node by ID anywhere in the tree. */
function findCategoryNode(tree: CategoryTreeNode[], targetId: string): CategoryTreeNode | null {
  for (const node of tree) {
    if (node._id === targetId) return node;
    const found = findCategoryNode(node.children, targetId);
    if (found) return found;
  }
  return null;
}

/**
 * Flatten a category subtree into a depth-first ordered list (including the root
 * node itself). `trail` holds the names of intermediate ancestors between the
 * selected root and the node (excluding both), used as a breadcrumb hint so the
 * grouped view can convey hierarchy without ragged indentation.
 */
function flattenSubtree(
  node: CategoryTreeNode,
  depth = 0,
  trail: string[] = []
): { node: CategoryTreeNode; depth: number; trail: string[] }[] {
  const childTrail = depth === 0 ? [] : [...trail, node.name];
  return [
    { node, depth, trail },
    ...node.children.flatMap((child) => flattenSubtree(child, depth + 1, childTrail)),
  ];
}

function BrowsePageContent() {
  const { close } = useMobileNav();
  const router = useRouter();
  const searchParams = useSearchParams();
  // The selected category is driven by the `categoryId` URL param so that links
  // (breadcrumbs, left nav) and browser back/forward stay in sync with the view.
  const selectedCategoryId = searchParams.get('categoryId');
  const [tree, setTree] = useState<CategoryTreeNode[]>([]);
  const [entries, setEntries] = useState<Omit<IEntry, 'body'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearchMode, setIsSearchMode] = useState(false);

  // Filter state
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);

  // Fetch category tree
  useEffect(() => {
    async function fetchTree() {
      try {
        const res = await fetch('/api/categories/tree');
        if (!res.ok) throw new Error('Failed to fetch categories');
        const data = await res.json();
        setTree(data.tree);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load categories');
      } finally {
        setLoading(false);
      }
    }
    fetchTree();
  }, []);

  // Fetch available tags and languages
  useEffect(() => {
    async function fetchTags() {
      try {
        const res = await fetch('/api/tags');
        if (!res.ok) throw new Error('Failed to fetch tags');
        const data: TagsResponse = await res.json();
        setAvailableTags(data.tags);
        setAvailableLanguages(data.languages);
      } catch (err) {
        console.error('Failed to load tags:', err);
      }
    }
    fetchTags();
  }, []);

  // The currently selected category node, and whether to show the grouped-by-
  // sub-category view (a parent with sub-categories) vs a flat paginated list.
  const selectedNode = selectedCategoryId ? findCategoryNode(tree, selectedCategoryId) : null;
  const isGroupedView = !!selectedNode && selectedNode.children.length > 0;

  // Fetch entries when category, page, or filters change
  const fetchEntries = useCallback(async () => {
    setEntriesLoading(true);
    try {
      const params = new URLSearchParams();
      const node = selectedCategoryId ? findCategoryNode(tree, selectedCategoryId) : null;
      const grouped = !!node && node.children.length > 0;

      if (selectedCategoryId) {
        // Roll up the selected category and all of its sub-categories.
        collectCategoryAndDescendantIds(tree, selectedCategoryId).forEach((id) =>
          params.append('categoryId', id)
        );
      }
      // Add filter parameters
      selectedTags.forEach((tag) => params.append('tag', tag));
      selectedLanguages.forEach((language) => params.append('language', language));
      // Grouped view renders all entries organized by sub-category, so fetch them
      // all in one page rather than paginating across group boundaries.
      params.set('page', grouped ? '1' : page.toString());
      params.set('limit', grouped ? '500' : '20');

      const res = await fetch(`/api/entries?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch entries');
      const data: EntriesResponse = await res.json();
      setEntries(data.entries);
      setTotalPages(data.pages);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load entries');
    } finally {
      setEntriesLoading(false);
    }
  }, [selectedCategoryId, page, selectedTags, selectedLanguages, tree]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleCategorySelect = (categoryId: string | null) => {
    // Update the URL param; the view derives its category from it.
    router.push(categoryId ? `/browse?categoryId=${categoryId}` : '/browse');
    // Exit search mode when selecting a category
    setIsSearchMode(false);
    setSearchQuery('');
    setSearchResults([]);
    setSearchError(null);
    close();
  };

  // Reset to the first page whenever the selected category changes (covers both
  // in-app selection and navigation via breadcrumb links / browser history).
  useEffect(() => {
    setPage(1);
  }, [selectedCategoryId]);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setSelectedTags([]);
    setSelectedLanguages([]);
    setPage(1);
  }, []);

  // Handle filter changes - reset page when filters change
  const handleTagsChange = useCallback((tags: string[]) => {
    setSelectedTags(tags);
    setPage(1);
  }, []);

  const handleLanguagesChange = useCallback((languages: string[]) => {
    setSelectedLanguages(languages);
    setPage(1);
  }, []);

  // Handle search
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    setIsSearchMode(true);
    setIsSearching(true);
    setSearchError(null);

    try {
      const params = new URLSearchParams({ q: query, mode: 'hybrid', limit: '20' });
      const res = await fetch(`/api/search?${params.toString()}`);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Search failed');
      }

      const data: SearchResponse = await res.json();
      setSearchResults(data.results);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Clear search and return to browse mode
  const handleClearSearch = useCallback(() => {
    setIsSearchMode(false);
    setSearchQuery('');
    setSearchResults([]);
    setSearchError(null);
  }, []);

  const getCategoryName = (categoryId: string | null): string => {
    if (!categoryId) return 'All Entries';
    const findCategory = (nodes: CategoryTreeNode[]): string | null => {
      for (const node of nodes) {
        if (node._id === categoryId) return node.name;
        if (node.children.length > 0) {
          const found = findCategory(node.children);
          if (found) return found;
        }
      }
      return null;
    };
    return findCategory(tree) || 'Unknown Category';
  };

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
      {/* Mobile drawer — category tree */}
      <MobileDrawer>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-foreground-muted)] mb-2">
          Categories
        </h2>
        <CategoryTree
          tree={tree}
          selectedCategoryId={selectedCategoryId ?? undefined}
          onSelect={handleCategorySelect}
        />
      </MobileDrawer>

      {/* Left sidebar — categories (lg+) */}
      <aside className="hidden lg:flex lg:flex-col w-64 flex-shrink-0 border-r border-[var(--color-border)] bg-[var(--color-background-secondary)] overflow-y-auto">
        <div className="p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-foreground-muted)] mb-2">
            Categories
          </h2>
          <CategoryTree
            tree={tree}
            selectedCategoryId={selectedCategoryId ?? undefined}
            onSelect={handleCategorySelect}
          />
        </div>
      </aside>

      {/* Center — entry list */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Filter collapsible — hidden on xl when right sidebar is visible */}
          <CollapsibleSection title="Filter" className="xl:hidden mb-4">
            <TagFilter
              tags={availableTags}
              languages={availableLanguages}
              selectedTags={selectedTags}
              selectedLanguages={selectedLanguages}
              onTagsChange={handleTagsChange}
              onLanguagesChange={handleLanguagesChange}
              onClearAll={handleClearFilters}
            />
          </CollapsibleSection>

          {/* Search bar */}
          <div className="mb-4">
            <SearchBar
              onSearch={handleSearch}
              placeholder="Search entries..."
              initialValue={searchQuery}
              isLoading={isSearching}
            />
          </div>

          {/* Search mode indicator and clear button */}
            {isSearchMode && (
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-[var(--color-foreground-muted)]">Search results</span>
                <button
                  onClick={handleClearSearch}
                  className="text-sm cursor-pointer text-[var(--color-primary)] hover:underline"
                >
                  Clear search
                </button>
              </div>
            )}

            {/* Content: either search results or browse entries */}
            {isSearchMode ? (
              <SearchResults
                results={searchResults}
                query={searchQuery}
                isLoading={isSearching}
                error={searchError}
              />
            ) : (
              <>
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
                    {getCategoryName(selectedCategoryId)}
                  </h1>
                  <p className="text-sm text-[var(--color-foreground-muted)] mt-1">
                    {total} {total === 1 ? 'entry' : 'entries'}
                  </p>
                </div>

                {entriesLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="h-32 bg-[var(--color-surface)] rounded-lg animate-pulse"
                      />
                    ))}
                  </div>
                ) : entries.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-[var(--color-foreground-muted)]">
                      No entries found in this category.
                    </p>
                  </div>
                ) : isGroupedView && selectedNode ? (
                  // Grouped view: entries organized by sub-category, mirroring the
                  // left-nav hierarchy (depth-first, indented by depth).
                  (() => {
                    const entriesByCategory = new Map<string, typeof entries>();
                    for (const entry of entries) {
                      const list = entriesByCategory.get(entry.categoryId) ?? [];
                      list.push(entry);
                      entriesByCategory.set(entry.categoryId, list);
                    }
                    const sections = flattenSubtree(selectedNode).filter(
                      ({ node }) => (entriesByCategory.get(node._id)?.length ?? 0) > 0
                    );
                    return (
                      <div className="space-y-6">
                        {sections.map(({ node, depth, trail }) => {
                          const sectionEntries = entriesByCategory.get(node._id) ?? [];
                          return (
                            <section key={node._id}>
                              {/* Skip a header for the selected category's own entries —
                                  the page heading already names it. */}
                              {depth > 0 && (
                                <div className="mb-2 flex items-baseline gap-2 border-b border-[var(--color-border)] pb-1.5">
                                  {trail.length > 0 && (
                                    <span className="text-xs text-[var(--color-foreground-muted)]">
                                      {trail.join(' / ')} /
                                    </span>
                                  )}
                                  <button
                                    onClick={() => handleCategorySelect(node._id)}
                                    className="text-sm font-semibold text-[var(--color-foreground)] hover:text-[var(--color-primary)] cursor-pointer"
                                  >
                                    {node.name}
                                  </button>
                                  <span className="text-xs text-[var(--color-foreground-muted)]">
                                    {sectionEntries.length}
                                  </span>
                                </div>
                              )}
                              <div className="space-y-1">
                                {sectionEntries.map((entry) => (
                                  <EntryCard key={entry._id} entry={entry} compact />
                                ))}
                              </div>
                            </section>
                          );
                        })}
                      </div>
                    );
                  })()
                ) : (
                  <>
                    <div className="space-y-4">
                      {entries.map((entry) => (
                        <EntryCard key={entry._id} entry={entry} />
                      ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="mt-8 flex items-center justify-center gap-2">
                        <button
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="px-3 py-1.5 text-sm rounded-md border border-[var(--color-border)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--color-surface-hover)]"
                        >
                          Previous
                        </button>
                        <span className="text-sm text-[var(--color-foreground-muted)]">
                          Page {page} of {totalPages}
                        </span>
                        <button
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                          className="px-3 py-1.5 text-sm rounded-md border border-[var(--color-border)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--color-surface-hover)]"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </main>

        {/* Right sidebar — filters (visible on xl+) */}
        <aside className="hidden xl:flex xl:flex-col w-64 flex-shrink-0 border-l border-[var(--color-border)] bg-[var(--color-background-secondary)] overflow-y-auto">
          <div className="p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-foreground-muted)] mb-3">
              Filter
            </h2>
            <TagFilter
              tags={availableTags}
              languages={availableLanguages}
              selectedTags={selectedTags}
              selectedLanguages={selectedLanguages}
              onTagsChange={handleTagsChange}
              onLanguagesChange={handleLanguagesChange}
              onClearAll={handleClearFilters}
            />
          </div>
        </aside>
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse text-[var(--color-foreground-muted)]">Loading...</div>
        </div>
      }
    >
      <BrowsePageContent />
    </Suspense>
  );
}
