import Link from 'next/link';

/**
 * Home Page
 * Landing page for the knowledgebase application
 */

export default function Home() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold text-[var(--color-foreground)] mb-4">
          Welcome to Knowledgebase
        </h1>
        <p className="text-lg text-[var(--color-foreground-secondary)] mb-8">
          Your personal repository for technical how-tos, concepts, and documentation.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/browse"
            className="px-6 py-3 rounded-lg bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            Browse Entries
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 rounded-lg border border-[var(--color-border)] text-[var(--color-foreground)] font-medium hover:bg-[var(--color-surface-hover)] transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
