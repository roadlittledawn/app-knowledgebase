'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Search,
  ChevronUp,
  ChevronDown,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import type { IEntry } from '@/types/entry';
import type { ICategory } from '@/types/category';

type EntryListItem = Omit<IEntry, 'body'>;

interface EntriesResponse {
  entries: EntryListItem[];
  total: number;
  page: number;
  pages: number;
}

type SortField = 'frontmatter.title' | 'createdAt' | 'updatedAt';
type SortOrder = 'asc' | 'desc';

const ENTRIES_PER_PAGE = 20;

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

function SortIcon({ field, activeField, order }: { field: SortField; activeField: SortField; order: SortOrder }) {
  if (field !== activeField) {
    return (
      <span className="ml-1 inline-flex flex-col opacity-30">
        <ChevronUp size={10} />
        <ChevronDown size={10} className="-mt-1" />
      </span>
    );
  }
  return (
    <span className="ml-1 inline-flex items-center text-[var(--color-primary)]">
      {order === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
    </span>
  );
}

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="h-12 bg-[var(--color-surface)] rounded" />
      ))}
    </div>
  );
}

export function EntryManagementTable() {
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'draft' | 'published'>('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  const [entries, setEntries] = useState<EntryListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const categoryMap = useRef<Map<string, string>>(new Map());

  // Build category lookup map
  useEffect(() => {
    const map = new Map<string, string>();
    categories.forEach((cat) => map.set(cat._id, cat.name));
    categoryMap.current = map;
  }, [categories]);

  // Fetch categories and tags on mount
  useEffect(() => {
    async function fetchFilterData() {
      try {
        const [catRes, tagRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/tags'),
        ]);

        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(catData.categories || []);
        }
        if (tagRes.ok) {
          const tagData = await tagRes.json();
          setTags(tagData.tags || []);
        }
      } catch {
        // Filter data is non-critical; entries still load
      }
    }

    fetchFilterData();
  }, []);

  // Fetch entries when filters/sort/page change
  useEffect(() => {
    let cancelled = false;

    async function fetchEntries() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set('page', String(currentPage));
        params.set('limit', String(ENTRIES_PER_PAGE));

        const sortPrefix = sortOrder === 'desc' ? '-' : '';
        params.set('sort', `${sortPrefix}${sortField}`);

        if (statusFilter) params.set('status', statusFilter);
        if (categoryFilter) params.set('categoryId', categoryFilter);
        if (tagFilter) params.set('tag', tagFilter);

        const res = await fetch(`/api/entries?${params.toString()}`);

        if (!res.ok) {
          throw new Error(`Failed to fetch entries (${res.status})`);
        }

        const data: EntriesResponse = await res.json();

        if (!cancelled) {
          setEntries(data.entries);
          setTotal(data.total);
          setTotalPages(data.pages);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load entries');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchEntries();

    return () => {
      cancelled = true;
    };
  }, [currentPage, sortField, sortOrder, statusFilter, categoryFilter, tagFilter]);

  const handleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortOrder('desc');
      return field;
    });
    setCurrentPage(1);
  }, []);

  const handleToggleStatus = useCallback(async (entry: EntryListItem) => {
    const newStatus = entry.status === 'published' ? 'draft' : 'published';
    setActionLoading(entry._id);

    try {
      const res = await fetch(`/api/entries/${entry._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error('Failed to update status');

      setEntries((prev) =>
        prev.map((e) => (e._id === entry._id ? { ...e, status: newStatus } : e))
      );
    } catch {
      setError('Failed to update entry status. Please try again.');
    } finally {
      setActionLoading(null);
    }
  }, []);

  const handleDelete = useCallback(async (entry: EntryListItem) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${entry.frontmatter.title}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    setActionLoading(entry._id);

    try {
      const res = await fetch(`/api/entries/${entry._id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete entry');

      setEntries((prev) => prev.filter((e) => e._id !== entry._id));
      setTotal((prev) => prev - 1);
    } catch {
      setError('Failed to delete entry. Please try again.');
    } finally {
      setActionLoading(null);
    }
  }, []);

  const clearFilters = useCallback(() => {
    setSearchText('');
    setStatusFilter('');
    setCategoryFilter('');
    setTagFilter('');
    setCurrentPage(1);
  }, []);

  const hasActiveFilters = searchText || statusFilter || categoryFilter || tagFilter;

  // Client-side title search on fetched results
  const filteredEntries = searchText
    ? entries.filter((e) =>
        e.frontmatter.title.toLowerCase().includes(searchText.toLowerCase())
      )
    : entries;

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-input-placeholder)]"
        />
        <input
          type="text"
          placeholder="Search entries by title..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg
            bg-[var(--color-input)] border border-[var(--color-input-border)]
            text-[var(--color-foreground)] placeholder:text-[var(--color-input-placeholder)]
            focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:border-[var(--color-border-focus)]
            transition-colors"
        />
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as '' | 'draft' | 'published');
            setCurrentPage(1);
          }}
          className="px-3 py-2 rounded-lg bg-[var(--color-input)] border border-[var(--color-input-border)]
            text-[var(--color-foreground)] text-sm
            focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]
            transition-colors"
        >
          <option value="">All Statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="px-3 py-2 rounded-lg bg-[var(--color-input)] border border-[var(--color-input-border)]
            text-[var(--color-foreground)] text-sm
            focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]
            transition-colors"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat._id} value={cat._id}>
              {cat.name}
            </option>
          ))}
        </select>

        <select
          value={tagFilter}
          onChange={(e) => {
            setTagFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="px-3 py-2 rounded-lg bg-[var(--color-input)] border border-[var(--color-input-border)]
            text-[var(--color-foreground)] text-sm
            focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]
            transition-colors"
        >
          <option value="">All Tags</option>
          {tags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm
              text-[var(--color-foreground-secondary)] hover:text-[var(--color-foreground)]
              hover:bg-[var(--color-surface-hover)] transition-colors"
          >
            <X size={14} />
            Clear Filters
          </button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-[var(--color-error-background)] border border-[var(--color-error)] rounded-lg p-4 flex items-center justify-between">
          <p className="text-[var(--color-error)] text-sm">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-[var(--color-error)] hover:text-[var(--color-error-hover)] ml-4"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <TableSkeleton />
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-16 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
          <p className="text-[var(--color-foreground-muted)] text-lg">No entries found</p>
          <p className="text-[var(--color-foreground-muted)] text-sm mt-1">
            {hasActiveFilters
              ? 'Try adjusting your search or filters.'
              : 'Create your first entry to get started.'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 px-4 py-2 text-sm rounded-lg
                bg-[var(--color-primary)] text-[var(--color-primary-foreground)]
                hover:bg-[var(--color-primary-hover)] transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--color-background-secondary)] border-b border-[var(--color-border)]">
                <th className="text-left px-4 py-3 font-medium text-[var(--color-foreground-secondary)]">
                  <button
                    onClick={() => handleSort('frontmatter.title')}
                    className="inline-flex items-center hover:text-[var(--color-foreground)] transition-colors"
                  >
                    Title
                    <SortIcon field="frontmatter.title" activeField={sortField} order={sortOrder} />
                  </button>
                </th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-foreground-secondary)]">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-foreground-secondary)] hidden md:table-cell">
                  Category
                </th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-foreground-secondary)] hidden lg:table-cell">
                  Tags
                </th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-foreground-secondary)] hidden sm:table-cell">
                  <button
                    onClick={() => handleSort('createdAt')}
                    className="inline-flex items-center hover:text-[var(--color-foreground)] transition-colors"
                  >
                    Created
                    <SortIcon field="createdAt" activeField={sortField} order={sortOrder} />
                  </button>
                </th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-foreground-secondary)]">
                  <button
                    onClick={() => handleSort('updatedAt')}
                    className="inline-flex items-center hover:text-[var(--color-foreground)] transition-colors"
                  >
                    Updated
                    <SortIcon field="updatedAt" activeField={sortField} order={sortOrder} />
                  </button>
                </th>
                <th className="text-right px-4 py-3 font-medium text-[var(--color-foreground-secondary)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry, index) => (
                <tr
                  key={entry._id}
                  className={`border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-surface-hover)] transition-colors ${
                    index % 2 === 0 ? 'bg-[var(--color-surface)]' : 'bg-[var(--color-background)]'
                  }`}
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/entries/${entry._id}/edit`}
                      className="text-[var(--color-foreground)] hover:text-[var(--color-primary)] font-medium transition-colors"
                    >
                      {entry.frontmatter.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        entry.status === 'published'
                          ? 'bg-[var(--color-success-background)] text-[var(--color-success)]'
                          : 'bg-[var(--color-warning-background)] text-[var(--color-warning)]'
                      }`}
                    >
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-foreground-secondary)] hidden md:table-cell">
                    {categoryMap.current.get(entry.categoryId) || '—'}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-foreground-muted)] hidden lg:table-cell max-w-[200px] truncate">
                    {entry.frontmatter.tags.length > 0
                      ? entry.frontmatter.tags.join(', ')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-foreground-muted)] hidden sm:table-cell whitespace-nowrap">
                    {formatRelativeTime(entry.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-foreground-muted)] whitespace-nowrap">
                    {formatRelativeTime(entry.updatedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/entries/${entry._id}/edit`}
                        className="p-1.5 rounded-md text-[var(--color-foreground-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-active)] transition-colors"
                        title="Edit entry"
                      >
                        <Pencil size={16} />
                      </Link>
                      <button
                        onClick={() => handleToggleStatus(entry)}
                        disabled={actionLoading === entry._id}
                        className="p-1.5 rounded-md text-[var(--color-foreground-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-active)] transition-colors disabled:opacity-50"
                        title={entry.status === 'published' ? 'Unpublish' : 'Publish'}
                      >
                        {entry.status === 'published' ? (
                          <XCircle size={16} />
                        ) : (
                          <CheckCircle size={16} />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(entry)}
                        disabled={actionLoading === entry._id}
                        className="p-1.5 rounded-md text-[var(--color-foreground-muted)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-background)] transition-colors disabled:opacity-50"
                        title="Delete entry"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <p className="text-sm text-[var(--color-foreground-muted)]">
            Showing{' '}
            <span className="font-medium text-[var(--color-foreground-secondary)]">
              {(currentPage - 1) * ENTRIES_PER_PAGE + 1}
            </span>
            –
            <span className="font-medium text-[var(--color-foreground-secondary)]">
              {Math.min(currentPage * ENTRIES_PER_PAGE, total)}
            </span>{' '}
            of{' '}
            <span className="font-medium text-[var(--color-foreground-secondary)]">{total}</span>{' '}
            entries
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm
                border border-[var(--color-border)] text-[var(--color-foreground-secondary)]
                hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border-hover)]
                disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
              Previous
            </button>

            <span className="text-sm text-[var(--color-foreground-muted)] px-2">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm
                border border-[var(--color-border)] text-[var(--color-foreground-secondary)]
                hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border-hover)]
                disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
