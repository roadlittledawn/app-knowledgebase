/**
 * Entry Pinecone index API routes
 * POST   /api/entries/[id]/pinecone - Upsert the entry's search vector
 * DELETE /api/entries/[id]/pinecone - Remove the entry's search vector
 *
 * These exist alongside the automatic sync-on-save behavior in
 * src/app/api/entries/[id]/route.ts (PUT) — that stays authoritative on every
 * save of a published entry, these give explicit manual control.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectToDatabase } from '@/lib/db/connection';
import { Entry } from '@/lib/db/models/Entry';
import { verifyToken, getAuthCookieName } from '@/lib/auth';
import { upsertEntryVector, deleteEntryVector, isPineconeConfigured } from '@/lib/pinecone';
import type { IEntry } from '@/types/entry';
import type { EntryDocument } from '@/lib/db/models/Entry';
import mongoose from 'mongoose';

interface PineconeStatusResponse {
  pineconeId: string;
}

interface ErrorResponse {
  error: string;
  code?: string;
}

type RouteParams = { params: Promise<{ id: string }> };

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAuthCookieName())?.value;
  if (!token) return false;
  const payload = await verifyToken(token);
  return payload !== null;
}

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

function transformEntry(doc: EntryDocument): IEntry {
  return {
    _id: doc._id.toString(),
    slug: doc.slug,
    categoryId: doc.categoryId.toString(),
    status: doc.status,
    frontmatter: {
      title: doc.frontmatter.title,
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
    hasMarkdown: doc.hasMarkdown,
    sourceFile: doc.sourceFile,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * POST /api/entries/[id]/pinecone
 * Index (or re-index) a published entry's search vector.
 */
export async function POST(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<PineconeStatusResponse | ErrorResponse>> {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: 'Invalid entry ID format', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    if (!isPineconeConfigured()) {
      return NextResponse.json(
        { error: 'Pinecone is not configured', code: 'PINECONE_NOT_CONFIGURED' },
        { status: 503 }
      );
    }

    await connectToDatabase();
    const entry = await Entry.findById(id);
    if (!entry) {
      return NextResponse.json({ error: 'Entry not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    if (entry.status !== 'published') {
      return NextResponse.json(
        { error: 'Entry must be published to be indexed', code: 'NOT_ELIGIBLE' },
        { status: 400 }
      );
    }

    const pineconeId = await upsertEntryVector(transformEntry(entry.toObject()));
    entry.pineconeId = pineconeId;
    await entry.save();

    return NextResponse.json({ pineconeId });
  } catch (error) {
    console.error('Error indexing entry in Pinecone:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/entries/[id]/pinecone
 * Remove the entry's search vector, regardless of the entry's current status.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<PineconeStatusResponse | ErrorResponse>> {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: 'Invalid entry ID format', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    if (!isPineconeConfigured()) {
      return NextResponse.json(
        { error: 'Pinecone is not configured', code: 'PINECONE_NOT_CONFIGURED' },
        { status: 503 }
      );
    }

    await connectToDatabase();
    const entry = await Entry.findById(id);
    if (!entry) {
      return NextResponse.json({ error: 'Entry not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    await deleteEntryVector(entry._id.toString());
    entry.pineconeId = '';
    await entry.save();

    return NextResponse.json({ pineconeId: '' });
  } catch (error) {
    console.error('Error removing entry from Pinecone:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
