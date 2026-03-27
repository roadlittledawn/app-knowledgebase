/**
 * Library utilities and services barrel export
 */

// Database connection
export { connectToDatabase, disconnectFromDatabase, isConnected } from './db/connection';

// Database models
export { Category, Entry } from './db/models';
export type { CategoryDocument, CategoryModel, EntryDocument, EntryModel } from './db/models';

// Future exports:
// - auth/ - Authentication utilities
// - search/ - Search services
// - mdx/ - MDX serialization
// - pinecone/ - Vector database client
// - theme/ - Theme utilities
