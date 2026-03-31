/**
 * Pinecone vector synchronization utilities
 * Handles upserting and deleting entry vectors in Pinecone
 * Uses Pinecone's integrated inference (pinecone-sparse-english-v0) for embeddings
 *
 * Validates: Requirements 2.2, 2.3, 2.4
 */

import {
  getPineconeClient,
  getPineconeIndex,
  isPineconeConfigured,
  PINECONE_INDEX_NAME,
} from './client';
import { getCategoryPath } from '@/lib/db/queries/categories';
import type { IEntry } from '@/types/entry';

/**
 * Pinecone vector metadata structure
 * Extends RecordMetadata to be compatible with Pinecone's type system
 */
export interface PineconeEntryMetadata {
  entryId: string;
  slug: string;
  title: string;
  categoryId: string;
  categoryPath: string;
  tags: string[];
  languages: string[];
  status: string;
  isPrivate: boolean;
  [key: string]: string | string[] | boolean;
}

/**
 * Build the text content for embedding from an entry
 * Combines title, tags, and body for comprehensive semantic search
 *
 * @param entry - Entry to build embedding text from
 * @returns Combined text for embedding
 */
export function buildEmbeddingText(entry: IEntry): string {
  const parts = [entry.frontmatter.title, ...entry.frontmatter.tags, entry.body];

  return parts.filter(Boolean).join(' ');
}

/**
 * Build Pinecone metadata from an entry
 *
 * @param entry - Entry to build metadata from
 * @param categoryPath - Pre-computed category path string
 * @returns Pinecone metadata object
 */
export function buildPineconeMetadata(entry: IEntry, categoryPath: string): PineconeEntryMetadata {
  return {
    entryId: entry._id,
    slug: entry.slug,
    title: entry.frontmatter.title,
    categoryId: entry.categoryId,
    categoryPath,
    tags: entry.frontmatter.tags,
    languages: entry.frontmatter.languages,
    status: entry.status,
    isPrivate: entry.frontmatter.isPrivate,
  };
}

/**
 * Upsert an entry vector to Pinecone using integrated inference
 * Pinecone generates embeddings server-side using pinecone-sparse-english-v0
 *
 * Validates: Requirement 2.2 - Sync on publish
 *
 * @param entry - Entry to upsert
 * @returns The Pinecone vector ID (same as entry._id)
 * @throws Error if Pinecone is not configured or upsert fails
 */
export async function upsertEntryVector(entry: IEntry): Promise<string> {
  if (!isPineconeConfigured()) {
    console.warn('Pinecone is not configured, skipping vector upsert');
    return entry._id;
  }

  if (!PINECONE_INDEX_NAME) {
    console.warn('PINECONE_INDEX_NAME is not configured, skipping vector upsert');
    return entry._id;
  }

  const client = getPineconeClient();
  const index = client.index(PINECONE_INDEX_NAME);

  // Get category path for metadata
  const categoryPath = await getCategoryPath(entry.categoryId);

  // Build text content for embedding
  const embeddingText = buildEmbeddingText(entry);

  // Build metadata
  const metadata = buildPineconeMetadata(entry, categoryPath);

  // Upsert using integrated inference - Pinecone generates embeddings
  await index.upsertRecords({
    records: [
      {
        _id: entry._id,
        text: embeddingText,
        ...metadata,
      },
    ],
  });

  return entry._id;
}

/**
 * Delete an entry vector from Pinecone
 * Called when an entry is unpublished (status changed to draft) or deleted
 *
 * Validates: Requirements 2.3, 2.4 - Remove on unpublish/delete
 *
 * @param entryId - ID of the entry to delete
 * @throws Error if Pinecone is not configured or delete fails
 */
export async function deleteEntryVector(entryId: string): Promise<void> {
  if (!isPineconeConfigured()) {
    console.warn('Pinecone is not configured, skipping vector delete');
    return;
  }

  const index = getPineconeIndex();
  await index.deleteOne({ id: entryId });
}

/**
 * Sync an entry's vector based on its status
 * - If published: upsert the vector
 * - If draft: delete the vector (if it exists)
 *
 * @param entry - Entry to sync
 * @param previousStatus - Previous status of the entry (for detecting status changes)
 * @returns The Pinecone vector ID if upserted, undefined if deleted
 */
export async function syncEntryVector(
  entry: IEntry,
  previousStatus?: 'draft' | 'published'
): Promise<string | undefined> {
  if (entry.status === 'published') {
    return await upsertEntryVector(entry);
  } else if (previousStatus === 'published') {
    await deleteEntryVector(entry._id);
    return undefined;
  }

  return undefined;
}

/**
 * Batch upsert multiple entry vectors using integrated inference
 * Useful for migration or bulk operations
 *
 * @param entries - Entries to upsert
 * @returns Array of Pinecone vector IDs
 */
export async function batchUpsertEntryVectors(entries: IEntry[]): Promise<string[]> {
  if (!isPineconeConfigured()) {
    console.warn('Pinecone is not configured, skipping batch vector upsert');
    return entries.map((e) => e._id);
  }

  if (!PINECONE_INDEX_NAME) {
    console.warn('PINECONE_INDEX_NAME is not configured, skipping batch vector upsert');
    return entries.map((e) => e._id);
  }

  const client = getPineconeClient();
  const index = client.index(PINECONE_INDEX_NAME);
  const records: Array<{
    _id: string;
    text: string;
    entryId: string;
    slug: string;
    title: string;
    categoryId: string;
    categoryPath: string;
    tags: string[];
    languages: string[];
    status: string;
    isPrivate: boolean;
  }> = [];

  for (const entry of entries) {
    if (entry.status !== 'published') {
      continue;
    }

    const categoryPath = await getCategoryPath(entry.categoryId);
    const embeddingText = buildEmbeddingText(entry);
    const metadata = buildPineconeMetadata(entry, categoryPath);

    records.push({
      _id: entry._id,
      text: embeddingText,
      ...metadata,
    });
  }

  if (records.length > 0) {
    // Pinecone recommends batches of 100 records
    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      await index.upsertRecords({ records: batch });
    }
  }

  return records.map((r) => r._id);
}

/**
 * Batch delete multiple entry vectors
 *
 * @param entryIds - IDs of entries to delete
 */
export async function batchDeleteEntryVectors(entryIds: string[]): Promise<void> {
  if (!isPineconeConfigured()) {
    console.warn('Pinecone is not configured, skipping batch vector delete');
    return;
  }

  if (entryIds.length === 0) {
    return;
  }

  const index = getPineconeIndex();
  await index.deleteMany(entryIds);
}
