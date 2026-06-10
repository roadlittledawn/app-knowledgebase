/**
 * Writing Agent API Route with SSE Streaming
 *
 * Implements AI writing assistance with configurable personas (researcher, writer, reviewer).
 * Loads WritingConfig on each invocation and streams responses via SSE.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.12, 16.2, 16.3, 16.4
 */

import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { connectToDatabase } from '@/lib/db/connection';
import { WritingConfig } from '@/lib/db/models/WritingConfig';
import { searchPinecone } from '@/lib/search/pinecone';
import { verifyToken, getAuthCookieName } from '@/lib/auth';
import { fetchDDSComponentDocs } from '@/lib/dds/fetchComponentDocs';
import type { EntryFrontmatter } from '@/types/entry';

// Requirement 16.3: Set maxDuration to 300 seconds for Vercel Fluid Compute
export const maxDuration = 300;

/**
 * Writing agent action types
 */
type WritingAction =
  | 'review'
  | 'improve'
  | 'expand'
  | 'reformat'
  | 'custom'
  | 'suggest-title'
  | 'suggest-tags'
  | 'research'
  | 'draft'
  | 'qa-review';

/**
 * Writing agent persona types
 * Requirement 8.1: Support three personas: researcher, writer, and reviewer
 */
type WritingPersona = 'researcher' | 'writer' | 'reviewer';

/**
 * Writing agent request interface
 */
interface WritingAgentRequest {
  action: WritingAction;
  persona?: WritingPersona;
  body: string;
  frontmatter: EntryFrontmatter;
  selection?: string;
  context?: string;
  /** Free-form user instruction for the 'custom' action and an optional add-on for 'reformat' */
  customPrompt?: string;
}

/**
 * Artifact type for completed streams
 */
type ArtifactType = 'research-report' | 'draft' | 'qa-findings';

/**
 * Map actions to their default personas and artifact types
 */
function getActionConfig(action: WritingAction): {
  defaultPersona: WritingPersona;
  artifactType?: ArtifactType;
} {
  switch (action) {
    case 'research':
      return { defaultPersona: 'researcher', artifactType: 'research-report' };
    case 'draft':
      return { defaultPersona: 'writer', artifactType: 'draft' };
    case 'qa-review':
      return { defaultPersona: 'reviewer', artifactType: 'qa-findings' };
    case 'review':
    case 'improve':
    case 'expand':
    case 'reformat':
    case 'custom':
      return { defaultPersona: 'writer' };
    case 'suggest-title':
    case 'suggest-tags':
      return { defaultPersona: 'writer' };
    default:
      return { defaultPersona: 'writer' };
  }
}

/**
 * Build action-specific instructions for the prompt
 */
function getActionInstructions(
  action: WritingAction,
  selection?: string,
  customPrompt?: string
): string {
  const selectionContext = selection
    ? `\n\nThe user has selected the following text for you to focus on:\n<selection>\n${selection}\n</selection>`
    : '';

  const customInstruction = customPrompt?.trim()
    ? `\n\nAdditional instructions from the user:\n<instructions>\n${customPrompt.trim()}\n</instructions>`
    : '';

  // For actions whose output replaces the editor body, the model must emit only the
  // raw MDX body — no commentary, no surrounding code fences.
  const rawMdxOnly =
    `\n\nOutput ONLY the resulting MDX body, ready to be saved directly as the entry content. ` +
    `Do not include any explanation, preamble, or wrapping code fences.`;

  switch (action) {
    case 'review':
      return `Review the content for clarity, accuracy, and completeness. Provide specific feedback and suggestions for improvement.${selectionContext}`;
    case 'improve':
      return `Improve the content by enhancing clarity, fixing issues, and making it more engaging while preserving the original meaning.${selectionContext}`;
    case 'expand':
      return `Expand the content with additional details, examples, and explanations while maintaining consistency with the existing style.${selectionContext}`;
    case 'reformat':
      return (
        `Reformat the entry content to make better use of the docs-design-system-react (DDS) ` +
        `component library for improved structure, layout, and readability. Preserve all of the ` +
        `original information and meaning — do not add new facts or remove substance. Convert ` +
        `appropriate plain-markdown sections into suitable DDS components (callouts, tabs, ` +
        `collapsers, tables, etc.) where they genuinely improve clarity, and leave simple content ` +
        `as-is. ${selection ? 'Reformat only the selected text.' : 'Reformat the entire body.'}` +
        `${selectionContext}${customInstruction}${rawMdxOnly}`
      );
    case 'custom':
      return (
        `Follow the user's instructions below to transform the entry content. ` +
        `${selection ? 'Apply them to the selected text.' : 'Apply them to the entire body.'}` +
        `${selectionContext}${customInstruction}${rawMdxOnly}`
      );
    case 'suggest-title':
      return `Suggest 3-5 compelling titles for this content. Each title should be concise, descriptive, and engaging.${selectionContext}`;
    case 'suggest-tags':
      return `Suggest relevant tags for this content. Provide tags that accurately categorize the topics, technologies, and concepts covered.${selectionContext}`;
    case 'research':
      return `Research and gather information related to this topic. Provide a comprehensive research report with key findings, relevant concepts, and useful references.${selectionContext}`;
    case 'draft':
      return `Draft new content based on the provided context and frontmatter. Create well-structured, informative content that matches the style guide.${selectionContext}`;
    case 'qa-review':
      return `Perform a quality assurance review of this content. Check for technical accuracy, completeness, consistency, and adherence to best practices. Report any issues found.${selectionContext}`;
    default:
      return `Assist with the content as requested.${selectionContext}`;
  }
}

