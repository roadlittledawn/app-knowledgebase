'use client';

/**
 * Admin Categories Management Page
 *
 * Provides a dedicated admin interface for managing the category tree:
 * - View and navigate the full category hierarchy
 * - Create new categories (root or child)
 * - Rename existing categories
 * - Reorder categories within their parent
 * - Move categories to a different parent (restructure hierarchy)
 * - Delete empty categories
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FolderTree } from 'lucide-react';
import { CategoryManager } from '@/components/CategoryManager';
import type { CategoryTreeNode, ICategory } from '@/types/category';

export const dynamic = 'force-dynamic';

export default function AdminCategoriesPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tree, setTree] = useState<CategoryTreeNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/admin/stats');
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        if (res.ok) {
          setAuthorized(true);
        }
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [router]);

  const fetchTree = useCallback(async () => {
    try {
      setTreeLoading(true);
      const res = await fetch('/api/categories/tree');
      if (res.ok) {
        const data = await res.json();
        setTree(data.tree);
      }
    } catch (err) {
      console.error('Failed to fetch category tree:', err);
    } finally {
      setTreeLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authorized) {
      fetchTree();
    }
  }, [authorized, fetchTree]);

  const handleCreateCategory = useCallback(
    async (data: {
      name: string;
      slug?: string;
      parentId?: string | null;
      order?: number;
      description?: string;
    }): Promise<ICategory> => {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create category');
      }
      const result = await res.json();
      return result.category;
    },
    []
  );

  const handleUpdateCategory = useCallback(
    async (
      id: string,
      data: {
        name?: string;
        slug?: string;
        parentId?: string | null;
        order?: number;
        description?: string;
      }
    ): Promise<ICategory> => {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update category');
      }
      const result = await res.json();
      return result.category;
    },
    []
  );

  const handleDeleteCategory = useCallback(async (id: string): Promise<void> => {
    const res = await fetch(`/api/categories/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete category');
    }
  }, []);

  const handleReorderCategories = useCallback(
    async (categoryId: string, newOrder: number): Promise<void> => {
      const res = await fetch(`/api/categories/${categoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: newOrder }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to reorder category');
      }
    },
    []
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-[var(--color-surface)] rounded w-48" />
            <div className="h-4 bg-[var(--color-surface)] rounded w-72" />
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-12 bg-[var(--color-surface)] rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <div className="flex-1 bg-[var(--color-background)]">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Back link */}
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-foreground)] flex items-center gap-2">
              <FolderTree size={24} />
              Manage Categories
            </h1>
            <p className="text-[var(--color-foreground-muted)] mt-1">
              Create, rename, reorder, move, and delete categories
            </p>
          </div>
        </div>

        {/* Category Manager */}
        {treeLoading ? (
          <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-4">
            <div className="animate-pulse space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div
                    className="h-6 bg-[var(--color-background)] rounded flex-1"
                    style={{ marginLeft: `${(i % 3) * 20}px` }}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <CategoryManager
            tree={tree}
            onCreateCategory={handleCreateCategory}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
            onReorderCategories={handleReorderCategories}
            onRefresh={fetchTree}
          />
        )}
      </div>
    </div>
  );
}
