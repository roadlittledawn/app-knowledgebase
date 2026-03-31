/**
 * Atlas Search utilities for full-text search
 * Provides keyword/phrase matching with field boosting
 *
 * Requirements: 17.5 - Atlas Search index configuration
 * Requirements: 5.1 - Query Atlas_Search_Index
 */

import { connectToDatabase } from '@/lib/db/connection';
import Entry from '@/lib/db/models/Entry';
import type { IEntry } from '@/types/entry';

/**
 * Atlas Search index configuration
 * This JSON should be used to create the index in MongoDB Atlas UI or via API
 *
 * Index name: entry_search
 *
 * Configuration:
 * {
 *   "name": "entry_search",
 *   "mappings": {
 *     "dynamic": false,
 *     "fields": {
 *       "frontmatter": {
 *         "type": "document",
 *         "fields": {
 *           "title": {
 *             "type": "string",
 *             "analyzer": "lucene.standard"
 *           },
 *           "tags": { "type": "stringFacet" },
 *           "languages": { "type": "stringFacet" }
 *         }
 *       },
 *       "body": {
 *         "type": "string",
 *         "analyzer": "lucene.standard"
 *       },
 *       "status": { "type": "stringFacet" },
 *       "slug": { "type": "string" }
 *     }
 *   }
 * }
 */
export const ATLAS_SEARCH_INDEX_NAME = 'entry_search';

/**
 * Atlas search result with score
 */
export interface AtlasSearchResult {
  entry: Omit<IEntry, 'body'>;
  score: number;
  excerpt?: string;
}

/**
 * Search options for Atlas Search
 */
export interface AtlasSearchOptions {
  query: string;
  tags?: string[];
  languages?: string[];
  status?: 'draft' | 'published';
  isPrivate?: boolean;
  limit?: number;
}

/**
 * Extract excerpt from body text around matched terms
 */
function extractExcerpt(body: string, query: string, maxLength: number = 200): string {
  const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const bodyLower = body.toLowerCase();

  // Find the first occurrence of any query term
  let bestIndex = -1;
  for (const term of queryTerms) {
    const index = bodyLower.indexOf(term);
    if (index !== -1 && (bestIndex === -1 || index < bestIndex)) {
      bestIndex = index;
    }
  }

  if (bestIndex === -1) {
    // No match found, return beginning of body
    return body.slice(0, maxLength) + (body.length > maxLength ? '...' : '');
  }

  // Extract context around the match
  const start = Math.max(0, bestIndex - 50);
  const end = Math.min(body.length, bestIndex + maxLength - 50);
  let excerpt = body.slice(start, end);

  if (start > 0) excerpt = '...' + excerpt;
  if (end < body.length) excerpt = excerpt + '...';

  return excerpt;
}

/**
 * Perform Atlas Search query
 * Uses MongoDB Atlas Search aggregation pipeline
 *
 * @param options - Search options
 * @returns Array of search results with scores
 */
export async function searchAtlas(options: AtlasSearchOptions): Promise<AtlasSearchResult[]> {
  await connectToDatabase();

  const { query, tags, languages, status, isPrivate, limit = 20 } = options;

  // Build the search stage
  const searchStage: Record<string, unknown> = {
    index: ATLAS_SEARCH_INDEX_NAME,
    compound: {
      should: [
        {
          text: {
            query,
            path: 'frontmatter.title',
            score: { boost: { value: 2 } },
          },
        },
        {
          text: {
            query,
            path: 'body',
          },
        },
      ],
      minimumShouldMatch: 1,
    },
  };

  // Build filter conditions
  const filterConditions: Record<string, unknown>[] = [];

  if (status) {
    filterConditions.push({
      equals: { path: 'status', value: status },
    });
  }

  if (isPrivate !== undefined) {
    filterConditions.push({
      equals: { path: 'frontmatter.isPrivate', value: isPrivate },
    });
  }

  if (tags && tags.length > 0) {
    filterConditions.push({
      in: { path: 'frontmatter.tags', value: tags },
    });
  }

  if (languages && languages.length > 0) {
    filterConditions.push({
      in: { path: 'frontmatter.languages', value: languages },
    });
  }

  // Add filters to search stage if any
  if (filterConditions.length > 0) {
    (searchStage.compound as Record<string, unknown>).filter = filterConditions;
  }

  // Build aggregation pipeline
  const pipeline = [
    { $search: searchStage },
    {
      $project: {
        _id: 1,
        slug: 1,
        categoryId: 1,
        status: 1,
        frontmatter: 1,
        body: 1,
        pineconeId: 1,
        sourceFile: 1,
        createdAt: 1,
        updatedAt: 1,
        score: { $meta: 'searchScore' },
      },
    },
    { $limit: limit },
  ];

  const results = await Entry.aggregate(pipeline);

  return results.map((doc) => ({
    entry: {
      _id: doc._id.toString(),
      slug: doc.slug,
      categoryId: doc.categoryId.toString(),
      status: doc.status,
      frontmatter: doc.frontmatter,
      pineconeId: doc.pineconeId,
      sourceFile: doc.sourceFile,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    },
    score: doc.score,
    excerpt: extractExcerpt(doc.body, query),
  }));
}

/**
 * Get the maximum possible Atlas Search score for normalization
 * This is an approximation based on typical score ranges
 */
export function getMaxAtlasScore(results: AtlasSearchResult[]): number {
  if (results.length === 0) return 1;
  return Math.max(...results.map((r) => r.score), 1);
}

/**
 * Normalize Atlas Search scores to 0-1 range
 *
 * @param results - Atlas search results
 * @returns Results with normalized scores
 */
export function normalizeAtlasScores(results: AtlasSearchResult[]): AtlasSearchResult[] {
  const maxScore = getMaxAtlasScore(results);
  return results.map((r) => ({
    ...r,
    score: r.score / maxScore,
  }));
}
