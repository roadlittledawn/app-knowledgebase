/**
 * Writing Config Admin API Route
 *
 * Provides GET and PUT endpoints for managing the singleton WritingConfig document.
 *
 * Requirements: 9.2, 9.8
 * - 9.2: THE System SHALL store Writing_Config as a singleton document (upserted, never more than one)
 * - 9.8: THE Writing_Agent SHALL reload Writing_Config from the database on each invocation
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/connection';
import { WritingConfig } from '@/lib/db/models/WritingConfig';
import { isAuthenticated } from '@/lib/auth';
import type {
  GetWritingConfigResponse,
  UpdateWritingConfigRequest,
  UpdateWritingConfigResponse,
} from '@/types/writing-config';

/**
 * GET /api/admin/writing-config
 *
 * Retrieves the singleton WritingConfig document.
 * Creates a default config if none exists.
 */
export async function GET(
  _request: NextRequest
): Promise<NextResponse<GetWritingConfigResponse | { error: string }>> {
  try {
    // Check authentication
    if (!(await isAuthenticated())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database
    await connectToDatabase();

    // Get or create singleton config
    const config = await WritingConfig.getConfig();

    return NextResponse.json({
      config: {
        _id: config._id.toString(),
        baseSystemPrompt: config.baseSystemPrompt,
        styleGuide: config.styleGuide,
        skills: config.skills,
        templates: config.templates,
        agents: config.agents,
        updatedAt: config.updatedAt,
      },
    });
  } catch (error) {
    console.error('GET /api/admin/writing-config error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/writing-config
 *
 * Updates the singleton WritingConfig document.
 * Uses upsert to ensure only one document exists.
 */
export async function PUT(
  request: NextRequest
): Promise<NextResponse<UpdateWritingConfigResponse | { error: string }>> {
  try {
    // Check authentication
    if (!(await isAuthenticated())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body: UpdateWritingConfigRequest = await request.json();

    if (!body.config) {
      return NextResponse.json({ error: 'Missing config in request body' }, { status: 400 });
    }

    // Connect to database
    await connectToDatabase();

    // Build update object, excluding _id
    const { _id: _unusedId, ...updateData } = body.config as Record<string, unknown>;
    void _unusedId; // Intentionally excluded from update

    // Upsert the singleton config (Requirement 9.2)
    const config = await WritingConfig.findOneAndUpdate(
      {}, // Empty filter matches the singleton document
      { $set: updateData },
      {
        new: true, // Return updated document
        upsert: true, // Create if doesn't exist
        runValidators: true, // Run schema validators
      }
    );

    if (!config) {
      return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
    }

    return NextResponse.json({
      config: {
        _id: config._id.toString(),
        baseSystemPrompt: config.baseSystemPrompt,
        styleGuide: config.styleGuide,
        skills: config.skills,
        templates: config.templates,
        agents: config.agents,
        updatedAt: config.updatedAt,
      },
    });
  } catch (error) {
    console.error('PUT /api/admin/writing-config error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
