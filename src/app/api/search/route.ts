/**
 * Search API Route
 * Provides hybrid search combining Atlas full-text and Pinecone semantic search
 *
 * Requirements:
 * - 5.1: Query both Atlas_Search_Index and Pinecone_Index
 * - 5.6: Filter results to published, non-private for unauthenticated users
 * - 5.7: Include drafts and private entries for authenticated users
 * - 5.8: Support filtering by tags, topics, and languages
 * - 5.9: Return result excerpts highlighting matched content
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, getAuthCookieName } from '@/lib/auth';
import { searchAtlas, type AtlasSearchResult } from '@/lib/search/atlas';
import { searchPinecone, type PineconeSearchResult } from '@/lib/search/pinecone';
import { mergeSearchResults, type MergedSearchResult } from '@/lib/search/merge';

/**
 * Search mode options
 */
type SearchMode = 'hybrid' | 'atlas' | 'pinecone';

/**
 * Search response format
 */
interface SearchResponse {
  results: Array<{
    entry: MergedSearchResult['entry'];
    score: number;
    source: MergedSearchResult['source'];
    excerpt?: string;
  }>;
  total: number;
  mode: SearchMode;
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
 * Parse array parameter from query string
 */
function parseArrayParam(value: string | null): string[] | undefined {
  if (!value) return undefined;
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * GET /api/search
 *
 * Query parameters:
 * - q: Search query (required)
 * - mode: Search mode - 'hybrid' (default), 'atlas', or 'pinecone'
 * - tags: Comma-separated list of tags to filter by
 * - topics: Comma-separated list of topics to filter by
 * - languages: Comma-separated list of languages to filter by
 * - limit: Maximum number of results (default: 20, max: 50)
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<SearchResponse | { error: string }>> {
  const searchParams = request.nextUrl.searchParams;

  // Get query parameter
  const query = searchParams.get('q');
  if (!query || query.trim().length === 0) {
    return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
  }

  // Parse other parameters
  const mode = (searchParams.get('mode') || 'hybrid') as SearchMode;
  if (!['hybrid', 'atlas', 'pinecone'].includes(mode)) {
    return NextResponse.json({ error: 'Invalid search mode' }, { status: 400 });
  }

  const tags = parseArrayParam(searchParams.get('tags'));
  const topics = parseArrayParam(searchParams.get('topics'));
  const languages = parseArrayParam(searchParams.get('languages'));
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);

  // Check authentication for visibility filtering
  const authenticated = await isAuthenticated();

  // Build visibility filters
  const visibilityFilters = authenticated
    ? {} // Authenticated users see everything
    : { status: 'published' as const, isPrivate: false };

  try {
    let results: MergedSearchResult[] = [];

    if (mode === 'hybrid') {
      // Perform both searches in parallel
      const [atlasResults, pineconeResults] = await Promise.all([
        searchAtlas({
          query,
          tags,
          topics,
          languages,
          ...visibilityFilters,
          limit,
        }),
        searchPinecone({
          query,
          tags,
          topics,
          languages,
          ...visibilityFilters,
          limit,
        }),
      ]);

      // Merge results
      results = mergeSearchResults(atlasResults, pineconeResults);
    } else if (mode === 'atlas') {
      // Atlas-only search
      const atlasResults = await searchAtlas({
        query,
        tags,
        topics,
        languages,
        ...visibilityFilters,
        limit,
      });

      results = atlasResults.map((r) => ({
        entry: r.entry,
        score: r.score,
        source: 'atlas' as const,
        excerpt: r.excerpt,
      }));
    } else {
      // Pinecone-only search
      const pineconeResults = await searchPinecone({
        query,
        tags,
        topics,
        languages,
        ...visibilityFilters,
        limit,
      });

      // Need to fetch full entry data from MongoDB for Pinecone results
      const { connectToDatabase } = await import('@/lib/db/connection');
      const Entry = (await import('@/lib/db/models/Entry')).default;

      await connectToDatabase();

      const entryIds = pineconeResults.map((r) => r.entryId);
      const entries = await Entry.find({ _id: { $in: entryIds } })
        .select('-body')
        .lean();

      const entryMap = new Map(entries.map((e) => [e._id.toString(), e]));

      results = pineconeResults
        .map((r) => {
          const entry = entryMap.get(r.entryId);
          if (!entry) return null;

          return {
            entry: {
              _id: entry._id.toString(),
              slug: entry.slug,
              categoryId: entry.categoryId.toString(),
              status: entry.status,
              frontmatter: entry.frontmatter,
              pineconeId: entry.pineconeId,
              sourceFile: entry.sourceFile,
              createdAt: entry.createdAt,
              updatedAt: entry.updatedAt,
            },
            score: r.score,
            source: 'pinecone' as const,
            excerpt: undefined,
          };
        })
        .filter((r): r is MergedSearchResult => r !== null);
    }

    // Limit results
    const limitedResults = results.slice(0, limit);

    return NextResponse.json({
      results: limitedResults.map((r) => ({
        entry: r.entry,
        score: r.score,
        source: r.source,
        excerpt: r.excerpt,
      })),
      total: limitedResults.length,
      mode,
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
