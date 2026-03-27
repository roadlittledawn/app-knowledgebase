/**
 * Category Mongoose model
 * Represents hierarchical taxonomy nodes for organizing entries
 */

import mongoose, { Schema, Model, Types } from 'mongoose';
import type { ICategory, CategoryTreeNode } from '@/types/category';

/**
 * Category document interface for Mongoose
 */
export interface CategoryDocument {
  _id: Types.ObjectId;
  slug: string;
  name: string;
  parentId: Types.ObjectId | null;
  order: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Static methods interface for Category model
 */
export interface CategoryModel extends Model<CategoryDocument> {
  getTree(): Promise<CategoryTreeNode[]>;
  getPath(categoryId: string): Promise<ICategory[]>;
}

/**
 * Category schema definition
 */
const CategorySchema = new Schema<CategoryDocument, CategoryModel>(
  {
    slug: {
      type: String,
      required: [true, 'Category slug is required'],
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: [100, 'Category name cannot exceed 100 characters'],
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true,
    },
    order: {
      type: Number,
      default: 0,
      min: [0, 'Order must be non-negative'],
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Compound unique index: slug must be unique within the same parent
 * This allows the same slug to exist under different parent categories
 */
CategorySchema.index({ parentId: 1, slug: 1 }, { unique: true });

/**
 * Build tree structure from flat category array
 */
function buildTree(
  categories: CategoryDocument[],
  entryCounts: Map<string, number> = new Map()
): CategoryTreeNode[] {
  const map = new Map<string, CategoryTreeNode>();
  const roots: CategoryTreeNode[] = [];

  // Create nodes
  for (const cat of categories) {
    const id = cat._id.toString();
    map.set(id, {
      _id: id,
      name: cat.name,
      slug: cat.slug,
      order: cat.order,
      entryCount: entryCounts.get(id) || 0,
      children: [],
    });
  }

  // Build hierarchy
  for (const cat of categories) {
    const node = map.get(cat._id.toString())!;
    if (cat.parentId) {
      const parent = map.get(cat.parentId.toString());
      if (parent) {
        parent.children.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  // Sort children by order
  const sortChildren = (nodes: CategoryTreeNode[]) => {
    nodes.sort((a, b) => a.order - b.order);
    nodes.forEach((n) => sortChildren(n.children));
  };
  sortChildren(roots);

  return roots;
}

/**
 * Static method to get full category tree
 */
CategorySchema.statics.getTree = async function (): Promise<CategoryTreeNode[]> {
  const categories = await this.find().sort({ order: 1 }).lean();
  // Entry counts would be populated by a separate aggregation
  // For now, return tree without counts (counts added at query time)
  return buildTree(categories as CategoryDocument[]);
};

/**
 * Static method to get category path (for breadcrumbs)
 * Returns array of categories from root to the specified category
 */
CategorySchema.statics.getPath = async function (categoryId: string): Promise<ICategory[]> {
  const path: ICategory[] = [];
  let current = await this.findById(categoryId).lean();

  while (current) {
    path.unshift({
      _id: current._id.toString(),
      slug: current.slug,
      name: current.name,
      parentId: current.parentId?.toString() ?? null,
      order: current.order,
      description: current.description,
      createdAt: current.createdAt,
      updatedAt: current.updatedAt,
    });
    current = current.parentId ? await this.findById(current.parentId).lean() : null;
  }

  return path;
};

/**
 * Pre-save middleware to validate parent exists if parentId is provided
 */
CategorySchema.pre('save', async function () {
  if (this.parentId && this.isModified('parentId')) {
    const CategoryModel = mongoose.model<CategoryDocument>('Category');
    const parent = await CategoryModel.findById(this.parentId);
    if (!parent) {
      throw new Error('Parent category does not exist');
    }
  }
});

/**
 * Export Category model
 * Uses existing model if already compiled (for hot reloading in development)
 */
export const Category: CategoryModel =
  (mongoose.models.Category as CategoryModel) ||
  mongoose.model<CategoryDocument, CategoryModel>('Category', CategorySchema);

export default Category;
