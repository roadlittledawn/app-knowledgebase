/**
 * Entry Mongoose model
 * Represents knowledge articles with MDX content and metadata
 */

import mongoose, { Schema, Model, Types } from 'mongoose';
import type { Resource } from '@/types/entry';

/**
 * Entry frontmatter document interface
 */
export interface EntryFrontmatterDocument {
  title: string;
  tags: string[];
  languages: string[];
  skillLevel: number;
  needsHelp: boolean;
  isPrivate: boolean;
  resources: Resource[];
  relatedEntries: Types.ObjectId[];
}

/**
 * Entry document interface for Mongoose
 */
export interface EntryDocument {
  _id: Types.ObjectId;
  slug: string;
  categoryId: Types.ObjectId;
  status: 'draft' | 'published';
  frontmatter: EntryFrontmatterDocument;
  body: string;
  pineconeId?: string;
  sourceFile?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Static methods interface for Entry model
 */
export interface EntryModel extends Model<EntryDocument> {
  findBySlug(slug: string): Promise<EntryDocument | null>;
}

/**
 * Resource sub-schema for external links
 */
const ResourceSchema = new Schema<Resource>(
  {
    title: {
      type: String,
      required: [true, 'Resource title is required'],
      trim: true,
    },
    linkUrl: {
      type: String,
      required: [true, 'Resource URL is required'],
      trim: true,
    },
  },
  { _id: false }
);

/**
 * Frontmatter sub-schema for entry metadata
 */
const FrontmatterSchema = new Schema<EntryFrontmatterDocument>(
  {
    title: {
      type: String,
      required: [true, 'Entry title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    languages: {
      type: [String],
      default: [],
      index: true,
    },
    skillLevel: {
      type: Number,
      min: [1, 'Skill level must be between 1 and 5'],
      max: [5, 'Skill level must be between 1 and 5'],
      default: 3,
    },
    needsHelp: {
      type: Boolean,
      default: false,
    },
    isPrivate: {
      type: Boolean,
      default: false,
      index: true,
    },
    resources: {
      type: [ResourceSchema],
      default: [],
    },
    relatedEntries: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Entry',
      },
    ],
  },
  { _id: false }
);

/**
 * Entry schema definition
 */
const EntrySchema = new Schema<EntryDocument, EntryModel>(
  {
    slug: {
      type: String,
      required: [true, 'Entry slug is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ['draft', 'published'],
        message: 'Status must be either draft or published',
      },
      default: 'draft',
      index: true,
    },
    frontmatter: {
      type: FrontmatterSchema,
      required: [true, 'Frontmatter is required'],
    },
    body: {
      type: String,
      required: [true, 'Entry body is required'],
    },
    pineconeId: {
      type: String,
      sparse: true,
    },
    sourceFile: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Indexes for efficient querying
 * - Unique index on slug field (defined inline above)
 * - Index on categoryId for category filtering
 * - Index on frontmatter.tags for tag filtering
 * - Index on frontmatter.languages for language filtering
 * - Index on status for draft/published filtering
 * - Index on frontmatter.isPrivate for public-only queries
 */

// Additional compound indexes for common query patterns
EntrySchema.index({ status: 1, 'frontmatter.isPrivate': 1 });
EntrySchema.index({ categoryId: 1, status: 1 });

/**
 * Static method to find entry by slug
 */
EntrySchema.statics.findBySlug = async function (slug: string): Promise<EntryDocument | null> {
  return this.findOne({ slug: slug.toLowerCase() });
};

/**
 * Pre-save middleware to validate category exists
 */
EntrySchema.pre('save', async function () {
  if (this.isModified('categoryId')) {
    const CategoryModel = mongoose.model('Category');
    const category = await CategoryModel.findById(this.categoryId);
    if (!category) {
      throw new Error('Referenced category does not exist');
    }
  }
});

/**
 * Export Entry model
 * Uses existing model if already compiled (for hot reloading in development)
 */
export const Entry: EntryModel =
  (mongoose.models.Entry as EntryModel) ||
  mongoose.model<EntryDocument, EntryModel>('Entry', EntrySchema);

export default Entry;
