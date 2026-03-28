/**
 * Categories API routes
 * GET /api/categories - List all categories
 * POST /api/categories - Create a new category
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/connection';
import { Category } from '@/lib/db/models/Category';
import type { ICategory, CreateCategoryInput } from '@/types/category';

interface CategoriesListResponse {
  categories: ICategory[];
}

interface CreateCategoryResponse {
  category: ICategory;
}

interface ErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
}

/**
 * Generate a URL-safe slug from a name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Transform a category document to ICategory interface
 */
function transformCategory(doc: {
  _id: { toString(): string };
  slug: string;
  name: string;
  parentId: { toString(): string } | null;
  order: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}): ICategory {
  return {
    _id: doc._id.toString(),
    slug: doc.slug,
    name: doc.name,
    parentId: doc.parentId?.toString() ?? null,
    order: doc.order,
    description: doc.description,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * GET /api/categories
 * List all categories (flat list)
 */
export async function GET(): Promise<NextResponse<CategoriesListResponse | ErrorResponse>> {
  try {
    await connectToDatabase();

    const categories = await Category.find().sort({ order: 1 }).lean();

    return NextResponse.json({
      categories: categories.map(transformCategory),
    });
  } catch (error) {
    console.error('Error listing categories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/categories
 * Create a new category
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<CreateCategoryResponse | ErrorResponse>> {
  try {
    const body = (await request.json()) as CreateCategoryInput;
    const { name, slug: providedSlug, parentId, order, description } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Category name is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: 'Category name cannot exceed 100 characters', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Generate or validate slug
    const slug = providedSlug ? providedSlug.toLowerCase().trim() : generateSlug(name);

    if (!slug) {
      return NextResponse.json(
        { error: 'Could not generate a valid slug from the name', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Validate slug format
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
      return NextResponse.json(
        {
          error: 'Slug must contain only lowercase letters, numbers, and hyphens',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Validate parent exists if parentId is provided
    const normalizedParentId = parentId === '' ? null : (parentId ?? null);

    if (normalizedParentId) {
      const parentCategory = await Category.findById(normalizedParentId);
      if (!parentCategory) {
        return NextResponse.json(
          { error: 'Parent category does not exist', code: 'PARENT_NOT_FOUND' },
          { status: 400 }
        );
      }
    }

    // Check for duplicate slug within the same parent
    const existingCategory = await Category.findOne({
      parentId: normalizedParentId,
      slug,
    });

    if (existingCategory) {
      return NextResponse.json(
        {
          error: 'A category with this slug already exists under the same parent',
          code: 'DUPLICATE_SLUG',
        },
        { status: 409 }
      );
    }

    // Determine order if not provided
    let categoryOrder = order;
    if (categoryOrder === undefined) {
      const maxOrderCategory = await Category.findOne({ parentId: normalizedParentId })
        .sort({ order: -1 })
        .lean();
      categoryOrder = maxOrderCategory ? maxOrderCategory.order + 1 : 0;
    }

    // Create the category
    const category = new Category({
      name: name.trim(),
      slug,
      parentId: normalizedParentId,
      order: categoryOrder,
      description: description?.trim(),
    });

    await category.save();

    return NextResponse.json({ category: transformCategory(category.toObject()) }, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);

    // Handle MongoDB duplicate key error
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json(
        {
          error: 'A category with this slug already exists under the same parent',
          code: 'DUPLICATE_SLUG',
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
