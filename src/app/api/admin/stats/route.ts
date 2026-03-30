/**
 * Admin Stats API Route
 *
 * Provides GET endpoint for retrieving knowledgebase statistics.
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 * - 10.1: Display total counts for entries, topics, and tags
 * - 10.2: Display the count of entries marked as needsHelp
 * - 10.3: Display lists of recently created and recently updated entries
 * - 10.4: Display top tags and topics by entry count
 * - 10.5: Display skill level distribution across entries
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/connection';
import { Entry } from '@/lib/db/models/Entry';
import { verifyToken, getAuthCookieName } from '@/lib/auth';

interface RecentEntry {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TagCount {
  tag: string;
  count: number;
}

interface TopicCount {
  topic: string;
  count: number;
}

interface AdminStatsResponse {
  totalEntries: number;
  totalTopics: number;
  totalTags: number;
  needsHelpCount: number;
  recentlyCreated: RecentEntry[];
  recentlyUpdated: RecentEntry[];
  topTags: TagCount[];
  topTopics: TopicCount[];
  skillLevelDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

/**
 * Verify authentication for admin routes
 */
async function verifyAuth(request: NextRequest): Promise<boolean> {
  const cookieName = getAuthCookieName();
  const token = request.cookies.get(cookieName)?.value;

  if (!token) {
    return false;
  }

  const payload = await verifyToken(token);
  return payload !== null;
}

/**
 * GET /api/admin/stats
 *
 * Retrieves knowledgebase statistics including:
 * - Total counts for entries, topics, and tags
 * - Count of entries needing help
 * - Recently created and updated entries
 * - Top tags and topics by count
 * - Skill level distribution
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<AdminStatsResponse | { error: string }>> {
  try {
    // Check authentication
    const isAuthenticated = await verifyAuth(request);
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Execute all aggregations in parallel for performance
    const [
      totalEntries,
      needsHelpCount,
      uniqueTopics,
      uniqueTags,
      recentlyCreated,
      recentlyUpdated,
      topTags,
      topTopics,
      skillDistribution,
    ] = await Promise.all([
      // Total entries count
      Entry.countDocuments(),

      // Entries needing help count
      Entry.countDocuments({ 'frontmatter.needsHelp': true }),

      // Unique topics aggregation
      Entry.aggregate([
        { $unwind: '$frontmatter.topics' },
        { $group: { _id: '$frontmatter.topics' } },
        { $count: 'count' },
      ]),

      // Unique tags aggregation
      Entry.aggregate([
        { $unwind: '$frontmatter.tags' },
        { $group: { _id: '$frontmatter.tags' } },
        { $count: 'count' },
      ]),

      // Recently created entries (last 10)
      Entry.find()
        .select('frontmatter.title createdAt updatedAt')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),

      // Recently updated entries (last 10)
      Entry.find()
        .select('frontmatter.title createdAt updatedAt')
        .sort({ updatedAt: -1 })
        .limit(10)
        .lean(),

      // Top tags by count (top 10)
      Entry.aggregate([
        { $unwind: '$frontmatter.tags' },
        { $group: { _id: '$frontmatter.tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { tag: '$_id', count: 1, _id: 0 } },
      ]),

      // Top topics by count (top 10)
      Entry.aggregate([
        { $unwind: '$frontmatter.topics' },
        { $group: { _id: '$frontmatter.topics', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { topic: '$_id', count: 1, _id: 0 } },
      ]),

      // Skill level distribution
      Entry.aggregate([
        {
          $group: {
            _id: '$frontmatter.skillLevel',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Transform skill distribution to expected format
    const skillLevelDistribution: Record<1 | 2 | 3 | 4 | 5, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    for (const item of skillDistribution) {
      const level = item._id as 1 | 2 | 3 | 4 | 5;
      if (level >= 1 && level <= 5) {
        skillLevelDistribution[level] = item.count;
      }
    }

    // Transform recent entries
    const transformRecentEntry = (doc: {
      _id: unknown;
      frontmatter: { title: string };
      createdAt: Date;
      updatedAt: Date;
    }): RecentEntry => ({
      id: String(doc._id),
      title: doc.frontmatter.title,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });

    return NextResponse.json({
      totalEntries,
      totalTopics: uniqueTopics[0]?.count || 0,
      totalTags: uniqueTags[0]?.count || 0,
      needsHelpCount,
      recentlyCreated: recentlyCreated.map(transformRecentEntry),
      recentlyUpdated: recentlyUpdated.map(transformRecentEntry),
      topTags: topTags as TagCount[],
      topTopics: topTopics as TopicCount[],
      skillLevelDistribution,
    });
  } catch (error) {
    console.error('GET /api/admin/stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
