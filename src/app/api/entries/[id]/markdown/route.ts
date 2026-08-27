/**
 * Entry Markdown snapshot API routes
 * POST   /api/entries/[id]/markdown - Generate/upload the S3 Markdown snapshot
 * DELETE /api/entries/[id]/markdown - Remove the S3 Markdown snapshot
 *
 * These exist alongside the automatic sync-on-save behavior in
 * src/app/api/entries/[id]/route.ts (PUT) — that stays authoritative on every
 * save of a published entry, these give explicit manual control (e.g. force
 * a fresh regenerate, or take a snapshot down immediately without a full save).
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectToDatabase } from '@/lib/db/connection';
import { Entry } from '@/lib/db/models/Entry';
import { verifyToken, getAuthCookieName } from '@/lib/auth';
import {
  composeEntryMarkdown,
  uploadMarkdownToS3,
  deleteMarkdownFromS3,
  isS3Configured,
} from '@/lib/s3';
import mongoose from 'mongoose';

interface MarkdownStatusResponse {
  hasMarkdown: boolean;
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

/**
 * POST /api/entries/[id]/markdown
 * Generate and upload the Markdown snapshot for a published, non-private entry.
 */
export async function POST(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<MarkdownStatusResponse | ErrorResponse>> {
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

    if (!isS3Configured()) {
      return NextResponse.json(
        { error: 'S3 is not configured', code: 'S3_NOT_CONFIGURED' },
        { status: 503 }
      );
    }

    await connectToDatabase();
    const entry = await Entry.findById(id);
    if (!entry) {
      return NextResponse.json({ error: 'Entry not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    if (entry.status !== 'published' || entry.frontmatter.isPrivate) {
      return NextResponse.json(
        {
          error: 'Entry must be published and not private to generate a Markdown snapshot',
          code: 'NOT_ELIGIBLE',
        },
        { status: 400 }
      );
    }

    const markdown = composeEntryMarkdown(entry.frontmatter.title, entry.body);
    await uploadMarkdownToS3(entry.slug, markdown);
    entry.hasMarkdown = true;
    await entry.save();

    return NextResponse.json({ hasMarkdown: true });
  } catch (error) {
    console.error('Error generating entry markdown:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/entries/[id]/markdown
 * Remove the Markdown snapshot, regardless of the entry's current status.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<MarkdownStatusResponse | ErrorResponse>> {
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

    if (!isS3Configured()) {
      return NextResponse.json(
        { error: 'S3 is not configured', code: 'S3_NOT_CONFIGURED' },
        { status: 503 }
      );
    }

    await connectToDatabase();
    const entry = await Entry.findById(id);
    if (!entry) {
      return NextResponse.json({ error: 'Entry not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    await deleteMarkdownFromS3(entry.slug);
    entry.hasMarkdown = false;
    await entry.save();

    return NextResponse.json({ hasMarkdown: false });
  } catch (error) {
    console.error('Error deleting entry markdown:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
