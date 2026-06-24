/**
 * Files API routes
 * GET /api/files - List files with pagination and search
 * POST /api/files - Upload a new file (authenticated only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectToDatabase } from '@/lib/db/connection';
import { FileAttachment } from '@/lib/db/models/FileAttachment';
import { verifyToken, getAuthCookieName } from '@/lib/auth';
import { uploadFileToS3 } from '@/lib/s3';
import type { IFileAttachment } from '@/types/file-attachment';
import type { FileAttachmentDocument } from '@/lib/db/models/FileAttachment';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

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
 * GET /api/files
 * List files with pagination and optional search
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse> {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const search = searchParams.get('search');

    const filter: Record<string, unknown> = {};
    if (search && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.filename = { $regex: escaped, $options: 'i' };
    }

    const skip = (page - 1) * limit;
    const [files, total] = await Promise.all([
      FileAttachment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      FileAttachment.countDocuments(filter),
    ]);

    return NextResponse.json({
      files: files.map(transformFile),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error listing files:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/files
 * Upload a new file
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size must not exceed 50MB' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { s3Key, url } = await uploadFileToS3(buffer, file.name, file.type);

    await connectToDatabase();

    const fileAttachment = new FileAttachment({
      filename: file.name,
      s3Key,
      url,
      description: '',
      sizeBytes: file.size,
      mimeType: file.type,
    });

    await fileAttachment.save();

    return NextResponse.json({ file: transformFile(fileAttachment.toObject()) }, { status: 201 });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
