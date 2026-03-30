/**
 * Pinecone semantic search utilities
 * Provides vector-based semantic search using embeddings
 *
 * Requirements: 5.1 - Query Pinecone_Index for semantic search
 */

import { getPineconeIndex, isPineconeConfigured } from '@/lib/pinecone/client';
import { generateEmbedding, type PineconeEntryMetadata } from '@/lib/pinecone/sync';
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
  topics?: string[];
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
  const { tags, topics, languages, status, isPrivate } = options;
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

  if (topics && topics.length > 0) {
    conditions.push({ topics: { $in: topics } });
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
 * Perform Pinecone semantic search
 * Generates embedding for query and finds similar vectors
 *
 * @param options - Search options
 * @returns Array of search results with scores (cosine similarity 0-1)
 */
export async function searchPinecone(
  options: PineconeSearchOptions
): Promise<PineconeSearchResult[]> {
  if (!isPineconeConfigured()) {
    console.warn('Pinecone is not configured, returning empty results');
    return [];
  }

  const { query, limit = 20, ...filterOptions } = options;

  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);

  // Build filter
  const filter = buildPineconeFilter(filterOptions);

  // Query Pinecone
  const index = getPineconeIndex();
  const queryResponse = await index.query({
    vector: queryEmbedding,
    topK: limit,
    filter,
    includeMetadata: true,
  });

  // Transform results
  return (queryResponse.matches || []).map((match) => ({
    entryId: match.id,
    score: match.score ?? 0,
    metadata: match.metadata as PineconeEntryMetadata,
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
      topics: result.metadata.topics,
      tags: result.metadata.tags,
      languages: result.metadata.languages,
      skillLevel: 3, // Default, not stored in Pinecone
      needsHelp: false, // Default, not stored in Pinecone
      isPrivate: result.metadata.isPrivate,
      resources: [], // Not stored in Pinecone
      relatedEntries: [], // Not stored in Pinecone
    },
    pineconeId: result.entryId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
