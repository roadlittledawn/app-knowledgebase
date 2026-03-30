/**
 * Frontmatter serialization utilities
 * Handles conversion between EntryFrontmatter objects and YAML strings
 *
 * Requirements:
 * - 6.8: WHEN saving an entry, THE MDX_Editor SHALL serialize frontmatter to YAML and prepend to the body
 */

import { stringify, parse } from 'yaml';
import type { EntryFrontmatter, Resource } from '@/types/entry';

/**
 * Serialize frontmatter object to YAML string
 * @param frontmatter - The frontmatter object to serialize
 * @returns YAML string representation of the frontmatter
 */
export function serializeFrontmatter(frontmatter: EntryFrontmatter): string {
  // Create a clean object for serialization, preserving field order
  const yamlObj: Record<string, unknown> = {
    title: frontmatter.title,
    topics: frontmatter.topics,
    tags: frontmatter.tags,
    languages: frontmatter.languages,
    skillLevel: frontmatter.skillLevel,
    needsHelp: frontmatter.needsHelp,
    isPrivate: frontmatter.isPrivate,
  };

  // Only include resources if non-empty
  if (frontmatter.resources && frontmatter.resources.length > 0) {
    yamlObj.resources = frontmatter.resources;
  }

  // Only include relatedEntries if non-empty
  if (frontmatter.relatedEntries && frontmatter.relatedEntries.length > 0) {
    yamlObj.relatedEntries = frontmatter.relatedEntries;
  }

  return stringify(yamlObj, {
    indent: 2,
    lineWidth: 0, // Disable line wrapping
  });
}

/**
 * Parse YAML string back to frontmatter object
 * @param yaml - The YAML string to parse
 * @returns Parsed EntryFrontmatter object
 */
export function parseFrontmatter(yaml: string): EntryFrontmatter {
  const parsed = parse(yaml) as Record<string, unknown>;

  return {
    title: (parsed.title as string) || '',
    topics: (parsed.topics as string[]) || [],
    tags: (parsed.tags as string[]) || [],
    languages: (parsed.languages as string[]) || [],
    skillLevel: (parsed.skillLevel as 1 | 2 | 3 | 4 | 5) || 3,
    needsHelp: (parsed.needsHelp as boolean) ?? false,
    isPrivate: (parsed.isPrivate as boolean) ?? false,
    resources: (parsed.resources as Resource[]) || [],
    relatedEntries: (parsed.relatedEntries as string[]) || [],
  };
}

/**
 * Create a full MDX document with frontmatter prepended
 * @param frontmatter - The frontmatter object
 * @param body - The MDX body content
 * @returns Full MDX document with YAML frontmatter wrapped in ---
 */
export function createMDXDocument(frontmatter: EntryFrontmatter, body: string): string {
  const yamlContent = serializeFrontmatter(frontmatter);
  return `---\n${yamlContent}---\n\n${body}`;
}

/**
 * Extract frontmatter and body from a full MDX document
 * @param mdx - The full MDX document with frontmatter
 * @returns Object containing parsed frontmatter and body
 */
export function extractFrontmatter(mdx: string): { frontmatter: EntryFrontmatter; body: string } {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n\n?([\s\S]*)$/;
  const match = mdx.match(frontmatterRegex);

  if (!match) {
    // No frontmatter found, return defaults with full content as body
    return {
      frontmatter: {
        title: '',
        topics: [],
        tags: [],
        languages: [],
        skillLevel: 3,
        needsHelp: false,
        isPrivate: false,
        resources: [],
        relatedEntries: [],
      },
      body: mdx,
    };
  }

  const [, yamlContent, body] = match;
  return {
    frontmatter: parseFrontmatter(yamlContent),
    body: body || '',
  };
}
