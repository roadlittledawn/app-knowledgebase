/**
 * Category reorder API route
 * PUT /api/categories/reorder - Reorder a sibling group of categories
 *
 * Accepts the full ordered list of sibling IDs for a single parent and assigns
 * each a 1-based `order` value. Renumbering the whole group (rather than nudging
 * a single category's order up/down) avoids duplicate/negative order values and
 * the resulting validation 500s. An order of 0 is reserved for "unordered"
 * categories, which sort alphabetically (A–Z).
 */

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db/connection';
import { Category } from '@/lib/db/models/Category';

interface ReorderRequest {
  parentId: string | null;
  orderedIds: string[];
}

interface ReorderResponse {
  ok: true;
}

interface ErrorResponse {
  error: string;
  code?: string;
}

export async function PUT(
  request: NextRequest
): Promise<NextResponse<ReorderResponse | ErrorResponse>> {
  try {
    const body = (await request.json()) as ReorderRequest;
    const { parentId, orderedIds } = body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json(
        { error: 'orderedIds must be a non-empty array', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (orderedIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
      return NextResponse.json(
        { error: 'orderedIds contains an invalid category ID', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const normalizedParentId =
      parentId === '' || parentId === null || parentId === undefined ? null : parentId;

    if (normalizedParentId !== null && !mongoose.Types.ObjectId.isValid(normalizedParentId)) {
      return NextResponse.json(
        { error: 'Invalid parent category ID', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Verify every provided ID actually belongs to the given parent. This guards
    // against renumbering categories from another branch of the tree.
    const siblings = await Category.find({ parentId: normalizedParentId })
      .select('_id')
      .lean();
    const siblingIds = new Set(siblings.map((s) => s._id.toString()));

    if (orderedIds.some((id) => !siblingIds.has(id))) {
      return NextResponse.json(
        { error: 'orderedIds must all belong to the same parent', code: 'PARENT_MISMATCH' },
        { status: 400 }
      );
    }

    // Assign 1-based order values in the provided sequence.
    await Category.bulkWrite(
      orderedIds.map((id, index) => ({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(id) },
          update: { $set: { order: index + 1 } },
        },
      }))
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error reordering categories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
