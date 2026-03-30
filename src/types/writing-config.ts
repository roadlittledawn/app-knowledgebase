/**
 * Writing configuration type definitions
 * Defines the structure for AI writing agent configuration
 *
 * Requirements: 9.2, 9.8
 */

import type { EntryFrontmatter } from './entry';

/**
 * Writing skill definition for AI assistance
 */
export interface WritingSkill {
  id: string;
  name: string; // shown in editor panel button
  description: string; // tooltip / admin label
  prompt: string; // injected into agent context
}

/**
 * Writing template for new entries
 */
export interface WritingTemplate {
  id: string;
  name: string;
  description: string;
  body: string; // MDX template body
  frontmatter: Partial<EntryFrontmatter>; // pre-fills form
}

/**
 * Agent persona configuration
 */
export interface AgentPersona {
  role: 'researcher' | 'writer' | 'reviewer';
  systemPrompt: string;
  enabled: boolean;
}

/**
 * Main writing configuration interface
 * Stored as a singleton document (upserted, never more than one)
 */
export interface WritingConfig {
  _id: string;
  baseSystemPrompt: string;
  styleGuide: string; // markdown
  skills: WritingSkill[];
  templates: WritingTemplate[];
  agents: AgentPersona[];
  updatedAt: Date;
}

/**
 * API response for GET /api/admin/writing-config
 */
export interface GetWritingConfigResponse {
  config: WritingConfig;
}

/**
 * API request for PUT /api/admin/writing-config
 */
export interface UpdateWritingConfigRequest {
  config: Partial<WritingConfig>;
}

/**
 * API response for PUT /api/admin/writing-config
 */
export interface UpdateWritingConfigResponse {
  config: WritingConfig;
}
