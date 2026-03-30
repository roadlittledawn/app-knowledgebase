/**
 * API error handler wrapper for consistent error responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { AppError, isAppError, ValidationError } from '@/lib/errors';

/**
 * Standard error response format
 */
export interface ErrorResponse {
  error: string;
  code: string;
  details?: unknown;
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  message: string,
  code: string,
  statusCode: number,
  details?: unknown
): NextResponse<ErrorResponse> {
  const response: ErrorResponse = {
    error: message,
    code,
  };

  if (details !== undefined) {
    response.details = details;
  }

  return NextResponse.json(response, { status: statusCode });
}

/**
 * Handle known application errors
 */
function handleAppError(error: AppError): NextResponse<ErrorResponse> {
  return createErrorResponse(error.message, error.code, error.statusCode, error.details);
}

/**
 * Handle MongoDB duplicate key errors
 */
function handleMongoError(error: Error): NextResponse<ErrorResponse> | null {
  if (error.message.includes('duplicate key')) {
    // Extract field name from error message if possible
    const match = error.message.match(/index: (\w+)_/);
    const field = match ? match[1] : 'field';
    return createErrorResponse(`A record with this ${field} already exists`, 'DUPLICATE_KEY', 409, {
      field,
    });
  }

  if (error.message.includes('Referenced category does not exist')) {
    return createErrorResponse('Category does not exist', 'CATEGORY_NOT_FOUND', 400);
  }

  return null;
}

/**
 * Handle JSON parsing errors
 */
function handleJsonError(error: unknown): NextResponse<ErrorResponse> | null {
  if (error instanceof SyntaxError && error.message.includes('JSON')) {
    return createErrorResponse('Invalid JSON in request body', 'INVALID_JSON', 400);
  }
  return null;
}

/**
 * Generic error handler that converts errors to appropriate responses
 */
export function handleError(error: unknown): NextResponse<ErrorResponse> {
  // Log the error for debugging
  console.error('API Error:', error);

  // Handle known application errors
  if (isAppError(error)) {
    return handleAppError(error);
  }

  // Handle standard Error instances
  if (error instanceof Error) {
    // Check for MongoDB errors
    const mongoResponse = handleMongoError(error);
    if (mongoResponse) return mongoResponse;

    // Check for JSON parsing errors
    const jsonResponse = handleJsonError(error);
    if (jsonResponse) return jsonResponse;
  }

  // Default to internal server error
  return createErrorResponse('Internal server error', 'INTERNAL_ERROR', 500);
}

/**
 * Type for API route handlers
 */
type RouteHandler<T> = (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => Promise<NextResponse<T>>;

/**
 * Wrapper function to add consistent error handling to API routes
 *
 * Usage:
 * ```typescript
 * export const GET = withErrorHandler(async (request) => {
 *   // Your route logic here
 *   throw new NotFoundError('Entry');
 *   return NextResponse.json({ data });
 * });
 * ```
 */
export function withErrorHandler<T>(
  handler: RouteHandler<T | ErrorResponse>
): RouteHandler<T | ErrorResponse> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleError(error);
    }
  };
}

/**
 * Validation helper functions
 */

/**
 * Validate that a value is a non-empty string
 */
export function validateRequiredString(
  value: unknown,
  fieldName: string,
  maxLength?: number
): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`${fieldName} is required`);
  }
  const trimmed = value.trim();
  if (maxLength && trimmed.length > maxLength) {
    throw new ValidationError(`${fieldName} cannot exceed ${maxLength} characters`);
  }
  return trimmed;
}

/**
 * Validate that a slug is URL-safe
 */
export function validateSlugFormat(slug: string): void {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    throw new ValidationError('Slug must contain only lowercase letters, numbers, and hyphens', {
      field: 'slug',
    });
  }
}

/**
 * Validate that a number is within a range
 */
export function validateNumberRange(
  value: unknown,
  fieldName: string,
  min: number,
  max: number
): number {
  if (typeof value !== 'number' || value < min || value > max) {
    throw new ValidationError(`${fieldName} must be between ${min} and ${max}`);
  }
  return value;
}

/**
 * Validate that a value is one of allowed values
 */
export function validateEnum<T extends string>(
  value: unknown,
  fieldName: string,
  allowedValues: readonly T[]
): T {
  if (!allowedValues.includes(value as T)) {
    throw new ValidationError(`${fieldName} must be one of: ${allowedValues.join(', ')}`, {
      field: fieldName,
      allowedValues,
    });
  }
  return value as T;
}

/**
 * Validate MongoDB ObjectId format
 */
export function validateObjectId(value: string, fieldName = 'ID'): void {
  // MongoDB ObjectId is a 24-character hex string
  if (!/^[a-f\d]{24}$/i.test(value)) {
    throw new ValidationError(`Invalid ${fieldName} format`, { field: fieldName });
  }
}

/**
 * Validate an array of resources
 */
export function validateResources(resources: unknown): Array<{ title: string; linkUrl: string }> {
  if (!Array.isArray(resources)) {
    throw new ValidationError('Resources must be an array');
  }

  return resources.map((resource, index) => {
    if (!resource || typeof resource !== 'object') {
      throw new ValidationError(`Resource at index ${index} is invalid`);
    }

    const { title, linkUrl } = resource as { title?: unknown; linkUrl?: unknown };

    if (typeof title !== 'string' || title.trim().length === 0) {
      throw new ValidationError(`Resource at index ${index} must have a title`);
    }

    if (typeof linkUrl !== 'string' || linkUrl.trim().length === 0) {
      throw new ValidationError(`Resource at index ${index} must have a linkUrl`);
    }

    return { title: title.trim(), linkUrl: linkUrl.trim() };
  });
}
