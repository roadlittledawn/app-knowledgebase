/**
 * Library utilities and services barrel export
 */

// Database connection
export { connectToDatabase, disconnectFromDatabase, isConnected } from './db/connection';

// Database models
export { Category, Entry } from './db/models';
export type { CategoryDocument, CategoryModel, EntryDocument, EntryModel } from './db/models';

// Authentication utilities
export {
  signToken,
  verifyToken,
  getAuthCookieName,
  verifyPassword,
  hashPassword,
  type AuthPayload,
} from './auth';

// Theme utilities
export {
  getThemeScript,
  getStoredTheme,
  setStoredTheme,
  THEME_STORAGE_KEY,
  type Theme,
} from './theme';

// Future exports:
// - search/ - Search services
// - mdx/ - MDX serialization
// - pinecone/ - Vector database client
