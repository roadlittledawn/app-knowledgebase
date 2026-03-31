/**
 * Validation rules for API requests
 * Requirements: 2.5, 2.6, 2.11, 2.12, 3.4, 3.6
 */

import { ValidationError, CategoryNotFoundError, ParentNotFoundError } from '@/lib/errors';
import { Category } from '@/lib/db/models/Category';
import { Entry } from '@/lib/db/models/Entry';
import type { EntryFrontmatter, Resource } from '@/types/entry';
import type { CreateCategoryInput, UpdateCategoryInput } from '@/types/category';
import type { WritingSkill, WritingTemplate, AgentPersona } from '@/types/writing-config';

/**
 * Validate MongoDB ObjectId format
 */
export function isValidObjectId(id: string): boolean {
  return /^[a-f\d]{24}$/i.test(id);
}

/**
 * Validate slug format - URL-safe with lowercase letters, numbers, and hyphens
 * Requirement 2.5: THE Entry_Service SHALL generate a unique URL-safe slug for each entry
 */
export function validateSlug(slug: string, fieldName = 'Slug'): string {
  const normalized = slug.toLowerCase().trim();

  if (!normalized) {
    throw new ValidationError(`${fieldName} cannot be empty`);
  }

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(normalized)) {
    throw new ValidationError(
      `${fieldName} must contain only lowercase letters, numbers, and hyphens (no leading/trailing/consecutive hyphens)`,
      { field: fieldName.toLowerCase() }
    );
  }

  if (normalized.length > 200) {
    throw new ValidationError(`${fieldName} cannot exceed 200 characters`);
  }

  return normalized;
}

/**
 * Generate a URL-safe slug from text
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate a unique slug by appending a number if necessary
 * Requirement 2.6: THE Entry_Service SHALL validate that entry slugs are unique across all entries
 */
export async function generateUniqueEntrySlug(
  baseSlug: string,
  excludeId?: string
): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const query: Record<string, unknown> = { slug };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const existing = await Entry.findOne(query);
    if (!existing) {
      return slug;
    }
    slug = `${baseSlug}-${counter}`;
    counter++;
    if (counter > 100) {
      throw new ValidationError('Could not generate unique slug after 100 attempts');
    }
  }
}

/**
 * Check if an entry slug is unique
 * Requirement 2.6: THE Entry_Service SHALL validate that entry slugs are unique across all entries
 */
export async function validateEntrySlugUnique(slug: string, excludeId?: string): Promise<void> {
  const query: Record<string, unknown> = { slug };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  const existing = await Entry.findOne(query);
  if (existing) {
    throw new ValidationError('An entry with this slug already exists', { field: 'slug' });
  }
}

/**
 * Validate that a category exists
 * Requirements 2.11, 2.12: THE Entry_Service SHALL require/validate categoryId reference
 */
export async function validateCategoryExists(categoryId: string): Promise<void> {
  if (!isValidObjectId(categoryId)) {
    throw new ValidationError('Invalid category ID format', { field: 'categoryId' });
  }

  const category = await Category.findById(categoryId);
  if (!category) {
    throw new CategoryNotFoundError(categoryId);
  }
}

/**
 * Validate that a parent category exists
 * Requirement 3.4: WHEN a category is created with a parentId, THE Category_Service SHALL validate that the parent category exists
 */
export async function validateParentCategoryExists(parentId: string | null): Promise<void> {
  if (parentId === null || parentId === '') {
    return; // Root category, no parent validation needed
  }

  if (!isValidObjectId(parentId)) {
    throw new ValidationError('Invalid parent ID format', { field: 'parentId' });
  }

  const parent = await Category.findById(parentId);
  if (!parent) {
    throw new ParentNotFoundError(parentId);
  }
}

/**
 * Check if a category slug is unique within its parent
 * Requirement 3.6: THE Category_Service SHALL validate that category slugs are unique within the same parent
 */
export async function validateCategorySlugUnique(
  slug: string,
  parentId: string | null,
  excludeId?: string
): Promise<void> {
  const query: Record<string, unknown> = {
    slug,
    parentId: parentId || null,
  };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const existing = await Category.findOne(query);
  if (existing) {
    throw new ValidationError('A category with this slug already exists under the same parent', {
      field: 'slug',
    });
  }
}

