/**
 * Entry Detail Page
 * Displays a single knowledge entry with full content and metadata
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { connectToDatabase } from '@/lib/db/connection';
import { Entry } from '@/lib/db/models/Entry';
import { verifyToken, getAuthCookieName } from '@/lib/auth';
import { getCategoryPathArray, getCategoryTreeWithEntries } from '@/lib/db/queries/categories';
import { serializeMDX } from '@/lib/mdx/serialize';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { EntrySidebar } from '@/components/EntrySidebar';
import { FileExplorerNav } from '@/components/FileExplorerNav';
import { ResizableLayout } from '@/components/ResizableLayout';
import { MDXContent } from '@/components/mdx/MDXContent';
import { MobileDrawer } from '@/components/MobileDrawer';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { OnThisPage } from '@/components/OnThisPage';
import type { IEntry } from '@/types/entry';
import type { ICategory } from '@/types/category';

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

  const entrySlug = slug[slug.length - 1]!;

  const entry = await getEntryBySlug(entrySlug);

  if (!entry) {
    notFound();
  }

  const authenticated = await isAuthenticated();
  if (!authenticated) {
    if (entry.status !== 'published' || entry.frontmatter.isPrivate) {
      notFound();
    }
  }

  let categoryPath: ICategory[] = [];
  try {
    categoryPath = await getCategoryPathArray(entry.categoryId);
  } catch {
    // Category might not exist
  }

  const categoryTree = await getCategoryTreeWithEntries(authenticated);
  const relatedEntries = await getRelatedEntries(entry.frontmatter.relatedEntries);

  let serializedMdx;
  try {
    serializedMdx = await serializeMDX(entry.body);
  } catch (err) {
    console.error('Failed to serialize MDX:', err);
    serializedMdx = null;
  }

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
      {/* Mobile drawer */}
      <MobileDrawer>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-foreground-muted)] mb-2">
          Browse
        </h2>
        <FileExplorerNav tree={categoryTree} activeEntrySlug={entry.slug} />
      </MobileDrawer>

      <ResizableLayout
        sidebar={<FileExplorerNav tree={categoryTree} activeEntrySlug={entry.slug} />}
      >
        <div className="flex h-full min-h-0">
          <main id="entry-scroll-area" className="flex-1 min-w-0 h-full overflow-y-auto">
            {/* Entry details collapsible — visible below xl where right sidebar is hidden */}
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
            <Breadcrumbs categoryPath={categoryPath} entryTitle={entry.frontmatter.title} />

            <header className="mb-8">
              <h1 className="text-3xl font-bold text-[var(--color-foreground)]">
                {entry.frontmatter.title}
              </h1>
            </header>

            <div className="prose max-w-none mb-12">
              {serializedMdx ? (
                <MDXContent source={serializedMdx} />
              ) : (
                <div className="whitespace-pre-wrap text-[var(--color-foreground-secondary)]">
                  {entry.body}
                </div>
              )}
            </div>

            <footer className="mt-12 pt-6 border-t border-[var(--color-border)]">
              <Link
                href="/browse"
                className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]"
              >
                &larr; Back to Browse
              </Link>
            </footer>
          </article>
          </main>

          {/* Right sidebar — On This Page + metadata (xl+ only) */}
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
      </ResizableLayout>
    </div>
  );
}
