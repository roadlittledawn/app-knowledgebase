/**
 * Single image API routes
 * GET /api/images/[id] - Get image metadata (public)
 * PATCH /api/images/[id] - Update altText (authenticated)
 * DELETE /api/images/[id] - Delete image from S3 + MongoDB (authenticated)
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectToDatabase } from '@/lib/db/connection';
import { Image } from '@/lib/db/models/Image';
import { verifyToken, getAuthCookieName } from '@/lib/auth';
import { deleteFromS3 } from '@/lib/s3';
import type { IImage } from '@/types/image';
import type { ImageDocument } from '@/lib/db/models/Image';

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
 * GET /api/images/[id]
 * Get a single image's metadata (public)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    await connectToDatabase();

    const image = await Image.findById(id).lean();
    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    return NextResponse.json({ image: transformImage(image) });
  } catch (error) {
    console.error('Error fetching image:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/images/[id]
 * Update altText (authenticated)
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
    const { altText } = body as { altText?: string };

    if (typeof altText !== 'string') {
      return NextResponse.json({ error: 'altText must be a string' }, { status: 400 });
    }

    await connectToDatabase();

    const image = await Image.findByIdAndUpdate(
      id,
      { altText: altText.trim() },
      { new: true }
    ).lean();

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    return NextResponse.json({ image: transformImage(image) });
  } catch (error) {
    console.error('Error updating image:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/images/[id]
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

    const image = await Image.findById(id).lean();
    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Delete from S3 (errors are caught + logged in deleteFromS3)
    await deleteFromS3(image.s3Key);

    // Delete from MongoDB
    await Image.findByIdAndDelete(id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting image:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
