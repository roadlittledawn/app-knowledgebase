/**
 * Category query utilities
 * Provides reusable functions for building category trees and paths
 */

import { connectToDatabase } from '@/lib/db/connection';
import { Category } from '@/lib/db/models/Category';
import { Entry } from '@/lib/db/models/Entry';
import type { ICategory, CategoryTreeNode } from '@/types/category';

/**
 * Input type for categories that can be either Mongoose documents or plain objects
 * Supports both ObjectId and string _id types
 */
interface CategoryInput {
  _id: { toString(): string } | string;
  name: string;
  slug: string;
  parentId: { toString(): string } | string | null;
  order: number;
}

/**
 * Build a hierarchical tree structure from a flat array of categories
 *
 * @param categories - Flat array of category documents
 * @param entryCounts - Map of category ID to entry count
 * @returns Array of root-level CategoryTreeNode with nested children
 *
 * Validates: Requirements 3.9, 4.1, 4.8
 */
export function buildTree(
  categories: CategoryInput[],
  entryCounts: Map<string, number> = new Map()
): CategoryTreeNode[] {
  const map = new Map<string, CategoryTreeNode>();
  const roots: CategoryTreeNode[] = [];

  // Create nodes for all categories
  for (const cat of categories) {
    const id = typeof cat._id === 'string' ? cat._id : cat._id.toString();
    map.set(id, {
      _id: id,
      name: cat.name,
      slug: cat.slug,
      order: cat.order,
      entryCount: entryCounts.get(id) || 0,
      children: [],
    });
  }

  // Build hierarchy by linking children to parents
  for (const cat of categories) {
    const id = typeof cat._id === 'string' ? cat._id : cat._id.toString();
    const node = map.get(id)!;

    if (cat.parentId) {
      const parentId = typeof cat.parentId === 'string' ? cat.parentId : cat.parentId.toString();
      const parent = map.get(parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        // Parent not found in the provided categories, treat as root
        roots.push(node);
      }
    } else {
      // No parent means this is a root category
      roots.push(node);
    }
  }

  // Sort children by order recursively
  const sortChildren = (nodes: CategoryTreeNode[]) => {
    nodes.sort((a, b) => a.order - b.order);
    nodes.forEach((n) => sortChildren(n.children));
  };
  sortChildren(roots);

  return roots;
}

/**
 * Get the full path string for a category (for breadcrumbs, Pinecone metadata)
 * Returns a slash-separated string of slugs from root to the specified category
 *
 * @param categoryId - The ID of the category to get the path for
 * @returns Path string like "software-engineering/ai/agents"
 *
 * Validates: Requirements 4.7
 */
export async function getCategoryPath(categoryId: string): Promise<string> {
  await connectToDatabase();

  const path = await Category.getPath(categoryId);
  return path.map((c: ICategory) => c.slug).join('/');
}

/**
 * Get the full category path as an array of ICategory objects
 * Useful for breadcrumb navigation where you need full category details
 *
 * @param categoryId - The ID of the category to get the path for
 * @returns Array of ICategory from root to the specified category
 */
export async function getCategoryPathArray(categoryId: string): Promise<ICategory[]> {
  await connectToDatabase();

  return Category.getPath(categoryId);
}

/**
 * Get entry counts for all categories
 * Aggregates the number of entries per category
 *
 * @returns Map of category ID to entry count
 *
 * Validates: Requirements 4.8
 */
export async function getEntryCounts(): Promise<Map<string, number>> {
  await connectToDatabase();

  const entryCountsAgg = await Entry.aggregate([
    {
      $group: {
        _id: '$categoryId',
        count: { $sum: 1 },
      },
    },
  ]);

  const entryCounts = new Map<string, number>();
  for (const item of entryCountsAgg) {
    if (item._id) {
      entryCounts.set(item._id.toString(), item.count);
    }
  }

  return entryCounts;
}

/**
 * Get entry count for a specific category
 *
 * @param categoryId - The ID of the category
 * @returns Number of entries in the category
 */
export async function getEntryCountForCategory(categoryId: string): Promise<number> {
  await connectToDatabase();

  return Entry.countDocuments({ categoryId });
}

/**
 * Get the full category tree with entry counts
 * Combines fetching all categories and entry counts into a single operation
 *
 * @returns Array of root-level CategoryTreeNode with nested children and entry counts
 *
 * Validates: Requirements 3.9, 4.1, 4.8
 */
export async function getCategoryTreeWithCounts(): Promise<CategoryTreeNode[]> {
  await connectToDatabase();

  // Fetch all categories sorted by order
  const categories = await Category.find().sort({ order: 1 }).lean();

  // Get entry counts
  const entryCounts = await getEntryCounts();

  // Build and return the tree
  return buildTree(categories, entryCounts);
}

/**
 * Find a category by its slug path
 * Traverses the category hierarchy to find a category by its full path
 *
 * @param slugPath - Array of slugs from root to target category
 * @returns The category if found, null otherwise
 */
export async function findCategoryByPath(slugPath: string[]): Promise<ICategory | null> {
  await connectToDatabase();

  let parentId: string | null = null;
  let category = null;

  for (const slug of slugPath) {
    const query: { slug: string; parentId: string | null } = { slug, parentId };
    category = await Category.findOne(query).lean();

    if (!category) {
      return null;
    }

    parentId = category._id.toString();
  }

  if (!category) {
    return null;
  }

  return {
    _id: category._id.toString(),
    slug: category.slug,
    name: category.name,
    parentId: category.parentId?.toString() ?? null,
    order: category.order,
    description: category.description,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}
