import { NextRequest, NextResponse } from 'next/server';
import { serializeMDX } from '@/lib/mdx/serialize';

/**
 * POST /api/preview
 * Serializes MDX content for live preview rendering
 *
 * Requirements:
 * - 6.4: Return serialized MDX compatible with next-mdx-remote rendering
 */

interface PreviewRequest {
  mdx: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PreviewRequest;

    if (typeof body.mdx !== 'string') {
      return NextResponse.json(
        { error: 'mdx field is required and must be a string' },
        { status: 400 }
      );
    }

    const serialized = await serializeMDX(body.mdx);

    return NextResponse.json({ serialized });
  } catch (error) {
    console.error('Preview serialization error:', error);

    // Return a user-friendly error for MDX parsing issues
    const message = error instanceof Error ? error.message : 'Failed to serialize MDX';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
