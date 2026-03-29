/**
 * Entry by ID API routes
 * GET /api/entries/[id] - Get a single entry
 * PUT /api/entries/[id] - Update an entry
 * DELETE /api/entries/[id] - Delete an entry
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectToDatabase } from '@/lib/db/connection';
import { Entry } from '@/lib/db/models/Entry';
import { Category } from '@/lib/db/models/Category';
import { verifyToken, getAuthCookieName } from '@/lib/auth';
import type { IEntry, EntryFrontmatter } from '@/types/entry';
import type { EntryDocument } from '@/lib/db/models/Entry';
import { upsertEntryVector, deleteEntryVector, isPineconeConfigured } from '@/lib/pinecone';
import mongoose from 'mongoose';

interface GetEntryResponse {
  entry: IEntry;
}

interface UpdateEntryResponse {
  entry: IEntry;
}

interface DeleteEntryResponse {
  ok: true;
}

interface ErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
}

type RouteParams = { params: Promise<{ id: string }> };

/**
 * Check if user is authenticated
 */
async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAuthCookieName())?.value;
  if (!token) return false;
  const payload = await verifyToken(token);
  return payload !== null;
}

/**
 * Transform an entry document to IEntry interface
 */
function transformEntry(doc: EntryDocument): IEntry {
  return {
    _id: doc._id.toString(),
    slug: doc.slug,
    categoryId: doc.categoryId.toString(),
    status: doc.status,
    frontmatter: {
      title: doc.frontmatter.title,
      topics: doc.frontmatter.topics,
      tags: doc.frontmatter.tags,
      languages: doc.frontmatter.languages,
      skillLevel: doc.frontmatter.skillLevel as 1 | 2 | 3 | 4 | 5,
      needsHelp: doc.frontmatter.needsHelp,
      isPrivate: doc.frontmatter.isPrivate,
      resources: doc.frontmatter.resources,
      relatedEntries: doc.frontmatter.relatedEntries.map((id) => id.toString()),
    },
    body: doc.body,
    pineconeId: doc.pineconeId,
    sourceFile: doc.sourceFile,
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
 * GET /api/entries/[id]
 * Get a single entry by ID
 * Visibility is filtered based on authentication state
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<GetEntryResponse | ErrorResponse>> {
  try {
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: 'Invalid entry ID format', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const entry = await Entry.findById(id).lean();

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    // Check visibility for unauthenticated users
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      // Unauthenticated users can only see published, non-private entries
      if (entry.status !== 'published' || entry.frontmatter.isPrivate) {
        return NextResponse.json({ error: 'Entry not found', code: 'NOT_FOUND' }, { status: 404 });
      }
    }

    return NextResponse.json({ entry: transformEntry(entry) });
  } catch (error) {
    console.error('Error getting entry:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/entries/[id]
 * Update an entry (authenticated only - enforced by middleware)
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<UpdateEntryResponse | ErrorResponse>> {
  try {
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: 'Invalid entry ID format', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      slug: providedSlug,
      categoryId,
      status,
      frontmatter,
      body: entryBody,
    } = body as {
      slug?: string;
      categoryId?: string;
      status?: 'draft' | 'published';
      frontmatter?: Partial<EntryFrontmatter>;
      body?: string;
    };

    await connectToDatabase();

    // Find existing entry
    const existingEntry = await Entry.findById(id);
    if (!existingEntry) {
      return NextResponse.json({ error: 'Entry not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    const previousStatus = existingEntry.status;

    // Validate category if provided
    if (categoryId !== undefined) {
      const category = await Category.findById(categoryId);
      if (!category) {
        return NextResponse.json(
          { error: 'Category does not exist', code: 'CATEGORY_NOT_FOUND' },
          { status: 400 }
        );
      }
    }

    // Validate status if provided
    if (status !== undefined && !['draft', 'published'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be either draft or published', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Validate frontmatter fields if provided
    if (frontmatter) {
      if (frontmatter.title !== undefined) {
        if (typeof frontmatter.title !== 'string' || frontmatter.title.trim().length === 0) {
          return NextResponse.json(
            { error: 'Title cannot be empty', code: 'VALIDATION_ERROR' },
            { status: 400 }
          );
        }
        if (frontmatter.title.length > 200) {
          return NextResponse.json(
            { error: 'Title cannot exceed 200 characters', code: 'VALIDATION_ERROR' },
            { status: 400 }
          );
        }
      }

      if (
        frontmatter.skillLevel !== undefined &&
        (frontmatter.skillLevel < 1 || frontmatter.skillLevel > 5)
      ) {
        return NextResponse.json(
          { error: 'Skill level must be between 1 and 5', code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }

      if (frontmatter.resources !== undefined && Array.isArray(frontmatter.resources)) {
        for (const resource of frontmatter.resources) {
          if (!resource.title || !resource.linkUrl) {
            return NextResponse.json(
              { error: 'Each resource must have a title and linkUrl', code: 'VALIDATION_ERROR' },
              { status: 400 }
            );
          }
        }
      }
    }

    // Handle slug update
    if (providedSlug !== undefined) {
      const normalizedSlug = providedSlug.toLowerCase().trim();
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(normalizedSlug)) {
        return NextResponse.json(
          {
            error: 'Slug must contain only lowercase letters, numbers, and hyphens',
            code: 'VALIDATION_ERROR',
          },
          { status: 400 }
        );
      }
      // Check uniqueness (excluding current entry)
      const existingWithSlug = await Entry.findOne({
        slug: normalizedSlug,
        _id: { $ne: id },
      });
      if (existingWithSlug) {
        return NextResponse.json(
          { error: 'An entry with this slug already exists', code: 'DUPLICATE_SLUG' },
          { status: 409 }
        );
      }
      existingEntry.slug = normalizedSlug;
    }

    // Update fields
    if (categoryId !== undefined) {
      existingEntry.categoryId = new mongoose.Types.ObjectId(categoryId);
    }
    if (status !== undefined) {
      existingEntry.status = status;
    }
    if (entryBody !== undefined) {
      existingEntry.body = entryBody;
    }

    // Update frontmatter fields
    if (frontmatter) {
      if (frontmatter.title !== undefined) {
        existingEntry.frontmatter.title = frontmatter.title.trim();
      }
      if (frontmatter.topics !== undefined) {
        existingEntry.frontmatter.topics = frontmatter.topics;
      }
      if (frontmatter.tags !== undefined) {
        existingEntry.frontmatter.tags = frontmatter.tags;
      }
      if (frontmatter.languages !== undefined) {
        existingEntry.frontmatter.languages = frontmatter.languages;
      }
      if (frontmatter.skillLevel !== undefined) {
        existingEntry.frontmatter.skillLevel = frontmatter.skillLevel;
      }
      if (frontmatter.needsHelp !== undefined) {
        existingEntry.frontmatter.needsHelp = frontmatter.needsHelp;
      }
      if (frontmatter.isPrivate !== undefined) {
        existingEntry.frontmatter.isPrivate = frontmatter.isPrivate;
      }
      if (frontmatter.resources !== undefined) {
        existingEntry.frontmatter.resources = frontmatter.resources;
      }
      if (frontmatter.relatedEntries !== undefined) {
        existingEntry.frontmatter.relatedEntries = frontmatter.relatedEntries.map(
          (id) => new mongoose.Types.ObjectId(id)
        );
      }
    }

    await existingEntry.save();

    // Handle Pinecone sync based on status changes
    if (isPineconeConfigured()) {
      try {
        const transformedEntry = transformEntry(existingEntry.toObject());

        if (existingEntry.status === 'published') {
          // Entry is published, upsert the vector
          const pineconeId = await upsertEntryVector(transformedEntry);
          existingEntry.pineconeId = pineconeId;
          await existingEntry.save();
        } else if (previousStatus === 'published' && existingEntry.status === 'draft') {
          // Entry was unpublished, delete the vector
          await deleteEntryVector(existingEntry._id.toString());
          existingEntry.pineconeId = '';
          await existingEntry.save();
        }
      } catch (pineconeError) {
        console.error('Failed to sync entry to Pinecone:', pineconeError);
      }
    }

    return NextResponse.json({ entry: transformEntry(existingEntry.toObject()) });
  } catch (error) {
    console.error('Error updating entry:', error);

    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json(
        { error: 'An entry with this slug already exists', code: 'DUPLICATE_SLUG' },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/entries/[id]
 * Delete an entry (authenticated only - enforced by middleware)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<DeleteEntryResponse | ErrorResponse>> {
  try {
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: 'Invalid entry ID format', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const entry = await Entry.findById(id);
    if (!entry) {
      return NextResponse.json({ error: 'Entry not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    // Delete from Pinecone if it was published
    if (isPineconeConfigured() && entry.pineconeId) {
      try {
        await deleteEntryVector(entry._id.toString());
      } catch (pineconeError) {
        console.error('Failed to delete entry from Pinecone:', pineconeError);
      }
    }

    // Delete the entry
    await Entry.findByIdAndDelete(id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting entry:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
