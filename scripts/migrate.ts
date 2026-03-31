#!/usr/bin/env npx tsx
/* eslint-disable no-console */
/**
 * Content Migration Script
 *
 * Migrates content from a flat-file MDX repository to MongoDB.
 * - Parses frontmatter using gray-matter
 * - Derives category hierarchy from directory paths
 * - Creates Category documents with proper parentId references
 * - Derives slugs from filename or frontmatter
 * - Applies default values for missing fields
 * - Checks existing slugs for idempotent re-runs
 * - Sets migrated entries to 'published' status
 * - Handles ai-agents directory with special topic tagging
 *
 * Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.10, 11.11
 *
 * Usage:
 *   npx tsx scripts/migrate.ts <source-directory>
 *
 * Environment variables required:
 *   MONGODB_URI - MongoDB connection string
 *   PINECONE_API_KEY - Pinecone API key (optional, for vector sync)
 */

import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import mongoose from 'mongoose';

// Load environment variables from .env.local
import { config } from 'dotenv';
config({ path: '.env.local' });

// Import database connection and models
import { connectToDatabase, disconnectFromDatabase } from '../src/lib/db/connection';
import { Category } from '../src/lib/db/models/Category';
import { Entry, type EntryDocument } from '../src/lib/db/models/Entry';
import { batchUpsertEntryVectors } from '../src/lib/pinecone/sync';
import { isPineconeConfigured } from '../src/lib/pinecone/client';
import type { IEntry, Resource } from '../src/types/entry';

/**
 * Parsed frontmatter from MDX files
 */
interface ParsedFrontmatter {
  title?: string;
  slug?: string;
  tags?: string[];
  languages?: string[];
  skillLevel?: number;
  needsHelp?: boolean;
  isPrivate?: boolean;
  resources?: Resource[];
  relatedEntries?: string[];
}

/**
 * Migration statistics
 */
interface MigrationStats {
  filesProcessed: number;
  entriesCreated: number;
  entriesSkipped: number;
  categoriesCreated: number;
  vectorsUpserted: number;
  errors: string[];
}

/**
 * Generate a URL-safe slug from a string
 */
function generateSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

/**
 * Get all MDX files recursively from a directory
 */
function getMdxFiles(dir: string, baseDir: string = dir): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...getMdxFiles(fullPath, baseDir));
    } else if (entry.isFile() && (entry.name.endsWith('.mdx') || entry.name.endsWith('.md'))) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Parse the relative directory path into category segments
 * Example: "software-engineering/ai/agents" -> ["software-engineering", "ai", "agents"]
 */
function parseCategoryPath(filePath: string, baseDir: string): string[] {
  const relativePath = path.relative(baseDir, path.dirname(filePath));

  if (!relativePath || relativePath === '.') {
    return [];
  }

  return relativePath.split(path.sep).filter(Boolean);
}

/**
 * Convert a directory segment to a display name
 * Example: "software-engineering" -> "Software Engineering"
 */
