/**
 * Pinecone client configuration and connection
 * Provides a singleton Pinecone client instance for vector operations
 * Uses Pinecone's integrated inference with pinecone-sparse-english-v0 model
 */

import { Pinecone } from '@pinecone-database/pinecone';

/**
 * Pinecone index name for entry vectors
 * Must be created with integrated embedding model: pinecone-sparse-english-v0
 */
export const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME;

/**
 * Embedding model used by Pinecone for integrated inference
 */
export const PINECONE_EMBEDDING_MODEL = 'pinecone-sparse-english-v0';

/**
 * Singleton Pinecone client instance
 */
let pineconeClient: Pinecone | null = null;

/**
 * Get or create the Pinecone client instance
 * Uses the PINECONE_API_KEY environment variable for authentication
 *
 * @returns Pinecone client instance
 * @throws Error if PINECONE_API_KEY is not set
 */
export function getPineconeClient(): Pinecone {
  if (pineconeClient) {
    return pineconeClient;
  }

  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) {
    throw new Error('PINECONE_API_KEY environment variable is not set');
  }

  pineconeClient = new Pinecone({
    apiKey,
  });

  return pineconeClient;
}

/**
 * Get the Pinecone index for entry vectors
 * Returns index configured for integrated embedding
 *
 * @returns Pinecone index instance
 */
export function getPineconeIndex() {
  const client = getPineconeClient();
  if (!PINECONE_INDEX_NAME) {
    throw new Error('PINECONE_INDEX_NAME environment variable is not set');
  }
  return client.index(PINECONE_INDEX_NAME);
}

/**
 * Check if Pinecone is configured (API key is set)
 *
 * @returns true if Pinecone API key is configured
 */
export function isPineconeConfigured(): boolean {
  return !!process.env.PINECONE_API_KEY;
}
