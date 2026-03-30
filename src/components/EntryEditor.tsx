'use client';

/**
 * EntryEditor Component
 * Main editor component for creating and editing knowledge entries
 *
 * Requirements:
 * - 6.1: Display a split-pane layout with Monaco editor and preview pane
 * - 6.2: Use react-resizable-panels for adjustable pane sizes
 */

import { useState, useCallback } from 'react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import type { IEntry, EntryFrontmatter } from '@/types/entry';
import type { CategoryTreeNode } from '@/types/category';
import { MonacoPane } from './MonacoPane';
import { PreviewPane } from './PreviewPane';
import { useTheme } from './ThemeProvider';

interface EntryEditorProps {
  entry?: IEntry; // undefined for new entries
  categories: CategoryTreeNode[]; // For CategoryPicker
  onSave: (entry: Partial<IEntry>) => Promise<void>;
  onDelete?: () => Promise<void>;
}

// Default frontmatter for new entries
const defaultFrontmatter: EntryFrontmatter = {
  title: '',
  topics: [],
  tags: [],
  languages: [],
  skillLevel: 3,
  needsHelp: false,
  isPrivate: false,
  resources: [],
  relatedEntries: [],
};

export function EntryEditor({ entry, categories, onSave, onDelete }: EntryEditorProps) {
  // Get current theme for Monaco editor (Requirement 6.10)
  const { theme } = useTheme();

  // Editor state
  const [slug, setSlug] = useState(entry?.slug || '');
  const [status, setStatus] = useState<'draft' | 'published'>(entry?.status || 'draft');
  const [categoryId, setCategoryId] = useState(entry?.categoryId || '');
  const [frontmatter, setFrontmatter] = useState<EntryFrontmatter>(
    entry?.frontmatter || defaultFrontmatter
  );
  const [body, setBody] = useState(entry?.body || '');

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle save
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setError(null);

    try {
      await onSave({
        ...(entry?._id && { _id: entry._id }),
        slug: slug || undefined,
        categoryId,
        status,
        frontmatter,
        body,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save entry');
    } finally {
      setIsSaving(false);
    }
  }, [entry?._id, slug, categoryId, status, frontmatter, body, onSave]);

  // Handle delete
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

  // Handle status toggle
  const handleStatusToggle = useCallback(() => {
    setStatus((prev) => (prev === 'draft' ? 'published' : 'draft'));
  }, []);

  // Handle frontmatter field changes
  const updateFrontmatter = useCallback(
    <K extends keyof EntryFrontmatter>(field: K, value: EntryFrontmatter[K]) => {
      setFrontmatter((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  return (
    <div className="h-full flex flex-col bg-[var(--color-background)]">
      {/* Top Bar */}
      <div className="flex-shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Slug input */}
            <div className="flex items-center gap-2">
              <label htmlFor="slug" className="text-sm text-[var(--color-foreground-muted)]">
                Slug:
              </label>
              <input
                id="slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="auto-generated"
                className="px-2 py-1 text-sm bg-[var(--color-background)] border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] w-48"
              />
            </div>

            {/* Status toggle */}
            <button
              onClick={handleStatusToggle}
              className={`
                px-3 py-1 text-sm font-medium rounded-full transition-colors
                ${
                  status === 'published'
                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                    : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                }
              `}
            >
              {status === 'published' ? 'Published' : 'Draft'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Error message */}
            {error && <span className="text-sm text-[var(--color-error)] mr-2">{error}</span>}

            {/* Delete button */}
            {onDelete && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3 py-1.5 text-sm font-medium text-[var(--color-error)] hover:bg-[var(--color-error)]/10 rounded-md transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            )}

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={isSaving || !frontmatter.title || !categoryId}
              className="px-4 py-1.5 text-sm font-medium bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Split Layout */}
      <div className="flex-1 min-h-0">
        <Group orientation="horizontal" className="h-full">
          {/* Left Panel: Frontmatter Form */}
          <Panel defaultSize={25} minSize={15} maxSize={40}>
            <div className="h-full overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-background-secondary)]">
              <div className="p-4 space-y-4">
                <h3 className="text-sm font-semibold text-[var(--color-foreground)] uppercase tracking-wider">
                  Metadata
                </h3>

                {/* Title */}
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

                {/* Category */}
                <div>
                  <label
                    htmlFor="category"
                    className="block text-sm font-medium text-[var(--color-foreground-muted)] mb-1"
                  >
                    Category *
                  </label>
                  <select
                    id="category"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[var(--color-background)] border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  >
                    <option value="">Select a category</option>
                    {renderCategoryOptions(categories)}
                  </select>
                </div>

                {/* Topics */}
                <div>
                  <label
                    htmlFor="topics"
                    className="block text-sm font-medium text-[var(--color-foreground-muted)] mb-1"
                  >
                    Topics
                  </label>
                  <input
                    id="topics"
                    type="text"
                    value={frontmatter.topics.join(', ')}
                    onChange={(e) =>
                      updateFrontmatter(
                        'topics',
                        e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean)
                      )
                    }
                    className="w-full px-3 py-2 text-sm bg-[var(--color-background)] border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    placeholder="Comma-separated topics"
                  />
                </div>

                {/* Tags */}
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

                {/* Languages */}
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

                {/* Skill Level */}
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

                {/* Checkboxes */}
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
            </div>
          </Panel>

          <Separator className="w-1 bg-[var(--color-border)] hover:bg-[var(--color-primary)] transition-colors cursor-col-resize" />

          {/* Center Panel: Monaco Editor */}
          <Panel defaultSize={40} minSize={25}>
            <div className="h-full flex flex-col">
              <div className="flex-shrink-0 px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                <span className="text-sm font-medium text-[var(--color-foreground)]">Editor</span>
              </div>
              <div className="flex-1 min-h-0">
                {/* Monaco editor with theme sync (Requirements 6.9, 6.10) */}
                <MonacoPane value={body} onChange={setBody} theme={theme} />
              </div>
            </div>
          </Panel>

          <Separator className="w-1 bg-[var(--color-border)] hover:bg-[var(--color-primary)] transition-colors cursor-col-resize" />

          {/* Right Panel: Preview */}
          <Panel defaultSize={35} minSize={20}>
            <div className="h-full flex flex-col">
              <div className="flex-shrink-0 px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                <span className="text-sm font-medium text-[var(--color-foreground)]">Preview</span>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto relative">
                {/* Live preview with 600ms debounce (Requirements 6.3, 6.4, 6.5) */}
                <PreviewPane mdx={body} />
              </div>
            </div>
          </Panel>
        </Group>
      </div>
    </div>
  );
}

// Helper function to render category options with indentation
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
