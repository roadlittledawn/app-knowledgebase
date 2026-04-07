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
import { getCategoryPathArray, getCategoryTreeWithCounts } from '@/lib/db/queries/categories';
import { serializeMDX } from '@/lib/mdx/serialize';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { EntrySidebar } from '@/components/EntrySidebar';
import { CategoryNavSidebar } from '@/components/CategoryNavSidebar';
import { MDXContent } from '@/components/mdx/MDXContent';
import { MobileDrawer } from '@/components/MobileDrawer';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { OnThisPage } from '@/components/OnThisPage';
import type { IEntry } from '@/types/entry';
import type { ICategory } from '@/types/category';

// Force dynamic rendering since we check authentication
export const dynamic = 'force-dynamic';

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

  // Get category path for breadcrumbs and tree for left sidebar
  let categoryPath: ICategory[] = [];
  try {
    categoryPath = await getCategoryPathArray(entry.categoryId);
  } catch {
    // Category might not exist, continue without breadcrumbs
  }

  const categoryTree = await getCategoryTreeWithCounts();

  // Get related entries
  const relatedEntries = await getRelatedEntries(entry.frontmatter.relatedEntries);

  // Serialize MDX content for rendering
  let serializedMdx;
  try {
    serializedMdx = await serializeMDX(entry.body);
  } catch (err) {
    console.error('Failed to serialize MDX:', err);
    serializedMdx = null;
  }

  // Build sidebar-safe entry (without body)
  const sidebarEntry: Omit<IEntry, 'body'> = {
    _id: entry._id,
    slug: entry.slug,
    categoryId: entry.categoryId,
    status: entry.status,
    frontmatter: entry.frontmatter,
    pineconeId: entry.pineconeId,
    sourceFile: entry.sourceFile,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };

  return (
    <div className="flex-1 flex min-h-0">
      {/* Mobile drawer — category tree */}
      <MobileDrawer>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-foreground-muted)] mb-2">
          Categories
        </h2>
        <CategoryNavSidebar tree={categoryTree} selectedCategoryId={entry.categoryId} />
      </MobileDrawer>

      {/* Left sidebar — category tree (lg+) */}
      <aside className="hidden lg:flex lg:flex-col w-64 flex-shrink-0 border-r border-[var(--color-border)] bg-[var(--color-background-secondary)] overflow-y-auto">
        <div className="p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-foreground-muted)] mb-2">
            Categories
          </h2>
          <CategoryNavSidebar tree={categoryTree} selectedCategoryId={entry.categoryId} />
        </div>
      </aside>

      {/* Center — article content */}
      <main id="entry-scroll-area" className="flex-1 min-w-0 overflow-y-auto">
        {/* Entry details collapsible — hidden on xl when right sidebar is visible */}
        <CollapsibleSection
          title="Entry Details"
          className="xl:hidden px-6 pt-4 pb-2 border-b border-[var(--color-border)]"
        >
          <OnThisPage />
          <div className="my-4 border-t border-[var(--color-border)]" />
          <EntrySidebar
            entry={sidebarEntry}
            relatedEntries={relatedEntries}
            authenticated={authenticated}
          />
        </CollapsibleSection>

        <article className="mx-auto px-6 py-8 pb-32" style={{ maxWidth: '1000px' }}>
          {/* Breadcrumbs */}
          <Breadcrumbs categoryPath={categoryPath} entryTitle={entry.frontmatter.title} />

          {/* Entry header */}
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-[var(--color-foreground)]">
              {entry.frontmatter.title}
            </h1>
          </header>

          {/* Entry body — MDX content */}
          <div className="prose max-w-none mb-12">
            {serializedMdx ? (
              <MDXContent source={serializedMdx} />
            ) : (
              <div className="whitespace-pre-wrap text-[var(--color-foreground-secondary)]">
                {entry.body}
              </div>
            )}
          </div>

          {/* Footer */}
          <footer className="mt-12 pt-6 border-t border-[var(--color-border)]">
            <Link
              href="/browse"
              className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]"
            >
              ← Back to Browse
            </Link>
          </footer>
        </article>
      </main>

      {/* Right sidebar — on this page + entry metadata */}
      <aside className="hidden xl:flex xl:flex-col w-72 flex-shrink-0 border-l border-[var(--color-border)] overflow-y-auto">
        <div className="p-5 pb-4 border-b border-[var(--color-border)]">
          <OnThisPage />
        </div>
        <EntrySidebar
          entry={sidebarEntry}
          relatedEntries={relatedEntries}
          authenticated={authenticated}
        />
      </aside>
    </div>
  );
}
