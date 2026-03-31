/**
 * Entry Detail Page
 * Displays a single knowledge entry with full content and metadata
 *
 * Requirements:
 * - 4.3: Render entry MDX content using the DDS component library
 * - 4.4: Display entry metadata including title, tags, languages, and skill level
 * - 4.5: Display related entries linked from the current entry
 * - 4.6: Display external resources associated with the entry
 * - 4.7: Show breadcrumb navigation based on the category hierarchy
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { connectToDatabase } from '@/lib/db/connection';
import { Entry } from '@/lib/db/models/Entry';
import { verifyToken, getAuthCookieName } from '@/lib/auth';
import { getCategoryPathArray } from '@/lib/db/queries/categories';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { EntryMetadata } from '@/components/EntryMetadata';
import { RelatedEntries } from '@/components/RelatedEntries';
import { ExternalResources } from '@/components/ExternalResources';
import type { IEntry } from '@/types/entry';
import type { ICategory } from '@/types/category';

interface PageProps {
  params: Promise<{ slug: string[] }>;
}

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAuthCookieName())?.value;
  if (!token) return false;
  const payload = await verifyToken(token);
  return payload !== null;
}

async function getEntryBySlug(slug: string): Promise<IEntry | null> {
  await connectToDatabase();

  const entry = await Entry.findOne({ slug }).lean();
  if (!entry) return null;

  return {
    _id: entry._id.toString(),
    slug: entry.slug,
    categoryId: entry.categoryId.toString(),
    status: entry.status,
    frontmatter: {
      title: entry.frontmatter.title,
      tags: entry.frontmatter.tags,
      languages: entry.frontmatter.languages,
      skillLevel: entry.frontmatter.skillLevel as 1 | 2 | 3 | 4 | 5,
      needsHelp: entry.frontmatter.needsHelp,
      isPrivate: entry.frontmatter.isPrivate,
      resources: entry.frontmatter.resources,
      relatedEntries: entry.frontmatter.relatedEntries.map((id) => id.toString()),
    },
    body: entry.body,
    pineconeId: entry.pineconeId,
    sourceFile: entry.sourceFile,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

async function getRelatedEntries(ids: string[]): Promise<Omit<IEntry, 'body'>[]> {
  if (ids.length === 0) return [];

  await connectToDatabase();

  const entries = await Entry.find({ _id: { $in: ids } })
    .select('-body')
    .lean();

  return entries.map((entry) => ({
    _id: entry._id.toString(),
    slug: entry.slug,
    categoryId: entry.categoryId.toString(),
    status: entry.status,
    frontmatter: {
      title: entry.frontmatter.title,
      tags: entry.frontmatter.tags,
      languages: entry.frontmatter.languages,
      skillLevel: entry.frontmatter.skillLevel as 1 | 2 | 3 | 4 | 5,
      needsHelp: entry.frontmatter.needsHelp,
      isPrivate: entry.frontmatter.isPrivate,
      resources: entry.frontmatter.resources,
      relatedEntries: entry.frontmatter.relatedEntries.map((id) => id.toString()),
    },
    pineconeId: entry.pineconeId,
    sourceFile: entry.sourceFile,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  }));
}

export default async function EntryDetailPage({ params }: PageProps) {
  const { slug } = await params;

  if (!slug || slug.length === 0) {
    notFound();
  }

  const entrySlug = slug[slug.length - 1]!; // Last segment is the entry slug

  const entry = await getEntryBySlug(entrySlug);

  if (!entry) {
    notFound();
  }

  // Check visibility for unauthenticated users
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    if (entry.status !== 'published' || entry.frontmatter.isPrivate) {
      notFound();
    }
  }

  // Get category path for breadcrumbs
  let categoryPath: ICategory[] = [];
  try {
    categoryPath = await getCategoryPathArray(entry.categoryId);
  } catch {
    // Category might not exist, continue without breadcrumbs
  }

  // Get related entries
  const relatedEntries = await getRelatedEntries(entry.frontmatter.relatedEntries);

  return (
    <div className="flex-1 flex flex-col">
      {/* Main content */}
      <main className="flex-1">
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumbs */}
          <Breadcrumbs categoryPath={categoryPath} entryTitle={entry.frontmatter.title} />

          {/* Entry header */}
          <header className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              {entry.status === 'draft' && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--color-warning-background)] text-[var(--color-warning)]">
                  Draft
                </span>
              )}
              {entry.frontmatter.isPrivate && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--color-error-background)] text-[var(--color-error)]">
                  Private
                </span>
              )}
              {entry.frontmatter.needsHelp && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--color-info-background)] text-[var(--color-info)]">
                  Needs Help
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold text-[var(--color-foreground)] mb-4">
              {entry.frontmatter.title}
            </h1>
            <EntryMetadata frontmatter={entry.frontmatter} />
          </header>

          {/* Entry body - MDX content */}
          <div className="prose prose-invert max-w-none mb-12">
            {/* TODO: Replace with MDX rendering when next-mdx-remote is set up */}
            <div className="whitespace-pre-wrap text-[var(--color-foreground-secondary)]">
              {entry.body}
            </div>
          </div>

          {/* External Resources */}
          {entry.frontmatter.resources.length > 0 && (
            <ExternalResources resources={entry.frontmatter.resources} />
          )}

          {/* Related Entries */}
          {relatedEntries.length > 0 && <RelatedEntries entries={relatedEntries} />}

          {/* Footer metadata */}
          <footer className="mt-12 pt-6 border-t border-[var(--color-border)]">
            <div className="flex items-center justify-between text-sm text-[var(--color-foreground-muted)]">
              <span>
                Last updated:{' '}
                {new Date(entry.updatedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
              <Link
                href="/browse"
                className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]"
              >
                ← Back to Browse
              </Link>
            </div>
          </footer>
        </article>
      </main>
    </div>
  );
}
