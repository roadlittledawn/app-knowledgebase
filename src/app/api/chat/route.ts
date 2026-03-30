/**
 * Chat API Route with SSE Streaming
 *
 * Implements RAG-powered chat using Pinecone for context retrieval
 * and Claude for response generation.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 16.1, 16.3, 16.4
 */

import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { connectToDatabase } from '@/lib/db/connection';
import { Entry } from '@/lib/db/models/Entry';
import { searchPinecone } from '@/lib/search/pinecone';
import { getCategoryPath } from '@/lib/db/queries/categories';
import { verifyToken, getAuthCookieName } from '@/lib/auth';

// Set maxDuration for Vercel Fluid Compute (Requirement 16.3)
export const maxDuration = 300;

/**
 * Chat message interface
 */
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Source citation for RAG responses
 */
interface SourceCitation {
  id: string;
  title: string;
  slug: string;
  categoryPath: string;
}

/**
 * Approximate token count for text
 * Uses a simple heuristic of ~4 characters per token
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Truncate text to approximately the specified token limit
 * Requirement 7.3: Truncate context entries to ~1500 tokens
 */
function truncateToTokens(text: string, maxTokens: number): string {
  const estimatedChars = maxTokens * 4;
  if (text.length <= estimatedChars) {
    return text;
  }
  // Truncate and add ellipsis
  return text.slice(0, estimatedChars - 3) + '...';
}

/**
 * Build system prompt with RAG context
 */
function buildSystemPrompt(contextEntries: Array<{ title: string; body: string }>): string {
  const basePrompt = `You are a helpful AI assistant for a personal knowledgebase about software engineering and technical writing. 
Answer questions based on the knowledge articles provided as context. 
If the context doesn't contain relevant information, say so and provide general guidance.
Always cite your sources when referencing specific articles.
Be concise but thorough in your responses.`;

  if (contextEntries.length === 0) {
    return basePrompt + '\n\nNo relevant context articles were found for this query.';
  }

  const contextSection = contextEntries
    .map((entry, i) => `### Article ${i + 1}: ${entry.title}\n${entry.body}`)
    .join('\n\n');

  return `${basePrompt}

## Relevant Knowledge Articles

${contextSection}

---
Use the above articles as context to answer the user's question. Reference specific articles when applicable.`;
}

/**
 * POST /api/chat
 * Handles chat requests with SSE streaming
 *
 * Requirements:
 * - 7.1: Embed message and query Pinecone for top 5 similar entries
 * - 7.2: Fetch entry bodies from MongoDB
 * - 7.3: Truncate context entries to ~1500 tokens
 * - 7.4: Include last 10 conversation turns
 * - 7.5: Stream response tokens via SSE
 * - 7.6: Emit source citations on completion
 * - 7.7: Use Claude claude-opus-4-6 model
 * - 16.1: Stream responses using SSE format
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
    const messages: ChatMessage[] = body.messages || [];

    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: 'No messages provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get the latest user message for context retrieval
    const latestUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    if (!latestUserMessage) {
      return new Response(JSON.stringify({ error: 'No user message found' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Requirement 7.4: Include last 10 conversation turns
    const recentMessages = messages.slice(-10);

    // Connect to database
    await connectToDatabase();

    // Requirement 7.1: Query Pinecone for top 5 similar entries
    const pineconeResults = await searchPinecone({
      query: latestUserMessage.content,
      status: 'published',
      isPrivate: false,
      limit: 5,
    });

    // Requirement 7.2: Fetch entry bodies from MongoDB
    const entryIds = pineconeResults.map((r) => r.entryId);
    const entries = await Entry.find({ _id: { $in: entryIds } }).lean();

    // Build context entries with truncation (Requirement 7.3)
    const contextEntries: Array<{ title: string; body: string }> = [];
    const sources: SourceCitation[] = [];

    for (const result of pineconeResults) {
      const entry = entries.find((e) => e._id.toString() === result.entryId);
      if (entry) {
        // Truncate body to ~1500 tokens
        const truncatedBody = truncateToTokens(entry.body, 1500);
        contextEntries.push({
          title: entry.frontmatter.title,
          body: truncatedBody,
        });

        // Build source citation
        const categoryPath = await getCategoryPath(entry.categoryId.toString());
        sources.push({
          id: entry._id.toString(),
          title: entry.frontmatter.title,
          slug: entry.slug,
          categoryPath,
        });
      }
    }

    // Build system prompt with context
    const systemPrompt = buildSystemPrompt(contextEntries);

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
          // Requirement 7.7: Use Claude claude-opus-4-6 model
          // Requirement 7.5: Stream response tokens
          const messageStream = anthropic.messages.stream({
            model: 'claude-opus-4-6',
            max_tokens: 4096,
            system: systemPrompt,
            messages: recentMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          });

          // Stream tokens as SSE events
          for await (const event of messageStream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              const data = JSON.stringify({ delta: event.delta.text });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }

          // Requirement 7.6, 16.4: Emit done event with source citations
          const doneData = JSON.stringify({
            done: true,
            sources,
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

    // Return SSE response (Requirement 16.1)
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