/**
 * Build the system prompt with persona, style guide, and context
 * Requirements: 8.3, 8.4, 8.6, 8.7
 */
function buildSystemPrompt(
  baseSystemPrompt: string,
  personaPrompt: string | null,
  styleGuide: string,
  skillPrompt: string | null,
  componentDocs: string | null,
  action: WritingAction,
  selection?: string,
  customPrompt?: string
): string {
  const parts: string[] = [];

  // Requirement 8.3, 8.4: Use persona prompt or fall back to base
  if (personaPrompt) {
    parts.push(personaPrompt);
  } else if (baseSystemPrompt) {
    parts.push(baseSystemPrompt);
  } else {
    parts.push(
      'You are an AI writing assistant for a technical knowledgebase. Help users create, improve, and review technical documentation.'
    );
  }

  // Requirement 8.6: Inject style guide
  if (styleGuide) {
    parts.push(`\n## Style Guide\n\nFollow these style guidelines:\n\n${styleGuide}`);
  }

  // Requirement 8.7: Inject skill prompt if specified
  if (skillPrompt) {
    parts.push(`\n## Skill Instructions\n\n${skillPrompt}`);
  }

  if (componentDocs) {
    parts.push(
      `\n## Component Library\n\n` +
        `Content is rendered as MDX using @roadlittledawn/docs-design-system-react.\n` +
        `Components are globally available in MDX bodies — no import statements needed.\n` +
        `Prefer DDS components over plain markdown equivalents where they improve clarity.\n` +
        `Do not force-fit components for simple inline content. No hardcoded hex or Tailwind classes.\n\n` +
        `${componentDocs}`
    );
  }

  // Add action-specific instructions (Requirement 8.12 for selection context)
  parts.push(`\n## Task\n\n${getActionInstructions(action, selection, customPrompt)}`);

  return parts.join('\n\n');
}

/**
 * Build user message with entry content and context
 */
function buildUserMessage(
  body: string,
  frontmatter: EntryFrontmatter,
  similarEntries: Array<{ title: string; body: string }>,
  additionalContext?: string
): string {
  const parts: string[] = [];

  // Entry metadata
  parts.push(`## Current Entry\n\nTitle: ${frontmatter.title}`);
  if (frontmatter.tags.length > 0) {
    parts.push(`Tags: ${frontmatter.tags.join(', ')}`);
  }
  if (frontmatter.languages.length > 0) {
    parts.push(`Languages: ${frontmatter.languages.join(', ')}`);
  }
  parts.push(`Skill Level: ${frontmatter.skillLevel}/5`);

  // Entry body
  parts.push(`\n## Content\n\n${body}`);

  // Requirement 8.5: Include similar entries as reference examples
  if (similarEntries.length > 0) {
    parts.push(
      '\n## Reference Examples\n\nHere are similar entries from the knowledgebase for reference:'
    );
    similarEntries.forEach((entry, i) => {
      parts.push(`\n### Example ${i + 1}: ${entry.title}\n\n${entry.body}`);
    });
  }

  // Additional context
  if (additionalContext) {
    parts.push(`\n## Additional Context\n\n${additionalContext}`);
  }

  return parts.join('\n');
}

/**
 * Truncate text to approximately the specified token limit
 * Uses a simple heuristic of ~4 characters per token
 */