/**
 * Validate entry frontmatter
 */
export function validateEntryFrontmatter(
  frontmatter: Partial<EntryFrontmatter>,
  isCreate = false
): void {
  // Title validation
  if (isCreate || frontmatter.title !== undefined) {
    if (isCreate && (!frontmatter.title || typeof frontmatter.title !== 'string')) {
      throw new ValidationError('Title is required');
    }
    if (frontmatter.title !== undefined) {
      if (typeof frontmatter.title !== 'string' || frontmatter.title.trim().length === 0) {
        throw new ValidationError('Title cannot be empty');
      }
      if (frontmatter.title.length > 200) {
        throw new ValidationError('Title cannot exceed 200 characters');
      }
    }
  }

  // Skill level validation
  if (frontmatter.skillLevel !== undefined) {
    if (
      typeof frontmatter.skillLevel !== 'number' ||
      frontmatter.skillLevel < 1 ||
      frontmatter.skillLevel > 5 ||
      !Number.isInteger(frontmatter.skillLevel)
    ) {
      throw new ValidationError('Skill level must be an integer between 1 and 5');
    }
  }

  // Array fields validation
  const arrayFields = ['tags', 'languages', 'relatedEntries'] as const;
  for (const field of arrayFields) {
    if (frontmatter[field] !== undefined && !Array.isArray(frontmatter[field])) {
      throw new ValidationError(`${field} must be an array`);
    }
  }

  // Boolean fields validation
  const booleanFields = ['needsHelp', 'isPrivate'] as const;
  for (const field of booleanFields) {
    if (frontmatter[field] !== undefined && typeof frontmatter[field] !== 'boolean') {
      throw new ValidationError(`${field} must be a boolean`);
    }
  }

  // Resources validation
  if (frontmatter.resources !== undefined) {
    validateResources(frontmatter.resources);
  }

  // Related entries validation
  if (frontmatter.relatedEntries !== undefined) {
    for (const entryId of frontmatter.relatedEntries) {
      if (!isValidObjectId(entryId)) {
        throw new ValidationError(`Invalid related entry ID: ${entryId}`);
      }
    }
  }
}

/**
 * Validate resources array
 */
export function validateResources(resources: unknown): Resource[] {
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

    // Basic URL validation
    try {
      new URL(linkUrl);
    } catch {
      throw new ValidationError(`Resource at index ${index} has an invalid URL`);
    }

    return { title: title.trim(), linkUrl: linkUrl.trim() };
  });
}

/**
 * Validate entry status
 */
export function validateEntryStatus(status: unknown): 'draft' | 'published' {
  if (status !== 'draft' && status !== 'published') {
    throw new ValidationError('Status must be either "draft" or "published"');
  }
  return status;
}

/**
 * Validate category input for creation
 */
export function validateCreateCategoryInput(input: CreateCategoryInput): void {
  // Name validation
  if (!input.name || typeof input.name !== 'string' || input.name.trim().length === 0) {
    throw new ValidationError('Category name is required');
  }
  if (input.name.length > 100) {
    throw new ValidationError('Category name cannot exceed 100 characters');
  }

  // Slug validation (if provided)
  if (input.slug !== undefined) {
    validateSlug(input.slug, 'Slug');
  }

  // Order validation (if provided)
  if (input.order !== undefined) {
    if (typeof input.order !== 'number' || input.order < 0 || !Number.isInteger(input.order)) {
      throw new ValidationError('Order must be a non-negative integer');
    }
  }

  // Description validation (if provided)
  if (input.description !== undefined && typeof input.description !== 'string') {
    throw new ValidationError('Description must be a string');
  }
}

/**
 * Validate category input for update
 */
export function validateUpdateCategoryInput(input: UpdateCategoryInput): void {
  // Name validation (if provided)
  if (input.name !== undefined) {
    if (typeof input.name !== 'string' || input.name.trim().length === 0) {
      throw new ValidationError('Category name cannot be empty');
    }
    if (input.name.length > 100) {
      throw new ValidationError('Category name cannot exceed 100 characters');
    }
  }

  // Slug validation (if provided)
  if (input.slug !== undefined) {
    validateSlug(input.slug, 'Slug');
  }

  // Order validation (if provided)
  if (input.order !== undefined) {
    if (typeof input.order !== 'number' || input.order < 0 || !Number.isInteger(input.order)) {
      throw new ValidationError('Order must be a non-negative integer');
    }
  }

  // Description validation (if provided)
  if (input.description !== undefined && typeof input.description !== 'string') {
    throw new ValidationError('Description must be a string');
  }
}

