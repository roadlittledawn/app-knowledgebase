/**
 * Single file API routes
 * GET /api/files/[id] - Get file metadata
 * PATCH /api/files/[id] - Update description (authenticated)
 * PUT /api/files/[id] - Replace file content, keeping same filename (authenticated)
 * DELETE /api/files/[id] - Delete file from S3 + MongoDB (authenticated)
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectToDatabase } from '@/lib/db/connection';
import { FileAttachment } from '@/lib/db/models/FileAttachment';
import { verifyToken, getAuthCookieName } from '@/lib/auth';
import { deleteFromS3, uploadFileToS3 } from '@/lib/s3';
import type { IFileAttachment } from '@/types/file-attachment';
import type { FileAttachmentDocument } from '@/lib/db/models/FileAttachment';

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAuthCookieName())?.value;
  if (!token) return false;
  const payload = await verifyToken(token);
  return payload !== null;
}

function transformFile(doc: FileAttachmentDocument): IFileAttachment {
  return {
    _id: doc._id.toString(),
    filename: doc.filename,
    s3Key: doc.s3Key,
    url: doc.url,
    description: doc.description,
    sizeBytes: doc.sizeBytes,
    mimeType: doc.mimeType,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * GET /api/files/[id]
 * Get a single file's metadata
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    await connectToDatabase();

    const file = await FileAttachment.findById(id).lean();
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    return NextResponse.json({ file: transformFile(file) });
  } catch (error) {
    console.error('Error fetching file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/files/[id]
 * Update description (authenticated)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { description } = body as { description?: string };

    if (typeof description !== 'string') {
      return NextResponse.json({ error: 'description must be a string' }, { status: 400 });
    }

    await connectToDatabase();

    const file = await FileAttachment.findByIdAndUpdate(
      id,
      { description: description.trim() },
      { new: true }
    ).lean();

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    return NextResponse.json({ file: transformFile(file) });
  } catch (error) {
    console.error('Error updating file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/files/[id]
 * Replace file content (must use same filename). Deletes old S3 object, uploads new one.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    await connectToDatabase();

    const existing = await FileAttachment.findById(id);
    if (!existing) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.name !== existing.filename) {
      return NextResponse.json(
        { error: `Filename must match existing: "${existing.filename}"` },
        { status: 400 }
      );
    }

    const MAX_FILE_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size must not exceed 50MB' }, { status: 400 });
    }

    // Delete old S3 object
    await deleteFromS3(existing.s3Key);

    // Upload new version
    const buffer = Buffer.from(await file.arrayBuffer());
    const { s3Key, url } = await uploadFileToS3(buffer, file.name, file.type);

    existing.s3Key = s3Key;
    existing.url = url;
    existing.sizeBytes = file.size;
    existing.mimeType = file.type;
    await existing.save();

    return NextResponse.json({ file: transformFile(existing.toObject()) });
  } catch (error) {
    console.error('Error replacing file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/files/[id]
 * Delete from S3 then MongoDB (authenticated)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    await connectToDatabase();

    const file = await FileAttachment.findById(id).lean();
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    await deleteFromS3(file.s3Key);
    await FileAttachment.findByIdAndDelete(id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
