'use client';

/**
 * Admin Dashboard Page
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 * - 10.1: Display total counts for entries and tags
 * - 10.2: Display the count of entries marked as needsHelp
 * - 10.3: Display lists of recently created and recently updated entries
 * - 10.4: Display top tags by entry count
 * - 10.5: Display skill level distribution across entries
 * - 10.6: Accessible only to authenticated users
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ListFilter, FolderTree } from 'lucide-react';
import { StatsPanel } from '@/components/StatsPanel';
import { RecentEntries } from '@/components/RecentEntries';
import { TopTagsChart } from '@/components/TopTagsChart';

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

interface AdminStats {
  totalEntries: number;
  totalTags: number;
  needsHelpCount: number;
  recentlyCreated: RecentEntry[];
  recentlyUpdated: RecentEntry[];
  topTags: TagCount[];
  skillLevelDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/admin/stats');

        if (response.status === 401) {
          router.push('/login');
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch stats');
        }

        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-[var(--color-surface)] rounded w-48" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-[var(--color-surface)] rounded-lg" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-64 bg-[var(--color-surface)] rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-[var(--color-error-background)] border border-[var(--color-error)] rounded-lg p-4">
            <p className="text-[var(--color-error)]">Error: {error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-sm text-[var(--color-primary)] hover:underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="flex-1 bg-[var(--color-background)]">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Admin Dashboard</h1>
            <p className="text-[var(--color-foreground-muted)] mt-1">
              Overview of your knowledgebase
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/categories"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium
                border border-[var(--color-border)] text-[var(--color-foreground)]
                hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              <FolderTree size={18} />
              Manage Categories
            </Link>
            <Link
              href="/admin/entries"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium
                bg-[var(--color-primary)] text-[var(--color-primary-foreground)]
                hover:bg-[var(--color-primary-hover)] transition-colors"
            >
              <ListFilter size={18} />
              Manage Entries
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <StatsPanel
          totalEntries={stats.totalEntries}
          totalTags={stats.totalTags}
          needsHelpCount={stats.needsHelpCount}
        />

        {/* Charts */}
        <TopTagsChart
          topTags={stats.topTags}
          skillLevelDistribution={stats.skillLevelDistribution}
        />

        {/* Recent Activity */}
        <RecentEntries
          recentlyCreated={stats.recentlyCreated}
          recentlyUpdated={stats.recentlyUpdated}
        />
      </div>
    </div>
  );
}
