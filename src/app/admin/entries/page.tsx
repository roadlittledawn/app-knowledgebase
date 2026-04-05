'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import { EntryManagementTable } from '@/components/EntryManagementTable';

export default function AdminEntriesPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/admin/stats');
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        if (res.ok) {
          setAuthorized(true);
        }
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-[var(--color-surface)] rounded w-48" />
            <div className="h-4 bg-[var(--color-surface)] rounded w-72" />
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-12 bg-[var(--color-surface)] rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <div className="flex-1 bg-[var(--color-background)]">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Back link */}
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Manage Entries</h1>
            <p className="text-[var(--color-foreground-muted)] mt-1">
              Search, filter, and manage all knowledgebase entries
            </p>
          </div>
          <Link
            href="/entries/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium
              bg-[var(--color-primary)] text-[var(--color-primary-foreground)]
              hover:bg-[var(--color-primary-hover)] transition-colors self-start"
          >
            <Plus size={18} />
            New Entry
          </Link>
        </div>

        {/* Entry Management Table */}
        <EntryManagementTable />
      </div>
    </div>
  );
}
