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
 * Selecting any category navigates back to /browse.
 */
export function CategoryNavSidebar({ tree, selectedCategoryId }: CategoryNavSidebarProps) {
  const router = useRouter();

  return (
    <CategoryTree
      tree={tree}
      selectedCategoryId={selectedCategoryId}
      onSelect={() => router.push('/browse')}
    />
  );
}