/**
 * Validate WritingSkill
 */
export function validateWritingSkill(skill: unknown, index: number): WritingSkill {
  if (!skill || typeof skill !== 'object') {
    throw new ValidationError(`Skill at index ${index} is invalid`);
  }

  const { id, name, description, prompt } = skill as Record<string, unknown>;

  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new ValidationError(`Skill at index ${index} must have an id`);
  }

  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new ValidationError(`Skill at index ${index} must have a name`);
  }

  if (typeof prompt !== 'string' || prompt.trim().length === 0) {
    throw new ValidationError(`Skill at index ${index} must have a prompt`);
  }

  return {
    id: id.trim(),
    name: name.trim(),
    description: typeof description === 'string' ? description.trim() : '',
    prompt: prompt.trim(),
  };
}

/**
 * Validate WritingTemplate
 */
export function validateWritingTemplate(template: unknown, index: number): WritingTemplate {
  if (!template || typeof template !== 'object') {
    throw new ValidationError(`Template at index ${index} is invalid`);
  }

  const { id, name, description, body, frontmatter } = template as Record<string, unknown>;

  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new ValidationError(`Template at index ${index} must have an id`);
  }

  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new ValidationError(`Template at index ${index} must have a name`);
  }

  return {
    id: id.trim(),
    name: name.trim(),
    description: typeof description === 'string' ? description.trim() : '',
    body: typeof body === 'string' ? body : '',
    frontmatter:
      frontmatter && typeof frontmatter === 'object'
        ? (frontmatter as Partial<EntryFrontmatter>)
        : {},
  };
}

/**
 * Validate AgentPersona
 */
export function validateAgentPersona(agent: unknown, index: number): AgentPersona {
  if (!agent || typeof agent !== 'object') {
    throw new ValidationError(`Agent at index ${index} is invalid`);
  }

  const { role, systemPrompt, enabled } = agent as Record<string, unknown>;

  const validRoles = ['researcher', 'writer', 'reviewer'] as const;
  if (!validRoles.includes(role as (typeof validRoles)[number])) {
    throw new ValidationError(
      `Agent at index ${index} must have a valid role (researcher, writer, or reviewer)`
    );
  }

  return {
    role: role as 'researcher' | 'writer' | 'reviewer',
    systemPrompt: typeof systemPrompt === 'string' ? systemPrompt : '',
    enabled: typeof enabled === 'boolean' ? enabled : true,
  };
}

/**
 * Validate WritingConfig update
 */
export function validateWritingConfigUpdate(config: unknown): void {
  if (!config || typeof config !== 'object') {
    throw new ValidationError('Config must be an object');
  }

  const { baseSystemPrompt, styleGuide, skills, templates, agents } = config as Record<
    string,
    unknown
  >;

  // String fields
  if (baseSystemPrompt !== undefined && typeof baseSystemPrompt !== 'string') {
    throw new ValidationError('baseSystemPrompt must be a string');
  }

  if (styleGuide !== undefined && typeof styleGuide !== 'string') {
    throw new ValidationError('styleGuide must be a string');
  }

  // Skills array
  if (skills !== undefined) {
    if (!Array.isArray(skills)) {
      throw new ValidationError('skills must be an array');
    }
    skills.forEach((skill, index) => validateWritingSkill(skill, index));
  }

  // Templates array
  if (templates !== undefined) {
    if (!Array.isArray(templates)) {
      throw new ValidationError('templates must be an array');
    }
    templates.forEach((template, index) => validateWritingTemplate(template, index));
  }

  // Agents array
  if (agents !== undefined) {
    if (!Array.isArray(agents)) {
      throw new ValidationError('agents must be an array');
    }
    agents.forEach((agent, index) => validateAgentPersona(agent, index));
  }
}
