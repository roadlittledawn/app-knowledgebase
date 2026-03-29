/**
 * Pinecone module exports
 */

export {
  getPineconeClient,
  getPineconeIndex,
  isPineconeConfigured,
  PINECONE_INDEX_NAME,
  EMBEDDING_DIMENSION,
} from './client';

export {
  upsertEntryVector,
  deleteEntryVector,
  syncEntryVector,
  batchUpsertEntryVectors,
  batchDeleteEntryVectors,
  generateEmbedding,
  buildEmbeddingText,
  buildPineconeMetadata,
  type PineconeEntryMetadata,
} from './sync';
