/**
 * Tags API route
 * GET /api/tags - Aggregate unique tags, topics, and languages from all entries
 *
 * Requirements:
 * - 13.1: Return all unique tags aggregated from entries
 * - 13.2: Return all unique topics aggregated from entries
 * - 13.3: Return all unique languages aggregated from entries
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectToDatabase } from '@/lib/db/connection';
import { Entry } from '@/lib/db/models/Entry';
import { verifyToken, getAuthCookieName } from '@/lib/auth';

interface TagsResponse {
  tags: string[];
  topics: string[];
  languages: string[];
}

interface ErrorResponse {
  error: string;
}

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
 * Get visibility filter based on authentication state
 * Unauthenticated users can only see published, non-private entries
 */
function getVisibilityFilter(authenticated: boolean): Record<string, unknown> {
  if (authenticated) {
    return {}; // Admin sees everything
  }
  return {
    status: 'published',
    'frontmatter.isPrivate': { $ne: true },
  };
}

/**
 * GET /api/tags
 * Aggregate unique tags, topics, and languages from all visible entries
 */
export async function GET(): Promise<NextResponse<TagsResponse | ErrorResponse>> {
  try {
    await connectToDatabase();

    const authenticated = await isAuthenticated();
    const visibilityFilter = getVisibilityFilter(authenticated);

    // Use MongoDB aggregation to get unique values
    const [tagsResult, topicsResult, languagesResult] = await Promise.all([
      Entry.aggregate([
        { $match: visibilityFilter },
        { $unwind: '$frontmatter.tags' },
        { $group: { _id: '$frontmatter.tags' } },
        { $sort: { _id: 1 } },
      ]),
      Entry.aggregate([
        { $match: visibilityFilter },
        { $unwind: '$frontmatter.topics' },
        { $group: { _id: '$frontmatter.topics' } },
        { $sort: { _id: 1 } },
      ]),
      Entry.aggregate([
        { $match: visibilityFilter },
        { $unwind: '$frontmatter.languages' },
        { $group: { _id: '$frontmatter.languages' } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    // Extract the values from aggregation results
    const tags = tagsResult.map((r: { _id: string }) => r._id).filter(Boolean);
    const topics = topicsResult.map((r: { _id: string }) => r._id).filter(Boolean);
    const languages = languagesResult.map((r: { _id: string }) => r._id).filter(Boolean);

    return NextResponse.json({ tags, topics, languages });
  } catch (error) {
    console.error('Error aggregating tags:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
