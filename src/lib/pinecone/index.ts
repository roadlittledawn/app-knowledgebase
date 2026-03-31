/**
 * Pinecone module exports
 */

export {
  getPineconeClient,
  getPineconeIndex,
  isPineconeConfigured,
  PINECONE_INDEX_NAME,
} from './client';

export {
  upsertEntryVector,
  deleteEntryVector,
  syncEntryVector,
  batchUpsertEntryVectors,
  batchDeleteEntryVectors,
  buildEmbeddingText,
  buildPineconeMetadata,
  type PineconeEntryMetadata,
} from './sync';
