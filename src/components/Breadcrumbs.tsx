'use client';

/**
 * Breadcrumbs Component
 * Displays breadcrumb navigation based on the category hierarchy
 *
 * Requirements:
 * - 4.7: When viewing an entry, show breadcrumb navigation based on the category hierarchy
 */

import Link from 'next/link';
import type { ICategory } from '@/types/category';

interface BreadcrumbsProps {
  categoryPath: ICategory[];
  entryTitle?: string;
}

export function Breadcrumbs({ categoryPath, entryTitle }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex items-center flex-wrap gap-1 text-sm">
        {/* Home/Browse link */}
        <li className="flex items-center">
          <Link
            href="/browse"
            className="text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <span className="sr-only">Browse</span>
          </Link>
        </li>

        {/* Category path */}
        {categoryPath.map((category, index) => (
          <li key={category._id} className="flex items-center">
            <svg
              className="w-4 h-4 text-[var(--color-foreground-muted)] mx-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {index === categoryPath.length - 1 && !entryTitle ? (
              <span className="text-[var(--color-foreground)] font-medium">{category.name}</span>
            ) : (
              <Link
                href={`/browse?categoryId=${category._id}`}
                className="text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] transition-colors"
              >
                {category.name}
              </Link>
            )}
          </li>
        ))}

        {/* Entry title (current page) */}
        {entryTitle && (
          <li className="flex items-center">
            <svg
              className="w-4 h-4 text-[var(--color-foreground-muted)] mx-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-[var(--color-foreground)] font-medium truncate max-w-[200px]">
              {entryTitle}
            </span>
          </li>
        )}
      </ol>
    </nav>
  );
}
