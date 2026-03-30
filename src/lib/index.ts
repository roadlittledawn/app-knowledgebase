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

// Error handling
export {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  DuplicateSlugError,
  CategoryNotFoundError,
  ParentNotFoundError,
  InvalidIdError,
  ReferenceConstraintError,
  isAppError,
} from './errors';

// API utilities
export {
  handleError,
  withErrorHandler,
  createErrorResponse,
  validateRequiredString,
  validateSlugFormat,
  validateNumberRange,
  validateEnum,
  validateObjectId,
  validateResources,
  type ErrorResponse,
} from './api/error-handler';

// Validation utilities
export {
  isValidObjectId,
  validateSlug,
  generateSlug,
  generateUniqueEntrySlug,
  validateEntrySlugUnique,
  validateCategoryExists,
  validateParentCategoryExists,
  validateCategorySlugUnique,
  validateEntryFrontmatter,
  validateResources as validateResourcesArray,
  validateEntryStatus,
  validateCreateCategoryInput,
  validateUpdateCategoryInput,
  validateWritingSkill,
  validateWritingTemplate,
  validateAgentPersona,
  validateWritingConfigUpdate,
} from './api/validation';

// Future exports:
// - search/ - Search services
// - mdx/ - MDX serialization
// - pinecone/ - Vector database client
