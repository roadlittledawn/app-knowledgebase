/**
 * Category Tree API route
 * GET /api/categories/tree - Get full category tree with entry counts
 */

import { NextResponse } from 'next/server';
import { getCategoryTreeWithCounts } from '@/lib/db/queries/categories';
import type { CategoryTreeNode } from '@/types/category';

interface CategoryTreeResponse {
  tree: CategoryTreeNode[];
}

interface ErrorResponse {
  error: string;
  code?: string;
}

/**
 * GET /api/categories/tree
 * Get full category tree with entry counts in a single query
 *
 * Validates: Requirements 3.9, 4.1, 4.8
 */
export async function GET(): Promise<NextResponse<CategoryTreeResponse | ErrorResponse>> {
  try {
    const tree = await getCategoryTreeWithCounts();
    return NextResponse.json({ tree });
  } catch (error) {
    console.error('Error getting category tree:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