function truncateToTokens(text: string, maxTokens: number): string {
  const estimatedChars = maxTokens * 4;
  if (text.length <= estimatedChars) {
    return text;
  }
  return text.slice(0, estimatedChars - 3) + '...';
}

/**
 * POST /api/ai/writing-agent
 * Handles writing agent requests with SSE streaming
 *
 * Requirements:
 * - 8.1: Support three personas: researcher, writer, and reviewer
 * - 8.2: Load WritingConfig from the database on each invocation
 * - 8.3: Select the AgentPersona system prompt matching the requested role
 * - 8.4: Fall back to baseSystemPrompt if no matching persona
 * - 8.5: Query Pinecone for top 3 similar entries as reference examples
 * - 8.6: Inject styleGuide from WritingConfig into prompt context
 * - 8.7: Inject skill prompt into context when specified
 * - 8.8: Stream response tokens via SSE
 * - 8.12: Use text selection as context for suggestions
 * - 16.2: Stream responses using SSE format
 * - 16.3: maxDuration set to 300 seconds (see export above)
 * - 16.4: Emit done event with metadata on completion
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const cookieName = getAuthCookieName();
    const token = request.cookies.get(cookieName)?.value;

    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body = await request.json();
    const {
      action,
      persona,
      body: entryBody,
      frontmatter,
      selection,
      context: additionalContext,
      customPrompt,
    } = body as WritingAgentRequest;

    // Validate required fields
    if (!action) {
      return new Response(JSON.stringify({ error: 'Action is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // The custom action is driven entirely by the user's prompt
    if (action === 'custom' && !customPrompt?.trim()) {
      return new Response(JSON.stringify({ error: 'A custom prompt is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!entryBody && !selection) {
      return new Response(JSON.stringify({ error: 'Body or selection is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!frontmatter) {
      return new Response(JSON.stringify({ error: 'Frontmatter is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Connect to database
    await connectToDatabase();

    // Requirement 8.2: Load WritingConfig on each invocation
    const writingConfig = await WritingConfig.getConfig();

    // Determine persona to use
    const actionConfig = getActionConfig(action);
    const effectivePersona = persona || actionConfig.defaultPersona;

    // Requirement 8.3, 8.4: Select persona system prompt or fall back to base
    const personaConfig = writingConfig.agents.find(
      (agent) => agent.role === effectivePersona && agent.enabled
    );
    const personaPrompt = personaConfig?.systemPrompt || null;

    // Requirement 8.5: Query Pinecone for top 3 similar entries
    const searchQuery = selection || frontmatter.title || entryBody.slice(0, 500);
    const pineconeResults = await searchPinecone({
      query: searchQuery,
      status: 'published',
      limit: 3,
    });

    // Fetch similar entry bodies (simplified - in production would fetch from MongoDB)
    const similarEntries: Array<{ title: string; body: string }> = pineconeResults.map(
      (result) => ({
        title: result.metadata.title,
        body: truncateToTokens(`[Content from: ${result.metadata.title}]`, 500),
      })
    );

    // Fetch DDS component docs for prompt injection
    const componentDocs = await fetchDDSComponentDocs();

    // Build system prompt with all context
    // Requirements 8.3, 8.4, 8.6, 8.7, 8.12
    const systemPrompt = buildSystemPrompt(
      writingConfig.baseSystemPrompt,
      personaPrompt,
      writingConfig.styleGuide,
      null, // Skill prompt would be passed from request if specified
      componentDocs,
      action,
      selection,
      customPrompt
    );

    // Build user message
    const userMessage = buildUserMessage(
      entryBody || '',
      frontmatter,
      similarEntries,
      additionalContext
    );

    // Check for Anthropic API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Anthropic API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({ apiKey });

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Requirement 8.8, 16.2: Stream response tokens via SSE
          const messageStream = anthropic.messages.stream({
            model: 'claude-opus-4-6',
            max_tokens: 4096,
            system: systemPrompt,
            messages: [
              {
                role: 'user',
                content: userMessage,
              },
            ],
          });

          // Stream tokens as SSE events
          for await (const event of messageStream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              const data = JSON.stringify({ delta: event.delta.text });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }

          // Requirement 16.4: Emit done event with metadata on completion
          const doneData = JSON.stringify({
            done: true,
            artifactType: actionConfig.artifactType,
          });
          controller.enqueue(encoder.encode(`data: ${doneData}\n\n`));
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          const errorData = JSON.stringify({
            error: 'Stream error occurred',
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    // Return SSE response (Requirement 16.2)
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Writing Agent API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
