/**
 * Type definitions barrel export
 */

// Entry types
export type {
  Resource,
  EntryFrontmatter,
  IEntry,
  CreateEntryInput,
  UpdateEntryInput,
} from './entry';

// Category types
export type {
  ICategory,
  CategoryTreeNode,
  CreateCategoryInput,
  UpdateCategoryInput,
} from './category';

// Writing config types
export type {
  WritingSkill,
  WritingTemplate,
  AgentPersona,
  WritingConfig,
  GetWritingConfigResponse,
  UpdateWritingConfigRequest,
  UpdateWritingConfigResponse,
} from './writing-config';

// Image types
export type { IImage, CreateImageInput, UpdateImageInput } from './image';
