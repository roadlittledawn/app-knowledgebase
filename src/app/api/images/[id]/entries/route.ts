/**
 * GET /api/images/[id]/entries
 * On-demand scan: find entries whose body contains this image's URL
 * (authenticated)
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectToDatabase } from '@/lib/db/connection';
import { Image } from '@/lib/db/models/Image';
import { Entry } from '@/lib/db/models/Entry';
import { verifyToken, getAuthCookieName } from '@/lib/auth';

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAuthCookieName())?.value;
  if (!token) return false;
  const payload = await verifyToken(token);
  return payload !== null;
}

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

    const image = await Image.findById(id).lean();
    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Escape regex special chars in the URL
    const escapedUrl = image.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const entries = await Entry.find({
      body: { $regex: escapedUrl, $options: 'i' },
    })
      .select('slug frontmatter.title')
      .lean();

    return NextResponse.json({
      entries: entries.map((e) => ({
        _id: e._id.toString(),
        slug: e.slug,
        title: e.frontmatter.title,
      })),
    });
  } catch (error) {
    console.error('Error scanning entries for image:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
