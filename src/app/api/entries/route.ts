/**
 * Entries API routes
 * GET /api/entries - List entries with filters and visibility rules
 * POST /api/entries - Create a new entry (authenticated only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectToDatabase } from '@/lib/db/connection';
import { Entry } from '@/lib/db/models/Entry';
import { Category } from '@/lib/db/models/Category';
import { verifyToken, getAuthCookieName } from '@/lib/auth';
import type { IEntry, EntryFrontmatter } from '@/types/entry';
import type { EntryDocument } from '@/lib/db/models/Entry';
import { upsertEntryVector, isPineconeConfigured } from '@/lib/pinecone';

interface EntriesListResponse {
  entries: Omit<IEntry, 'body'>[];
  total: number;
  page: number;
  pages: number;
}

interface CreateEntryResponse {
  entry: IEntry;
}

interface ErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
}

/**
 * Generate a URL-safe slug from a title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate a unique slug by appending a number if necessary
 */
async function generateUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
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
      throw new Error('Could not generate unique slug after 100 attempts');
    }
  }
}

/**
 * Check if user is authenticated
 */
async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAuthCookieName())?.value;
  if (!token) return false;
  const payload = await verifyToken(token);
  return payload !== null;
}

/**
 * Get visibility filter based on authentication state
 * Unauthenticated users can only see published, non-private entries
 */
function getVisibilityFilter(authenticated: boolean): Record<string, unknown> {
  if (authenticated) {
    return {}; // Admin sees everything
  }
  return {
    status: 'published',
    'frontmatter.isPrivate': { $ne: true },
  };
}

/**
 * Transform an entry document to IEntry interface (without body for list)
 */
