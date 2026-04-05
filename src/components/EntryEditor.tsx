'use client';

/**
 * EntryEditor Component
 * Main editor component for creating and editing knowledge entries
 *
 * Layout:
 * - Left column (2/3 on md+): Code editor OR Preview (toggled)
 * - Right column (1/3 on md+): Metadata OR AI Writing (toggled)
 * - Stacked on small screens
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { IEntry, EntryFrontmatter } from '@/types/entry';
import type { CategoryTreeNode } from '@/types/category';
import { MonacoPane } from './MonacoPane';
import { PreviewPane } from './PreviewPane';
import { AIWritingPanel } from './AIWritingPanel';
import { useTheme } from './ThemeProvider';
import { Pencil, Eye, ClipboardList, Bot, Check, Loader2, Database } from 'lucide-react';
import { ErrorBoundary } from './ErrorBoundary';

interface EntryEditorProps {
  entry?: IEntry;
  categories: CategoryTreeNode[];
  onSave: (entry: Partial<IEntry>) => Promise<IEntry | void>;
  onDelete?: () => Promise<void>;
}

const defaultFrontmatter: EntryFrontmatter = {
  title: '',
  tags: [],
  languages: [],
  skillLevel: 3,
  needsHelp: false,
  isPrivate: false,
  resources: [],
  relatedEntries: [],
};

const DATETIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
};

export function EntryEditor(props: EntryEditorProps) {
  return (
    <ErrorBoundary
      fallback={({ error, resetErrorBoundary }) => (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-[var(--color-background)]">
          <h2 className="text-lg font-semibold text-[var(--color-error)] mb-2">Editor Error</h2>
          <p className="text-[var(--color-foreground-secondary)] mb-4 max-w-md">
            {error.message || 'Something went wrong with the editor'}
          </p>
          <button
            onClick={resetErrorBoundary}
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-md hover:opacity-90 transition-opacity"
          >
            Try again
          </button>
        </div>
      )}
    >
      <EntryEditorInner {...props} />
    </ErrorBoundary>
  );
}

type LeftPanelView = 'editor' | 'preview';
type RightPanelView = 'metadata' | 'ai';

function EntryEditorInner({
  entry,
  categories: initialCategories,
  onSave,
  onDelete,
}: EntryEditorProps) {
  const { theme } = useTheme();

  // Entry state
  const [slug, setSlug] = useState(entry?.slug || '');
  const [status, setStatus] = useState<'draft' | 'published'>(entry?.status || 'draft');
  const [categoryId, setCategoryId] = useState(entry?.categoryId || '');
  const [frontmatter, setFrontmatter] = useState<EntryFrontmatter>(
    entry?.frontmatter || defaultFrontmatter
  );
  const [body, setBody] = useState(entry?.body || '');
  const [categories, setCategories] = useState<CategoryTreeNode[]>(initialCategories);

  // Derive slug from title (mirrors server-side generateSlug logic)
  const derivedSlug = useMemo(
    () =>
      frontmatter.title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, ''),
    [frontmatter.title]
  );

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(
    entry?.updatedAt ? new Date(entry.updatedAt) : null
  );
  const [pineconeIndexed, setPineconeIndexed] = useState<boolean>(!!entry?.pineconeId);
  const saveSuccessTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selection, setSelection] = useState<string | undefined>(undefined);
  const [leftView, setLeftView] = useState<LeftPanelView>('editor');
  const [rightView, setRightView] = useState<RightPanelView>('metadata');

  // Sync lastSavedAt and pineconeIndexed when entry prop changes
  useEffect(() => {
    if (entry?.updatedAt) {
      setLastSavedAt(new Date(entry.updatedAt));
    } else {
      setLastSavedAt(null);
    }
    setPineconeIndexed(!!entry?.pineconeId);
  }, [entry?.updatedAt, entry?.pineconeId]);

  // Cleanup save success timeout on unmount
  useEffect(() => {
    return () => {
      if (saveSuccessTimeout.current) {
        clearTimeout(saveSuccessTimeout.current);
      }
    };
  }, []);

  // Handle new category creation - add to local state
  const handleCategoryCreated = useCallback(
    (newCategory: CategoryTreeNode & { parentId?: string | null }) => {
      setCategories((prev) => {
        // If it has a parent, we need to add it as a child
        if (newCategory.parentId) {
          const addToParent = (cats: CategoryTreeNode[]): CategoryTreeNode[] => {
            return cats.map((cat) => {
              if (cat._id === newCategory.parentId) {
                return {
                  ...cat,
                  children: [...cat.children, { ...newCategory, children: [], entryCount: 0 }],
                };
              }
              if (cat.children.length > 0) {
                return { ...cat, children: addToParent(cat.children) };
              }
              return cat;
            });
          };
          return addToParent(prev);
        }
        // Top-level category
        return [...prev, { ...newCategory, children: [], entryCount: 0 }];
      });
    },
    []
  );

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);
    if (saveSuccessTimeout.current) {
      clearTimeout(saveSuccessTimeout.current);
    }
    try {
      const result = await onSave({
        ...(entry?._id && { _id: entry._id }),
        slug: slug || undefined,
        categoryId,
        status,
        frontmatter,
        body,
      });
      setSaveSuccess(true);
      setLastSavedAt(new Date());
      if (result) {
        setPineconeIndexed(!!result.pineconeId);
      }
      saveSuccessTimeout.current = setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save entry');
    } finally {
      setIsSaving(false);
    }
  }, [entry?._id, slug, categoryId, status, frontmatter, body, onSave]);

  const handleDelete = useCallback(async () => {
    if (!onDelete) return;
    if (!confirm('Are you sure you want to delete this entry?')) return;
    setIsDeleting(true);
    setError(null);
    try {
      await onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete entry');
      setIsDeleting(false);
    }
  }, [onDelete]);

  const updateFrontmatter = useCallback(
    <K extends keyof EntryFrontmatter>(field: K, value: EntryFrontmatter[K]) => {
      setFrontmatter((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleSelectionChange = useCallback((selectedText: string | undefined) => {
    setSelection(selectedText);
  }, []);

  const handleApplyAIContent = useCallback(
    (content: string) => {
      if (selection) {
        setBody((prev) => prev.replace(selection, content));
        setSelection(undefined);
      } else {
        setBody((prev) => prev + '\n\n' + content);
      }
      // Switch to editor view to see the applied content
      setLeftView('editor');
    },
    [selection]
  );

  return (
    <div className="h-full flex flex-col bg-[var(--color-background)]">
      {/* Top Bar */}
      <div className="flex-shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="px-4 py-3 flex items-center justify-end gap-2">
          {error && <span className="text-sm text-[var(--color-error)] mr-2">{error}</span>}
          {/* Save status indicators */}
          {!error && (saveSuccess || lastSavedAt) && (
            <div className="flex items-center gap-2 mr-2">
              {saveSuccess && (
                <span className="inline-flex items-center gap-1 text-sm text-[var(--color-success,#22c55e)] animate-fade-in">
                  <Check className="w-4 h-4" />
                  Saved
                </span>
              )}
              {lastSavedAt && (
                <span className="text-xs text-[var(--color-foreground-muted)]">
                  Last saved {lastSavedAt.toLocaleString([], DATETIME_FORMAT_OPTIONS)}
                </span>
              )}
            </div>
          )}
          {/* Pinecone indexing status */}
          {entry && (
            <span
              className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                pineconeIndexed
                  ? 'bg-[var(--color-success,#22c55e)]/10 text-[var(--color-success,#22c55e)]'
                  : 'bg-[var(--color-foreground-muted)]/10 text-[var(--color-foreground-muted)]'
              }`}
              title={
                pineconeIndexed
                  ? 'This entry is indexed in Pinecone for semantic search'
                  : 'This entry is not indexed in Pinecone (publish to index)'
              }
            >
              <Database className="w-3 h-3" />
              {pineconeIndexed ? 'Indexed' : 'Not indexed'}
            </span>
          )}
          {onDelete && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-3 py-1.5 text-sm font-medium text-[var(--color-error)] hover:bg-[var(--color-error)]/10 rounded-md transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving || !frontmatter.title || !categoryId}
            className="px-4 py-1.5 text-sm font-medium bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-1.5"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Save'
            )}
          </button>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row">
        {/* Left Column: Editor/Preview (2/3 on md+) */}
        <div className="flex-1 md:w-2/3 min-h-0 flex flex-col border-b md:border-b-0 md:border-r border-[var(--color-border)]">
          {/* Left Column Header with Toggle */}
          <div className="flex-shrink-0 px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setLeftView('editor')}
                className={`px-3 py-1 text-sm font-medium rounded-md cursor-pointer transition-colors inline-flex items-center gap-1.5 ${
                  leftView === 'editor'
                    ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                    : 'text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-hover)]'
                }`}
              >
                <Pencil className="w-4 h-4" /> Editor
              </button>
              <button
                onClick={() => setLeftView('preview')}
                className={`px-3 py-1 text-sm font-medium rounded-md cursor-pointer transition-colors inline-flex items-center gap-1.5 ${
                  leftView === 'preview'
                    ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                    : 'text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-hover)]'
                }`}
              >
                <Eye className="w-4 h-4" /> Preview
              </button>
            </div>
          </div>

          {/* Left Column Content */}
          <div className="flex-1 min-h-0">
            {leftView === 'editor' ? (
              <MonacoPane
                value={body}
                onChange={setBody}
                theme={theme}
                onSelectionChange={handleSelectionChange}
              />
            ) : (
              <div className="h-full overflow-y-auto">
                <PreviewPane mdx={body} />
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Metadata/AI (1/3 on md+) */}
        <div className="h-80 md:h-auto flex-shrink-0 md:flex-none md:w-1/3 min-h-0 flex flex-col overflow-hidden bg-[var(--color-background-secondary)]">
          {/* Right Column Header with Toggle */}
          <div className="flex-shrink-0 px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setRightView('metadata')}
                className={`px-3 py-1 text-sm font-medium rounded-md cursor-pointer transition-colors inline-flex items-center gap-1.5 ${
                  rightView === 'metadata'
                    ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                    : 'text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-hover)]'
                }`}
              >
                <ClipboardList className="w-4 h-4" /> Metadata
              </button>
              <button
                onClick={() => setRightView('ai')}
                className={`px-3 py-1 text-sm font-medium rounded-md cursor-pointer transition-colors inline-flex items-center gap-1.5 ${
                  rightView === 'ai'
                    ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                    : 'text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-hover)]'
                }`}
              >
                <Bot className="w-4 h-4" /> AI Assistant
              </button>
            </div>
          </div>

          {/* Right Column Content */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {rightView === 'metadata' ? (
              <MetadataPanel
                frontmatter={frontmatter}
                slug={slug}
                setSlug={setSlug}
                derivedSlug={derivedSlug}
                status={status}
                setStatus={setStatus}
                categoryId={categoryId}
                categories={categories}
                updateFrontmatter={updateFrontmatter}
                setCategoryId={setCategoryId}
                onCategoryCreated={handleCategoryCreated}
              />
            ) : (
              <AIWritingPanel
                body={body}
                frontmatter={frontmatter}
                selection={selection}
                onApply={handleApplyAIContent}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Extracted Metadata Panel component for cleaner code
interface MetadataPanelProps {
  frontmatter: EntryFrontmatter;
  slug: string;
  setSlug: (slug: string) => void;
  derivedSlug: string;
  status: 'draft' | 'published';
  setStatus: (status: 'draft' | 'published') => void;
  categoryId: string;
  categories: CategoryTreeNode[];
  updateFrontmatter: <K extends keyof EntryFrontmatter>(
    field: K,
    value: EntryFrontmatter[K]
  ) => void;
  setCategoryId: (id: string) => void;
  onCategoryCreated: (category: CategoryTreeNode & { parentId?: string | null }) => void;
}

function MetadataPanel({
  frontmatter,
  slug,
  setSlug,
  derivedSlug,
  status,
  setStatus,
  categoryId,
  categories,
  updateFrontmatter,
  setCategoryId,
  onCategoryCreated,
}: MetadataPanelProps) {
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [parentCategoryId, setParentCategoryId] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;

    setIsCreatingCategory(true);
    setCategoryError(null);

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          parentId: parentCategoryId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create category');
      }

      const { category } = await res.json();
      onCategoryCreated(category);
      setCategoryId(category._id);
      setNewCategoryName('');
      setParentCategoryId('');
      setShowNewCategory(false);
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : 'Failed to create category');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-[var(--color-foreground-muted)] mb-1"
        >
          Title *
        </label>
        <input
          id="title"
          type="text"
          value={frontmatter.title}
          onChange={(e) => updateFrontmatter('title', e.target.value)}
          className="w-full px-3 py-2 text-sm bg-[var(--color-background)] border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          placeholder="Entry title"
        />
      </div>
      <div>
        <label
          htmlFor="slug"
          className="block text-sm font-medium text-[var(--color-foreground-muted)] mb-1"
        >
          Slug
        </label>
        <input
          id="slug"
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder={derivedSlug || 'auto-generated'}
          className="w-full px-3 py-2 text-sm bg-[var(--color-background)] border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        />
      </div>
      <div>
        <label
          htmlFor="status"
          className="block text-sm font-medium text-[var(--color-foreground-muted)] mb-1"
        >
          Status
        </label>
        <select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
          className="w-full px-3 py-2 text-sm bg-[var(--color-background)] border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>
      <div>
        <label
          htmlFor="category"
          className="block text-sm font-medium text-[var(--color-foreground-muted)] mb-1"
        >
          Category *
        </label>
        <div className="flex gap-2">
          <select
            id="category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="flex-1 px-3 py-2 text-sm bg-[var(--color-background)] border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="">Select a category</option>
            {renderCategoryOptions(categories)}
          </select>
          <button
            type="button"
            onClick={() => setShowNewCategory(!showNewCategory)}
            className="px-3 py-2 text-sm font-medium bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md hover:bg-[var(--color-surface-hover)] transition-colors"
            title="Add new category"
          >
            +
          </button>
        </div>

        {/* New Category Form */}
        {showNewCategory && (
          <div className="mt-3 p-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md space-y-3">
            <div>
              <label
                htmlFor="newCategoryName"
                className="block text-xs font-medium text-[var(--color-foreground-muted)] mb-1"
              >
                Category Name
              </label>
              <input
                id="newCategoryName"
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="w-full px-2 py-1.5 text-sm bg-[var(--color-background)] border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                placeholder="New category name"
              />
            </div>
            <div>
              <label
                htmlFor="parentCategory"
                className="block text-xs font-medium text-[var(--color-foreground-muted)] mb-1"
              >
                Parent Category (optional)
              </label>
              <select
                id="parentCategory"
                value={parentCategoryId}
                onChange={(e) => setParentCategoryId(e.target.value)}
                className="w-full px-2 py-1.5 text-sm bg-[var(--color-background)] border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="">None (top-level)</option>
                {renderCategoryOptions(categories)}
              </select>
            </div>
            {categoryError && <p className="text-xs text-[var(--color-error)]">{categoryError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCreateCategory}
                disabled={isCreatingCategory || !newCategoryName.trim()}
                className="flex-1 px-3 py-1.5 text-sm font-medium bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isCreatingCategory ? 'Creating...' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewCategory(false);
                  setNewCategoryName('');
                  setParentCategoryId('');
                  setCategoryError(null);
                }}
                className="px-3 py-1.5 text-sm font-medium bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
      <div>
        <label
          htmlFor="tags"
          className="block text-sm font-medium text-[var(--color-foreground-muted)] mb-1"
        >
          Tags
        </label>
        <input
          id="tags"
          type="text"
          value={frontmatter.tags.join(', ')}
          onChange={(e) =>
            updateFrontmatter(
              'tags',
              e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            )
          }
          className="w-full px-3 py-2 text-sm bg-[var(--color-background)] border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          placeholder="Comma-separated tags"
        />
      </div>
      <div>
        <label
          htmlFor="languages"
          className="block text-sm font-medium text-[var(--color-foreground-muted)] mb-1"
        >
          Languages
        </label>
        <input
          id="languages"
          type="text"
          value={frontmatter.languages.join(', ')}
          onChange={(e) =>
            updateFrontmatter(
              'languages',
              e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            )
          }
          className="w-full px-3 py-2 text-sm bg-[var(--color-background)] border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          placeholder="Comma-separated languages"
        />
      </div>
      <div>
        <label
          htmlFor="skillLevel"
          className="block text-sm font-medium text-[var(--color-foreground-muted)] mb-1"
        >
          Skill Level
        </label>
        <select
          id="skillLevel"
          value={frontmatter.skillLevel}
          onChange={(e) =>
            updateFrontmatter('skillLevel', parseInt(e.target.value) as 1 | 2 | 3 | 4 | 5)
          }
          className="w-full px-3 py-2 text-sm bg-[var(--color-background)] border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        >
          <option value={1}>1 - Beginner</option>
          <option value={2}>2 - Elementary</option>
          <option value={3}>3 - Intermediate</option>
          <option value={4}>4 - Advanced</option>
          <option value={5}>5 - Expert</option>
        </select>
      </div>
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={frontmatter.needsHelp}
            onChange={(e) => updateFrontmatter('needsHelp', e.target.checked)}
            className="rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
          />
          <span className="text-sm text-[var(--color-foreground)]">Needs Help</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={frontmatter.isPrivate}
            onChange={(e) => updateFrontmatter('isPrivate', e.target.checked)}
            className="rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
          />
          <span className="text-sm text-[var(--color-foreground)]">Private</span>
        </label>
      </div>
    </div>
  );
}

function renderCategoryOptions(categories: CategoryTreeNode[], level = 0): React.ReactNode[] {
  const options: React.ReactNode[] = [];
  for (const cat of categories) {
    options.push(
      <option key={cat._id} value={cat._id}>
        {'\u00A0'.repeat(level * 4)}
        {cat.name}
      </option>
    );
    if (cat.children.length > 0) {
      options.push(...renderCategoryOptions(cat.children, level + 1));
    }
  }
  return options;
}
