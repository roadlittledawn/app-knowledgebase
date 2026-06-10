'use client';

import { useRouter } from 'next/navigation';
import { CategoryTree } from '@/components/CategoryTree';
import type { CategoryTreeNode } from '@/types/category';

interface CategoryNavSidebarProps {
  tree: CategoryTreeNode[];
  selectedCategoryId?: string;
}

/**
 * Wraps CategoryTree for use in server-component pages (e.g. entry detail).
 * Selecting a category navigates to that category's browse page; selecting
 * "All Entries" navigates to /browse with no category filter.
 */
export function CategoryNavSidebar({ tree, selectedCategoryId }: CategoryNavSidebarProps) {
  const router = useRouter();

  return (
    <CategoryTree
      tree={tree}
      selectedCategoryId={selectedCategoryId}
      onSelect={(categoryId) =>
        router.push(categoryId ? `/browse?categoryId=${categoryId}` : '/browse')
      }
    />
  );
}
