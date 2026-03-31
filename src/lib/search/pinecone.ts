/**
 * Pinecone semantic search utilities
 * Uses Pinecone's integrated inference with pinecone-sparse-english-v0 model
 *
 * Requirements: 5.1 - Query Pinecone_Index for semantic search
 */

import {
  getPineconeClient,
  isPineconeConfigured,
  PINECONE_INDEX_NAME,
} from '@/lib/pinecone/client';
import type { PineconeEntryMetadata } from '@/lib/pinecone/sync';
import type { IEntry } from '@/types/entry';

/**
 * Pinecone search result with score
 */
export interface PineconeSearchResult {
  entryId: string;
  score: number;
  metadata: PineconeEntryMetadata;
}

/**
 * Search options for Pinecone
 */
export interface PineconeSearchOptions {
  query: string;
  tags?: string[];
  languages?: string[];
  status?: 'draft' | 'published';
  isPrivate?: boolean;
  limit?: number;
}

/**
 * Build Pinecone filter from search options
 */
function buildPineconeFilter(
  options: Omit<PineconeSearchOptions, 'query' | 'limit'>
): Record<string, unknown> | undefined {
  const { tags, languages, status, isPrivate } = options;
  const conditions: Record<string, unknown>[] = [];

  if (status) {
    conditions.push({ status: { $eq: status } });
  }

  if (isPrivate !== undefined) {
    conditions.push({ isPrivate: { $eq: isPrivate } });
  }

  if (tags && tags.length > 0) {
    conditions.push({ tags: { $in: tags } });
  }

  if (languages && languages.length > 0) {
    conditions.push({ languages: { $in: languages } });
  }

  if (conditions.length === 0) {
    return undefined;
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return { $and: conditions };
}

/**
 * Perform Pinecone semantic search using integrated inference
 * Pinecone generates query embedding server-side using pinecone-sparse-english-v0
 *
 * @param options - Search options
 * @returns Array of search results with scores
 */
export async function searchPinecone(
  options: PineconeSearchOptions
): Promise<PineconeSearchResult[]> {
  if (!isPineconeConfigured()) {
    console.warn('Pinecone is not configured, returning empty results');
    return [];
  }

  if (!PINECONE_INDEX_NAME) {
    console.warn('PINECONE_INDEX_NAME is not configured, returning empty results');
    return [];
  }

  const { query, limit = 20, ...filterOptions } = options;

  const client = getPineconeClient();
  const index = client.index(PINECONE_INDEX_NAME);

  // Build filter
  const filter = buildPineconeFilter(filterOptions);

  // Search using integrated inference - Pinecone generates query embedding
  const searchResponse = await index.searchRecords({
    query: {
      topK: limit,
      inputs: { text: query },
      filter,
    },
  });

  // Transform results
  return (searchResponse.result?.hits || []).map((hit) => ({
    entryId: hit._id,
    score: hit._score ?? 0,
    metadata: hit.fields as unknown as PineconeEntryMetadata,
  }));
}

/**
 * Convert Pinecone result to partial entry format
 * Used for merging with Atlas results
 */
export function pineconeResultToEntry(result: PineconeSearchResult): Omit<IEntry, 'body'> {
  return {
    _id: result.entryId,
    slug: result.metadata.slug,
    categoryId: result.metadata.categoryId,
    status: result.metadata.status as 'draft' | 'published',
    frontmatter: {
      title: result.metadata.title,
      tags: result.metadata.tags,
      languages: result.metadata.languages,
      skillLevel: 3,
      needsHelp: false,
      isPrivate: result.metadata.isPrivate,
      resources: [],
      relatedEntries: [],
    },
    pineconeId: result.entryId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
