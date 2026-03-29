/**
 * Pinecone vector synchronization utilities
 * Handles upserting and deleting entry vectors in Pinecone
 *
 * Validates: Requirements 2.2, 2.3, 2.4
 */

import { getPineconeIndex, isPineconeConfigured } from './client';
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
  topics: string[];
  tags: string[];
  languages: string[];
  status: string;
  isPrivate: boolean;
  [key: string]: string | string[] | boolean; // Index signature for RecordMetadata compatibility
}

/**
 * Generate a placeholder embedding vector
 * In production, this should use an actual embedding model (e.g., OpenAI, Anthropic)
 *
 * TODO: Replace with actual embedding generation using Anthropic or OpenAI API
 *
 * @param text - Text to generate embedding for
 * @returns Embedding vector (placeholder zeros for now)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // Placeholder: Return a zero vector of the expected dimension
  // In production, call an embedding API here
  // Example with OpenAI:
  // const response = await openai.embeddings.create({
  //   model: 'text-embedding-3-small',
  //   input: text,
  // });
  // return response.data[0].embedding;

  // For now, generate a deterministic placeholder based on text hash
  // This allows testing without an embedding API
  const dimension = 1536;
  const vector = new Array(dimension).fill(0);

  // Create a simple hash-based placeholder (not for production use)
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash = hash & hash;
  }

  // Distribute the hash across the vector
  for (let i = 0; i < dimension; i++) {
    vector[i] = Math.sin(hash + i) * 0.1;
  }

  return vector;
}

/**
 * Build the text content for embedding from an entry
 * Combines title, topics, tags, and body for comprehensive semantic search
 *
 * @param entry - Entry to build embedding text from
 * @returns Combined text for embedding
 */
export function buildEmbeddingText(entry: IEntry): string {
  const parts = [
    entry.frontmatter.title,
    ...entry.frontmatter.topics,
    ...entry.frontmatter.tags,
    entry.body,
  ];

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
    topics: entry.frontmatter.topics,
    tags: entry.frontmatter.tags,
    languages: entry.frontmatter.languages,
    status: entry.status,
    isPrivate: entry.frontmatter.isPrivate,
  };
}

/**
 * Upsert an entry vector to Pinecone
 * Called when an entry is published or updated while published
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

  const index = getPineconeIndex();

  // Get category path for metadata
  const categoryPath = await getCategoryPath(entry.categoryId);

  // Generate embedding from entry content
  const embeddingText = buildEmbeddingText(entry);
  const embedding = await generateEmbedding(embeddingText);

  // Build metadata
  const metadata = buildPineconeMetadata(entry, categoryPath);

  // Upsert the vector
  await index.upsert({
    records: [
      {
        id: entry._id,
        values: embedding,
        metadata,
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
    // Entry is published, upsert the vector
    return await upsertEntryVector(entry);
  } else if (previousStatus === 'published') {
    // Entry was published but is now draft, delete the vector
    await deleteEntryVector(entry._id);
    return undefined;
  }

  // Entry is draft and was draft, no action needed
  return undefined;
}

/**
 * Batch upsert multiple entry vectors
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

  const index = getPineconeIndex();
  const vectors = [];

  for (const entry of entries) {
    if (entry.status !== 'published') {
      continue;
    }

    const categoryPath = await getCategoryPath(entry.categoryId);
    const embeddingText = buildEmbeddingText(entry);
    const embedding = await generateEmbedding(embeddingText);
    const metadata = buildPineconeMetadata(entry, categoryPath);

    vectors.push({
      id: entry._id,
      values: embedding,
      metadata,
    });
  }

  if (vectors.length > 0) {
    // Pinecone recommends batches of 100 vectors
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await index.upsert({ records: batch });
    }
  }

  return vectors.map((v) => v.id);
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
