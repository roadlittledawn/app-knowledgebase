'use client';

/**
 * StatsPanel Component
 * Displays key statistics for the admin dashboard
 *
 * Requirements: 10.1, 10.2
 * - 10.1: Display total counts for entries and tags
 * - 10.2: Display the count of entries marked as needsHelp
 */

interface StatsPanelProps {
  totalEntries: number;
  totalTags: number;
  needsHelpCount: number;
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  variant?: 'default' | 'warning';
}

function StatCard({ label, value, icon, variant = 'default' }: StatCardProps) {
  const bgColor =
    variant === 'warning' ? 'bg-[var(--color-warning-background)]' : 'bg-[var(--color-surface)]';
  const iconColor =
    variant === 'warning' ? 'text-[var(--color-warning)]' : 'text-[var(--color-primary)]';

  return (
    <div className={`${bgColor} rounded-lg border border-[var(--color-border)] p-5`}>
      <div className="flex items-center gap-4">
        <div className={`${iconColor} p-3 rounded-lg bg-[var(--color-background-secondary)]`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-[var(--color-foreground-muted)]">{label}</p>
          <p className="text-2xl font-semibold text-[var(--color-foreground)]">{value}</p>
        </div>
      </div>
    </div>
  );
}

export function StatsPanel({ totalEntries, totalTags, needsHelpCount }: StatsPanelProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <StatCard
        label="Total Entries"
        value={totalEntries}
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        }
      />
      <StatCard
        label="Tags"
        value={totalTags}
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
            />
          </svg>
        }
      />
      <StatCard
        label="Needs Help"
        value={needsHelpCount}
        variant={needsHelpCount > 0 ? 'warning' : 'default'}
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        }
      />
    </div>
  );
}
