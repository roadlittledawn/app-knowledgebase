'use client';

/**
 * TopTagsChart Component
 * Displays top tags and topics by entry count with visual bars
 *
 * Requirements: 10.4, 10.5
 * - 10.4: Display top tags and topics by entry count
 * - 10.5: Display skill level distribution across entries
 */

interface TagCount {
  tag: string;
  count: number;
}

interface TopicCount {
  topic: string;
  count: number;
}

interface TopTagsChartProps {
  topTags: TagCount[];
  topTopics: TopicCount[];
  skillLevelDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

interface BarChartProps {
  title: string;
  items: { label: string; count: number }[];
  color: string;
  icon: React.ReactNode;
}

function BarChart({ title, items, color, icon }: BarChartProps) {
  const maxCount = Math.max(...items.map((item) => item.count), 1);

  return (
    <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className={color}>{icon}</span>
        <h3 className="text-lg font-semibold text-[var(--color-foreground)]">{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="text-[var(--color-foreground-muted)] text-sm">No data yet</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-[var(--color-foreground)] truncate">{item.label}</span>
                <span className="text-[var(--color-foreground-muted)] ml-2">{item.count}</span>
              </div>
              <div className="h-2 bg-[var(--color-background-secondary)] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${color.replace('text-', 'bg-')}`}
                  style={{ width: `${(item.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const skillLevelLabels: Record<number, string> = {
  1: 'Beginner',
  2: 'Elementary',
  3: 'Intermediate',
  4: 'Advanced',
  5: 'Expert',
};

const skillLevelColors: Record<number, string> = {
  1: 'bg-green-500',
  2: 'bg-blue-500',
  3: 'bg-yellow-500',
  4: 'bg-orange-500',
  5: 'bg-red-500',
};

function SkillDistribution({ distribution }: { distribution: Record<1 | 2 | 3 | 4 | 5, number> }) {
  const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
  const levels = [1, 2, 3, 4, 5] as const;

  return (
    <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[var(--color-secondary)]">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </span>
        <h3 className="text-lg font-semibold text-[var(--color-foreground)]">Skill Distribution</h3>
      </div>
      {total === 0 ? (
        <p className="text-[var(--color-foreground-muted)] text-sm">No entries yet</p>
      ) : (
        <div className="space-y-3">
          {levels.map((level) => {
            const count = distribution[level];
            const percentage = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={level}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-[var(--color-foreground)]">{skillLevelLabels[level]}</span>
                  <span className="text-[var(--color-foreground-muted)]">
                    {count} ({percentage.toFixed(0)}%)
                  </span>
                </div>
                <div className="h-2 bg-[var(--color-background-secondary)] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${skillLevelColors[level]}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function TopTagsChart({ topTags, topTopics, skillLevelDistribution }: TopTagsChartProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <BarChart
        title="Top Topics"
        items={topTopics.map((t) => ({ label: t.topic, count: t.count }))}
        color="text-[var(--color-primary)]"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
        }
      />
      <BarChart
        title="Top Tags"
        items={topTags.map((t) => ({ label: t.tag, count: t.count }))}
        color="text-[var(--color-info)]"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
            />
          </svg>
        }
      />
      <SkillDistribution distribution={skillLevelDistribution} />
    </div>
  );
}
