/**
 * Search module exports
 * Provides hybrid search combining Atlas full-text and Pinecone semantic search
 */

export {
  searchAtlas,
  normalizeAtlasScores,
  ATLAS_SEARCH_INDEX_NAME,
  type AtlasSearchResult,
  type AtlasSearchOptions,
} from './atlas';

export {
  searchPinecone,
  pineconeResultToEntry,
  type PineconeSearchResult,
  type PineconeSearchOptions,
} from './pinecone';

export {
  mergeSearchResults,
  deduplicateResults,
  DEFAULT_MERGE_CONFIG,
  type MergeConfig,
  type MergedSearchResult,
  type SearchResultSource,
} from './merge';
