/**
 * Custom error classes for consistent API error handling
 */

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, code: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error - 400 Bad Request
 * Used when request data fails validation rules
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

/**
 * Not found error - 404 Not Found
 * Used when a requested resource doesn't exist
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 'NOT_FOUND', 404);
  }
}

/**
 * Unauthorized error - 401 Unauthorized
 * Used when authentication is required but not provided or invalid
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

/**
 * Forbidden error - 403 Forbidden
 * Used when user is authenticated but lacks permission
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 'FORBIDDEN', 403);
  }
}

/**
 * Conflict error - 409 Conflict
 * Used when request conflicts with current state (e.g., duplicate entries)
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONFLICT', 409, details);
  }
}

/**
 * Duplicate slug error - 409 Conflict
 * Specific error for duplicate slug scenarios
 */
export class DuplicateSlugError extends ConflictError {
  constructor(resource: string) {
    super(`A ${resource} with this slug already exists`, { field: 'slug' });
    // Override code by using Object.defineProperty since it's readonly
    Object.defineProperty(this, 'code', { value: 'DUPLICATE_SLUG', writable: false });
  }
}

/**
 * Category not found error - 400 Bad Request
 * Used when a referenced category doesn't exist
 */
export class CategoryNotFoundError extends AppError {
  constructor(categoryId?: string) {
    const message = categoryId
      ? `Category with ID '${categoryId}' does not exist`
      : 'Category does not exist';
    super(message, 'CATEGORY_NOT_FOUND', 400);
  }
}

/**
 * Parent not found error - 400 Bad Request
 * Used when a referenced parent category doesn't exist
 */
export class ParentNotFoundError extends AppError {
  constructor(parentId?: string) {
    const message = parentId
      ? `Parent category with ID '${parentId}' does not exist`
      : 'Parent category does not exist';
    super(message, 'PARENT_NOT_FOUND', 400);
  }
}

/**
 * Invalid ID error - 400 Bad Request
 * Used when an ID format is invalid (e.g., invalid MongoDB ObjectId)
 */
export class InvalidIdError extends AppError {
  constructor(idType = 'ID') {
    super(`Invalid ${idType} format`, 'INVALID_ID', 400);
  }
}

/**
 * Reference constraint error - 409 Conflict
 * Used when deletion is prevented due to existing references
 */
export class ReferenceConstraintError extends ConflictError {
  constructor(resource: string, referencedBy: string) {
    super(`Cannot delete ${resource} because it is referenced by ${referencedBy}`);
    // Override code by using Object.defineProperty since it's readonly
    Object.defineProperty(this, 'code', { value: 'REFERENCE_CONSTRAINT', writable: false });
  }
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
