/**
 * Entry type definitions for the knowledgebase application
 * Defines the structure for knowledge articles with MDX content and metadata
 */

/**
 * External resource link associated with an entry
 */
export interface Resource {
  title: string;
  linkUrl: string;
}

/**
 * Entry frontmatter containing all metadata fields
 */
export interface EntryFrontmatter {
  title: string;
  topics: string[]; // e.g. ["bash", "search"] - freeform topic tags
  tags: string[]; // freeform tags
  languages: string[]; // e.g. ["javascript", "bash"]
  skillLevel: 1 | 2 | 3 | 4 | 5;
  needsHelp: boolean;
  isPrivate: boolean; // hidden from unauthenticated views
  resources: Resource[];
  relatedEntries: string[]; // ObjectId refs
}

/**
 * Main entry interface representing a knowledge article
 */
export interface IEntry {
  _id: string;
  slug: string; // unique, URL-safe
  categoryId: string; // Reference to Category collection
  status: 'draft' | 'published';
  frontmatter: EntryFrontmatter;
  body: string; // raw MDX (without frontmatter YAML)
  pineconeId?: string;
  sourceFile?: string; // migration provenance
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Entry creation request (without auto-generated fields)
 */
export interface CreateEntryInput {
  slug?: string; // Auto-generated if not provided
  categoryId: string; // Required - reference to Category
  status?: 'draft' | 'published'; // Defaults to 'draft'
  frontmatter: EntryFrontmatter;
  body: string;
}

/**
 * Entry update request (all fields optional)
 */
export interface UpdateEntryInput {
  slug?: string;
  categoryId?: string;
  status?: 'draft' | 'published';
  frontmatter?: Partial<EntryFrontmatter>;
  body?: string;
}