function transformEntryForList(doc: EntryDocument): Omit<IEntry, 'body'> {
  return {
    _id: doc._id.toString(),
    slug: doc.slug,
    categoryId: doc.categoryId.toString(),
    status: doc.status,
    frontmatter: {
      title: doc.frontmatter.title,
      topics: doc.frontmatter.topics,
      tags: doc.frontmatter.tags,
      languages: doc.frontmatter.languages,
      skillLevel: doc.frontmatter.skillLevel as 1 | 2 | 3 | 4 | 5,
      needsHelp: doc.frontmatter.needsHelp,
      isPrivate: doc.frontmatter.isPrivate,
      resources: doc.frontmatter.resources,
      relatedEntries: doc.frontmatter.relatedEntries.map((id) => id.toString()),
    },
    pineconeId: doc.pineconeId,
    sourceFile: doc.sourceFile,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * Transform an entry document to full IEntry interface
 */
function transformEntry(doc: EntryDocument): IEntry {
  return {
    ...transformEntryForList(doc),
    body: doc.body,
  };
}

/**
 * GET /api/entries
 * List entries with filters and pagination
 * Visibility is filtered based on authentication state
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<EntriesListResponse | ErrorResponse>> {
  try {
    await connectToDatabase();

    const authenticated = await isAuthenticated();
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const categoryId = searchParams.get('categoryId');
    const tag = searchParams.get('tag');
    const topic = searchParams.get('topic');
    const language = searchParams.get('language');
    const status = searchParams.get('status') as 'draft' | 'published' | null;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const sort = searchParams.get('sort') || '-updatedAt';

    // Build filter query
    const filter: Record<string, unknown> = {
      ...getVisibilityFilter(authenticated),
    };

    if (categoryId) {
      filter.categoryId = categoryId;
    }
    if (tag) {
      filter['frontmatter.tags'] = tag;
    }
    if (topic) {
      filter['frontmatter.topics'] = topic;
    }
    if (language) {
      filter['frontmatter.languages'] = language;
    }
    // Only allow status filter for authenticated users
    if (status && authenticated) {
      filter.status = status;
    }

    // Parse sort parameter
    const sortObj: Record<string, 1 | -1> = {};
    const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
    const sortOrder = sort.startsWith('-') ? -1 : 1;
    sortObj[sortField] = sortOrder;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const [entries, total] = await Promise.all([
      Entry.find(filter).select('-body').sort(sortObj).skip(skip).limit(limit).lean(),
      Entry.countDocuments(filter),
    ]);

    const pages = Math.ceil(total / limit);

    return NextResponse.json({
      entries: entries.map(transformEntryForList),
      total,
      page,
      pages,
    });
  } catch (error) {
    console.error('Error listing entries:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/entries
 * Create a new entry (authenticated only - enforced by middleware)
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<CreateEntryResponse | ErrorResponse>> {
  try {
    const body = await request.json();
    const {
      slug: providedSlug,
      categoryId,
      status = 'draft',
      frontmatter,
      body: entryBody,
    } = body as {
      slug?: string;
      categoryId: string;
      status?: 'draft' | 'published';
      frontmatter: EntryFrontmatter;
      body: string;
    };

    // Validate required fields
    if (!categoryId) {
      return NextResponse.json(
        { error: 'Category ID is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (!frontmatter || !frontmatter.title) {
      return NextResponse.json(
        { error: 'Frontmatter with title is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (frontmatter.title.length > 200) {
      return NextResponse.json(
        { error: 'Title cannot exceed 200 characters', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (!entryBody || typeof entryBody !== 'string') {
      return NextResponse.json(
        { error: 'Entry body is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Validate status
    if (status && !['draft', 'published'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be either draft or published', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Validate skillLevel if provided
    if (
      frontmatter.skillLevel !== undefined &&
      (frontmatter.skillLevel < 1 || frontmatter.skillLevel > 5)
    ) {
      return NextResponse.json(
        { error: 'Skill level must be between 1 and 5', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Validate category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return NextResponse.json(
        { error: 'Category does not exist', code: 'CATEGORY_NOT_FOUND' },
        { status: 400 }
      );
    }

    // Generate or validate slug
    let slug: string;
    if (providedSlug) {
      const normalizedSlug = providedSlug.toLowerCase().trim();
      // Validate slug format
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(normalizedSlug)) {
        return NextResponse.json(
          {
            error: 'Slug must contain only lowercase letters, numbers, and hyphens',
            code: 'VALIDATION_ERROR',
          },
          { status: 400 }
        );
      }
      // Check uniqueness
      const existingEntry = await Entry.findOne({ slug: normalizedSlug });
      if (existingEntry) {
        return NextResponse.json(
          { error: 'An entry with this slug already exists', code: 'DUPLICATE_SLUG' },
          { status: 409 }
        );
      }
      slug = normalizedSlug;
    } else {
      // Auto-generate unique slug from title
      const baseSlug = generateSlug(frontmatter.title);
      if (!baseSlug) {
        return NextResponse.json(
          { error: 'Could not generate a valid slug from the title', code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }
      slug = await generateUniqueSlug(baseSlug);
    }

    // Validate resources URLs if provided
    if (frontmatter.resources && Array.isArray(frontmatter.resources)) {
      for (const resource of frontmatter.resources) {
        if (!resource.title || !resource.linkUrl) {
          return NextResponse.json(
            { error: 'Each resource must have a title and linkUrl', code: 'VALIDATION_ERROR' },
            { status: 400 }
          );
        }
      }
    }

    // Create the entry with defaults
    const entry = new Entry({
      slug,
      categoryId,
      status,
      frontmatter: {
        title: frontmatter.title.trim(),
        topics: frontmatter.topics || [],
        tags: frontmatter.tags || [],
        languages: frontmatter.languages || [],
        skillLevel: frontmatter.skillLevel ?? 3,
        needsHelp: frontmatter.needsHelp ?? false,
        isPrivate: frontmatter.isPrivate ?? false,
        resources: frontmatter.resources || [],
        relatedEntries: frontmatter.relatedEntries || [],
      },
      body: entryBody,
    });

    await entry.save();

    // Sync to Pinecone if status is 'published'
    // Validates: Requirement 2.2 - Sync on publish
    if (entry.status === 'published' && isPineconeConfigured()) {
      try {
        const transformedEntry = transformEntry(entry.toObject());
        const pineconeId = await upsertEntryVector(transformedEntry);
        // Update the entry with the pineconeId
        entry.pineconeId = pineconeId;
        await entry.save();
      } catch (pineconeError) {
        // Log error but don't fail the request - entry is saved
        console.error('Failed to sync entry to Pinecone:', pineconeError);
      }
    }

    return NextResponse.json({ entry: transformEntry(entry.toObject()) }, { status: 201 });
  } catch (error) {
    console.error('Error creating entry:', error);

    // Handle MongoDB duplicate key error
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json(
        { error: 'An entry with this slug already exists', code: 'DUPLICATE_SLUG' },
        { status: 409 }
      );
    }

    // Handle category validation error from pre-save hook
    if (error instanceof Error && error.message.includes('Referenced category does not exist')) {
      return NextResponse.json(
        { error: 'Category does not exist', code: 'CATEGORY_NOT_FOUND' },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
