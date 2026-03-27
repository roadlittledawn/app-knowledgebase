/**
 * Category type definitions for the knowledgebase application
 * Defines the hierarchical taxonomy structure for organizing entries
 */

/**
 * Main category interface representing a taxonomy node
 */
export interface ICategory {
  _id: string;
  slug: string; // URL segment, unique within parent
  name: string; // Display name
  parentId: string | null; // null = root category
  order: number; // Sort order within parent (0-indexed)
  description?: string; // Optional category description
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Category tree node with children and entry count
 * Used for rendering the category navigation tree
 */
export interface CategoryTreeNode {
  _id: string;
  name: string;
  slug: string;
  order: number;
  entryCount: number;
  children: CategoryTreeNode[];
}

/**
 * Category creation request
 */
export interface CreateCategoryInput {
  name: string;
  slug?: string; // Auto-generated if not provided
  parentId?: string | null; // null = root category
  order?: number;
  description?: string;
}

/**
 * Category update request (all fields optional)
 */
export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  parentId?: string | null;
  order?: number;
  description?: string;
}
