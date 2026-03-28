/**
 * Category by ID API routes
 * GET /api/categories/[id] - Get a single category
 * PUT /api/categories/[id] - Update a category
 * DELETE /api/categories/[id] - Delete a category
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/connection';
import { Category } from '@/lib/db/models/Category';
import { Entry } from '@/lib/db/models/Entry';
import type { ICategory, UpdateCategoryInput } from '@/types/category';
import mongoose from 'mongoose';

interface GetCategoryResponse {
  category: ICategory;
}

interface UpdateCategoryResponse {
  category: ICategory;
}

interface DeleteCategoryResponse {
  ok: true;
}

interface ErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
}

type RouteParams = { params: Promise<{ id: string }> };

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
 * Validate MongoDB ObjectId format
 */
function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * GET /api/categories/[id]
 * Get a single category by ID
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<GetCategoryResponse | ErrorResponse>> {
  try {
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: 'Invalid category ID format', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const category = await Category.findById(id).lean();

    if (!category) {
      return NextResponse.json({ error: 'Category not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({ category: transformCategory(category) });
  } catch (error) {
    console.error('Error getting category:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/categories/[id]
 * Update a category
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<UpdateCategoryResponse | ErrorResponse>> {
  try {
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: 'Invalid category ID format', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const body = (await request.json()) as UpdateCategoryInput;
    const { name, slug, parentId, order, description } = body;

    await connectToDatabase();

    // Find existing category
    const existingCategory = await Category.findById(id);
    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Category name cannot be empty', code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }
      if (name.length > 100) {
        return NextResponse.json(
          { error: 'Category name cannot exceed 100 characters', code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }
    }

    // Validate slug format if provided
    if (slug !== undefined) {
      const normalizedSlug = slug.toLowerCase().trim();
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(normalizedSlug)) {
        return NextResponse.json(
          {
            error: 'Slug must contain only lowercase letters, numbers, and hyphens',
            code: 'VALIDATION_ERROR',
          },
          { status: 400 }
        );
      }
    }

    // Determine the effective parentId for uniqueness check
    const effectiveParentId =
      parentId !== undefined
        ? parentId === '' || parentId === null
          ? null
          : parentId
        : (existingCategory.parentId?.toString() ?? null);

    // Validate parent exists if parentId is being changed
    if (parentId !== undefined && effectiveParentId !== null) {
      // Prevent setting self as parent
      if (effectiveParentId === id) {
        return NextResponse.json(
          { error: 'A category cannot be its own parent', code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }

      const parentCategory = await Category.findById(effectiveParentId);
      if (!parentCategory) {
        return NextResponse.json(
          { error: 'Parent category does not exist', code: 'PARENT_NOT_FOUND' },
          { status: 400 }
        );
      }

      // Prevent circular references - check if new parent is a descendant
      let currentParent: typeof parentCategory | null = parentCategory;
      while (currentParent?.parentId) {
        if (currentParent.parentId.toString() === id) {
          return NextResponse.json(
            { error: 'Cannot set a descendant category as parent', code: 'CIRCULAR_REFERENCE' },
            { status: 400 }
          );
        }
        currentParent = await Category.findById(currentParent.parentId);
      }
    }

    // Check for duplicate slug within the same parent (if slug or parentId is changing)
    const effectiveSlug = slug !== undefined ? slug.toLowerCase().trim() : existingCategory.slug;

    if (slug !== undefined || parentId !== undefined) {
      const duplicateCategory = await Category.findOne({
        _id: { $ne: id },
        parentId: effectiveParentId,
        slug: effectiveSlug,
      });

      if (duplicateCategory) {
        return NextResponse.json(
          {
            error: 'A category with this slug already exists under the same parent',
            code: 'DUPLICATE_SLUG',
          },
          { status: 409 }
        );
      }
    }

    // Build update object
    const updateData: Partial<{
      name: string;
      slug: string;
      parentId: mongoose.Types.ObjectId | null;
      order: number;
      description: string;
    }> = {};

    if (name !== undefined) updateData.name = name.trim();
    if (slug !== undefined) updateData.slug = slug.toLowerCase().trim();
    if (parentId !== undefined) {
      updateData.parentId = effectiveParentId
        ? new mongoose.Types.ObjectId(effectiveParentId)
        : null;
    }
    if (order !== undefined) updateData.order = order;
    if (description !== undefined) updateData.description = description.trim();

    // Update the category
    const updatedCategory = await Category.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updatedCategory) {
      return NextResponse.json({ error: 'Category not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({ category: transformCategory(updatedCategory) });
  } catch (error) {
    console.error('Error updating category:', error);

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

/**
 * DELETE /api/categories/[id]
 * Delete a category (protected if entries reference it)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<DeleteCategoryResponse | ErrorResponse>> {
  try {
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: 'Invalid category ID format', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check if category exists
    const category = await Category.findById(id);
    if (!category) {
      return NextResponse.json({ error: 'Category not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    // Check if any entries reference this category
    const entryCount = await Entry.countDocuments({ categoryId: id });
    if (entryCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete category: ${entryCount} entries reference this category`,
          code: 'CATEGORY_IN_USE',
          details: { entryCount },
        },
        { status: 409 }
      );
    }

    // Check if any child categories exist
    const childCount = await Category.countDocuments({ parentId: id });
    if (childCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete category: ${childCount} child categories exist`,
          code: 'HAS_CHILDREN',
          details: { childCount },
        },
        { status: 409 }
      );
    }

    // Delete the category
    await Category.findByIdAndDelete(id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
