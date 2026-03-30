/**
 * WritingConfig Mongoose model
 * Singleton document for AI writing agent configuration
 *
 * Requirements: 9.2, 9.8
 * - 9.2: THE System SHALL store Writing_Config as a singleton document (upserted, never more than one)
 * - 9.8: THE Writing_Agent SHALL reload Writing_Config from the database on each invocation
 */

import mongoose, { Schema, Model, Types } from 'mongoose';
import type { EntryFrontmatter } from '@/types/entry';

/**
 * Writing skill document interface
 */
export interface WritingSkillDocument {
  id: string;
  name: string;
  description: string;
  prompt: string;
}

/**
 * Writing template document interface
 */
export interface WritingTemplateDocument {
  id: string;
  name: string;
  description: string;
  body: string;
  frontmatter: Partial<EntryFrontmatter>;
}

/**
 * Agent persona document interface
 */
export interface AgentPersonaDocument {
  role: 'researcher' | 'writer' | 'reviewer';
  systemPrompt: string;
  enabled: boolean;
}

/**
 * WritingConfig document interface for Mongoose
 */
export interface WritingConfigDocument {
  _id: Types.ObjectId;
  baseSystemPrompt: string;
  styleGuide: string;
  skills: WritingSkillDocument[];
  templates: WritingTemplateDocument[];
  agents: AgentPersonaDocument[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Static methods interface for WritingConfig model
 */
export interface WritingConfigModel extends Model<WritingConfigDocument> {
  getConfig(): Promise<WritingConfigDocument>;
}

/**
 * Writing skill sub-schema
 */
const WritingSkillSchema = new Schema<WritingSkillDocument>(
  {
    id: {
      type: String,
      required: [true, 'Skill ID is required'],
    },
    name: {
      type: String,
      required: [true, 'Skill name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    prompt: {
      type: String,
      required: [true, 'Skill prompt is required'],
    },
  },
  { _id: false }
);

/**
 * Writing template sub-schema
 */
const WritingTemplateSchema = new Schema<WritingTemplateDocument>(
  {
    id: {
      type: String,
      required: [true, 'Template ID is required'],
    },
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    body: {
      type: String,
      default: '',
    },
    frontmatter: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false }
);

/**
 * Agent persona sub-schema
 */
const AgentPersonaSchema = new Schema<AgentPersonaDocument>(
  {
    role: {
      type: String,
      enum: {
        values: ['researcher', 'writer', 'reviewer'],
        message: 'Role must be researcher, writer, or reviewer',
      },
      required: [true, 'Agent role is required'],
    },
    systemPrompt: {
      type: String,
      default: '',
    },
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

/**
 * WritingConfig schema definition
 */
const WritingConfigSchema = new Schema<WritingConfigDocument, WritingConfigModel>(
  {
    baseSystemPrompt: {
      type: String,
      default: '',
    },
    styleGuide: {
      type: String,
      default: '',
    },
    skills: {
      type: [WritingSkillSchema],
      default: [],
    },
    templates: {
      type: [WritingTemplateSchema],
      default: [],
    },
    agents: {
      type: [AgentPersonaSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Singleton pattern: always upsert, never create multiple
 * Requirement 9.2: THE System SHALL store Writing_Config as a singleton document
 * Requirement 9.8: THE Writing_Agent SHALL reload Writing_Config from the database on each invocation
 */
WritingConfigSchema.statics.getConfig = async function (): Promise<WritingConfigDocument> {
  let config = await this.findOne();
  if (!config) {
    config = await this.create({});
  }
  return config;
};

/**
 * Export WritingConfig model
 * Uses existing model if already compiled (for hot reloading in development)
 */
export const WritingConfig: WritingConfigModel =
  (mongoose.models.WritingConfig as WritingConfigModel) ||
  mongoose.model<WritingConfigDocument, WritingConfigModel>('WritingConfig', WritingConfigSchema);

export default WritingConfig;
