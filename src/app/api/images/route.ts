/**
 * Images API routes
 * GET /api/images - List images with pagination and search
 * POST /api/images - Upload a new image (authenticated only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectToDatabase } from '@/lib/db/connection';
import { Image } from '@/lib/db/models/Image';
import { verifyToken, getAuthCookieName } from '@/lib/auth';
import { uploadToS3 } from '@/lib/s3';
import type { IImage } from '@/types/image';
import type { ImageDocument } from '@/lib/db/models/Image';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAuthCookieName())?.value;
  if (!token) return false;
  const payload = await verifyToken(token);
  return payload !== null;
}

function transformImage(doc: ImageDocument): IImage {
  return {
    _id: doc._id.toString(),
    filename: doc.filename,
    s3Key: doc.s3Key,
    url: doc.url,
    altText: doc.altText,
    sizeBytes: doc.sizeBytes,
    mimeType: doc.mimeType,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * GET /api/images
 * List images with pagination and optional search
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
    const [images, total] = await Promise.all([
      Image.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Image.countDocuments(filter),
    ]);

    return NextResponse.json({
      images: images.map(transformImage),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error listing images:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/images
 * Upload a new image
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

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size must not exceed 10MB' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { s3Key, url } = await uploadToS3(buffer, file.name, file.type);

    // Default alt text: filename stem (without extension)
    const stem = file.name.replace(/\.[^.]+$/, '');

    await connectToDatabase();

    const image = new Image({
      filename: file.name,
      s3Key,
      url,
      altText: stem,
      sizeBytes: file.size,
      mimeType: file.type,
    });

    await image.save();

    return NextResponse.json({ image: transformImage(image.toObject()) }, { status: 201 });
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
