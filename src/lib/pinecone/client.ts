/**
 * Pinecone client configuration and connection
 * Provides a singleton Pinecone client instance for vector operations
 */

import { Pinecone } from '@pinecone-database/pinecone';

/**
 * Pinecone index name for entry vectors
 */
export const PINECONE_INDEX_NAME = 'knowledgebase-entries';

/**
 * Embedding dimension (depends on the embedding model used)
 * Using OpenAI text-embedding-3-small dimension by default
 */
export const EMBEDDING_DIMENSION = 1536;

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
 *
 * @returns Pinecone index instance
 */
export function getPineconeIndex() {
  const client = getPineconeClient();
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
