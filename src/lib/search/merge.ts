/**
 * Search result merging utilities
 * Combines Atlas full-text and Pinecone semantic search results
 *
 * Requirements: 5.2, 5.3, 5.4, 5.5
 * - Normalize Atlas scores to 0-1 range with 50% weight
 * - Weight Pinecone cosine similarity at 50%
 * - Rank dual-source matches higher
 * - Deduplicate by entry ID
 */

import type { IEntry } from '@/types/entry';
import type { AtlasSearchResult } from './atlas';
import type { PineconeSearchResult } from './pinecone';
import { pineconeResultToEntry } from './pinecone';

/**
 * Merge configuration
 */
export interface MergeConfig {
  atlasWeight: number; // Default: 0.5
  pineconeWeight: number; // Default: 0.5
}

/**
 * Source of the search result
 */
export type SearchResultSource = 'atlas' | 'pinecone' | 'both';

/**
 * Merged search result
 */
export interface MergedSearchResult {
  entry: Omit<IEntry, 'body'>;
  score: number;
  source: SearchResultSource;
  excerpt?: string;
  atlasScore?: number;
  pineconeScore?: number;
}

/**
 * Default merge configuration with 50/50 weighting
 */
export const DEFAULT_MERGE_CONFIG: MergeConfig = {
  atlasWeight: 0.5,
  pineconeWeight: 0.5,
};

/**
 * Normalize Atlas scores to 0-1 range
 * Atlas Search scores can vary widely, so we normalize relative to max
 */
function normalizeAtlasScores(results: AtlasSearchResult[]): Map<string, number> {
  const scoreMap = new Map<string, number>();
  if (results.length === 0) return scoreMap;

  const maxScore = Math.max(...results.map((r) => r.score), 1);

  for (const result of results) {
    scoreMap.set(result.entry._id, result.score / maxScore);
  }

  return scoreMap;
}

/**
 * Create a map of Pinecone scores by entry ID
 * Pinecone cosine similarity is already in 0-1 range
 */
function createPineconeScoreMap(results: PineconeSearchResult[]): Map<string, number> {
  const scoreMap = new Map<string, number>();

  for (const result of results) {
    scoreMap.set(result.entryId, result.score);
  }

  return scoreMap;
}

/**
 * Merge search results from Atlas and Pinecone
 *
 * Algorithm:
 * 1. Normalize Atlas scores to 0-1 range
 * 2. Create maps of scores by entry ID
 * 3. Combine scores with configured weights
 * 4. Entries in both sources get bonus (higher combined score)
 * 5. Deduplicate and sort by combined score
 *
 * @param atlasResults - Results from Atlas Search
 * @param pineconeResults - Results from Pinecone
 * @param config - Merge configuration
 * @returns Merged and sorted results
 */
export function mergeSearchResults(
  atlasResults: AtlasSearchResult[],
  pineconeResults: PineconeSearchResult[],
  config: MergeConfig = DEFAULT_MERGE_CONFIG
): MergedSearchResult[] {
  const { atlasWeight, pineconeWeight } = config;

  // Normalize Atlas scores
  const atlasScores = normalizeAtlasScores(atlasResults);
  const pineconeScores = createPineconeScoreMap(pineconeResults);

  // Create maps for entry data and excerpts
  const atlasEntries = new Map<string, Omit<IEntry, 'body'>>();
  const atlasExcerpts = new Map<string, string>();
  for (const result of atlasResults) {
    atlasEntries.set(result.entry._id, result.entry);
    if (result.excerpt) {
      atlasExcerpts.set(result.entry._id, result.excerpt);
    }
  }

  const pineconeEntries = new Map<string, Omit<IEntry, 'body'>>();
  for (const result of pineconeResults) {
    pineconeEntries.set(result.entryId, pineconeResultToEntry(result));
  }

  // Collect all unique entry IDs
  const allEntryIds = new Set([...atlasScores.keys(), ...pineconeScores.keys()]);

  // Calculate combined scores and build results
  const mergedResults: MergedSearchResult[] = [];

  for (const entryId of allEntryIds) {
    const atlasScore = atlasScores.get(entryId);
    const pineconeScore = pineconeScores.get(entryId);

    // Determine source
    let source: SearchResultSource;
    if (atlasScore !== undefined && pineconeScore !== undefined) {
      source = 'both';
    } else if (atlasScore !== undefined) {
      source = 'atlas';
    } else {
      source = 'pinecone';
    }

    // Calculate combined score
    let combinedScore: number;
    if (source === 'both') {
      // Both sources: weighted average
      combinedScore = atlasScore! * atlasWeight + pineconeScore! * pineconeWeight;
    } else if (source === 'atlas') {
      // Atlas only: apply weight
      combinedScore = atlasScore! * atlasWeight;
    } else {
      // Pinecone only: apply weight
      combinedScore = pineconeScore! * pineconeWeight;
    }

    // Get entry data (prefer Atlas as it has more complete data)
    const entry = atlasEntries.get(entryId) || pineconeEntries.get(entryId);
    if (!entry) continue;

    mergedResults.push({
      entry,
      score: combinedScore,
      source,
      excerpt: atlasExcerpts.get(entryId),
      atlasScore,
      pineconeScore,
    });
  }

  // Sort by score descending
  // Dual-source matches naturally rank higher due to combined scores
  mergedResults.sort((a, b) => b.score - a.score);

  return mergedResults;
}

/**
 * Filter merged results to remove duplicates
 * (Already handled by mergeSearchResults, but useful as standalone utility)
 */
export function deduplicateResults(results: MergedSearchResult[]): MergedSearchResult[] {
  const seen = new Set<string>();
  return results.filter((result) => {
    if (seen.has(result.entry._id)) {
      return false;
    }
    seen.add(result.entry._id);
    return true;
  });
}