function segmentToDisplayName(segment: string): string {
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Create or get a category by its path segments
 * Creates parent categories as needed
 *
 * @param segments - Array of path segments from root to target category
 * @param categoryCache - Cache of existing categories by path
 * @returns The category ID
 */
async function getOrCreateCategory(
  segments: string[],
  categoryCache: Map<string, string>
): Promise<string> {
  if (segments.length === 0) {
    throw new Error('Cannot create category with empty path');
  }

  const fullPath = segments.join('/');

  // Check cache first
  if (categoryCache.has(fullPath)) {
    return categoryCache.get(fullPath)!;
  }

  // Get or create parent first (if any)
  let parentId: string | null = null;
  if (segments.length > 1) {
    const parentSegments = segments.slice(0, -1);
    parentId = await getOrCreateCategory(parentSegments, categoryCache);
  }

  const slug = segments[segments.length - 1]!;
  const name = segmentToDisplayName(slug);

  // Check if category already exists
  const existing = await Category.findOne({
    slug,
    parentId: parentId ? new mongoose.Types.ObjectId(parentId) : null,
  });

  if (existing) {
    categoryCache.set(fullPath, existing._id.toString());
    return existing._id.toString();
  }

  // Get the next order number for this parent
  const siblingCount = await Category.countDocuments({
    parentId: parentId ? new mongoose.Types.ObjectId(parentId) : null,
  });

  // Create new category
  const category = await Category.create({
    slug,
    name,
    parentId: parentId ? new mongoose.Types.ObjectId(parentId) : null,
    order: siblingCount,
  });

  categoryCache.set(fullPath, category._id.toString());
  console.log(`  Created category: ${fullPath}`);

  return category._id.toString();
}

/**
 * Apply default values for missing frontmatter fields
 * Validates: Requirement 11.5
 */
function applyDefaults(frontmatter: ParsedFrontmatter): ParsedFrontmatter {
  return {
    title: frontmatter.title || 'Untitled',
    slug: frontmatter.slug,
    tags: frontmatter.tags || [],
    languages: frontmatter.languages || [],
    skillLevel: frontmatter.skillLevel ?? 3,
    needsHelp: frontmatter.needsHelp ?? false,
    isPrivate: frontmatter.isPrivate ?? false,
    resources: frontmatter.resources || [],
    relatedEntries: frontmatter.relatedEntries || [],
  };
}

/**
 * Check if a path is within the ai-agents directory
 * Validates: Requirement 11.11
 */
function isAiAgentsPath(filePath: string, baseDir: string): boolean {
  const relativePath = path.relative(baseDir, filePath).toLowerCase();
  return relativePath.startsWith('ai-agents') || relativePath.includes('/ai-agents/');
}

/**
 * Migrate a single MDX file
 */
async function migrateFile(
  filePath: string,
  baseDir: string,
  categoryCache: Map<string, string>,
  stats: MigrationStats
): Promise<EntryDocument | null> {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const { data: rawFrontmatter, content: body } = matter(fileContent);

  // Apply defaults to frontmatter
  const frontmatter = applyDefaults(rawFrontmatter as ParsedFrontmatter);

  // Derive slug from frontmatter or filename
  // Validates: Requirement 11.4
  const filename = path.basename(filePath, path.extname(filePath));
  const slug = frontmatter.slug || generateSlug(filename);

  // Check for existing entry with same slug (idempotent re-runs)
  // Validates: Requirement 11.6
  const existingEntry = await Entry.findOne({ slug });
  if (existingEntry) {
    console.log(`  Skipping existing entry: ${slug}`);
    stats.entriesSkipped++;
    return null;
  }

  // Parse category path from directory structure
  // Validates: Requirement 11.2
  const categorySegments = parseCategoryPath(filePath, baseDir);

  // Handle ai-agents special case - add as a tag
  // Validates: Requirement 11.11
  let tags = [...(frontmatter.tags || [])];
  if (isAiAgentsPath(filePath, baseDir) && !tags.includes('ai-agents')) {
    tags = ['ai-agents', ...tags];
  }

  // Get or create category
  // Validates: Requirement 11.3
  let categoryId: string;
  if (categorySegments.length > 0) {
    categoryId = await getOrCreateCategory(categorySegments, categoryCache);
  } else {
    // Create a default "uncategorized" category for root-level files
    categoryId = await getOrCreateCategory(['uncategorized'], categoryCache);
  }

  // Validate skill level
  let skillLevel = frontmatter.skillLevel ?? 3;
  if (skillLevel < 1 || skillLevel > 5) {
    skillLevel = 3;
  }

  // Create entry document
  // Validates: Requirements 11.7, 11.10
  const entry = await Entry.create({
    slug,
    categoryId: new mongoose.Types.ObjectId(categoryId),
    status: 'published', // Requirement 11.10: Set migrated entries to 'published'
    frontmatter: {
      title: frontmatter.title || 'Untitled',
      tags,
      languages: frontmatter.languages || [],
      skillLevel: skillLevel as 1 | 2 | 3 | 4 | 5,
      needsHelp: frontmatter.needsHelp ?? false,
      isPrivate: frontmatter.isPrivate ?? false,
      resources: frontmatter.resources || [],
      relatedEntries: [], // Will be resolved in a second pass if needed
    },
    body,
    sourceFile: path.relative(baseDir, filePath),
  });

  console.log(`  Created entry: ${slug}`);
  stats.entriesCreated++;

  return entry;
}

/**
 * Sync entry vectors to Pinecone
 * Validates: Requirements 11.8, 11.9
 */
async function syncVectorsToPinecone(
  entries: EntryDocument[],
  stats: MigrationStats
): Promise<void> {
  if (!isPineconeConfigured()) {
    console.log('\nPinecone is not configured, skipping vector sync');
    return;
  }

  console.log('\nSyncing vectors to Pinecone...');

  // Convert Mongoose documents to IEntry format for the sync function
  const entriesToSync: IEntry[] = entries.map((entry) => ({
    _id: entry._id.toString(),
    slug: entry.slug,
    categoryId: entry.categoryId.toString(),
    status: entry.status,
    frontmatter: {
      title: entry.frontmatter.title,
      tags: entry.frontmatter.tags,
      languages: entry.frontmatter.languages,
      skillLevel: entry.frontmatter.skillLevel as 1 | 2 | 3 | 4 | 5,
      needsHelp: entry.frontmatter.needsHelp,
      isPrivate: entry.frontmatter.isPrivate,
      resources: entry.frontmatter.resources,
      relatedEntries: entry.frontmatter.relatedEntries.map((id) => id.toString()),
    },
    body: entry.body,
    pineconeId: entry.pineconeId,
    sourceFile: entry.sourceFile,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  }));

  try {
    const vectorIds = await batchUpsertEntryVectors(entriesToSync);
    stats.vectorsUpserted = vectorIds.length;

    // Update entries with their Pinecone IDs
    // Validates: Requirement 11.9
    for (const entry of entries) {
      await Entry.findByIdAndUpdate(entry._id, {
        pineconeId: entry._id.toString(),
      });
    }

    console.log(`  Upserted ${vectorIds.length} vectors to Pinecone`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`  Error syncing vectors: ${errorMessage}`);
    stats.errors.push(`Pinecone sync error: ${errorMessage}`);
  }
}

/**
 * Main migration function
 */
async function migrate(sourceDir: string): Promise<void> {
  console.log(`\nStarting migration from: ${sourceDir}\n`);

  const stats: MigrationStats = {
    filesProcessed: 0,
    entriesCreated: 0,
    entriesSkipped: 0,
    categoriesCreated: 0,
    vectorsUpserted: 0,
    errors: [],
  };

  // Validate source directory
  if (!fs.existsSync(sourceDir)) {
    console.error(`Error: Source directory does not exist: ${sourceDir}`);
    process.exit(1);
  }

  // Connect to database
  console.log('Connecting to MongoDB...');
  await connectToDatabase();
  console.log('Connected to MongoDB\n');

  // Get all MDX files
  const mdxFiles = getMdxFiles(sourceDir);
  console.log(`Found ${mdxFiles.length} MDX files to process\n`);

  if (mdxFiles.length === 0) {
    console.log('No MDX files found. Exiting.');
    await disconnectFromDatabase();
    return;
  }

  // Category cache to avoid duplicate lookups
  const categoryCache = new Map<string, string>();

  // Track created entries for Pinecone sync
  const createdEntries: EntryDocument[] = [];

  // Process each file
  console.log('Processing files...');
  for (const filePath of mdxFiles) {
    stats.filesProcessed++;
    const relativePath = path.relative(sourceDir, filePath);
    console.log(`\n[${stats.filesProcessed}/${mdxFiles.length}] ${relativePath}`);

    try {
      const entry = await migrateFile(filePath, sourceDir, categoryCache, stats);
      if (entry) {
        createdEntries.push(entry);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`  Error: ${errorMessage}`);
      stats.errors.push(`${relativePath}: ${errorMessage}`);
    }
  }

  // Count categories created
  stats.categoriesCreated = categoryCache.size;

  // Sync vectors to Pinecone
  if (createdEntries.length > 0) {
    await syncVectorsToPinecone(createdEntries, stats);
  }

  // Disconnect from database
  await disconnectFromDatabase();

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('Migration Summary');
  console.log('='.repeat(50));
  console.log(`Files processed:    ${stats.filesProcessed}`);
  console.log(`Entries created:    ${stats.entriesCreated}`);
  console.log(`Entries skipped:    ${stats.entriesSkipped}`);
  console.log(`Categories created: ${stats.categoriesCreated}`);
  console.log(`Vectors upserted:   ${stats.vectorsUpserted}`);

  if (stats.errors.length > 0) {
    console.log(`\nErrors (${stats.errors.length}):`);
    for (const error of stats.errors) {
      console.log(`  - ${error}`);
    }
  }

  console.log('\nMigration complete!');
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage: npx tsx scripts/migrate.ts <source-directory>');
  console.log('\nExample:');
  console.log('  npx tsx scripts/migrate.ts ./content');
  console.log('  npx tsx scripts/migrate.ts ../my-mdx-repo/docs');
  process.exit(1);
}

const sourceDir = path.resolve(args[0]!);

// Run migration
migrate(sourceDir).catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
