'use client';

/**
 * EntryEditor Component
 * Main editor component for creating and editing knowledge entries
 */

import { useState, useCallback } from 'react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import type { IEntry, EntryFrontmatter } from '@/types/entry';
import type { CategoryTreeNode } from '@/types/category';
import { MonacoPane } from './MonacoPane';
import { PreviewPane } from './PreviewPane';
import { AIWritingPanel } from './AIWritingPanel';
import { useTheme } from './ThemeProvider';
import { ErrorBoundary } from './ErrorBoundary';

interface EntryEditorProps {
  entry?: IEntry;
  categories: CategoryTreeNode[];
  onSave: (entry: Partial<IEntry>) => Promise<void>;
  onDelete?: () => Promise<void>;
}

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

function EntryEditorInner({ entry, categories, onSave, onDelete }: EntryEditorProps) {
  const { theme } = useTheme();

  const [slug, setSlug] = useState(entry?.slug || '');
  const [status, setStatus] = useState<'draft' | 'published'>(entry?.status || 'draft');
  const [categoryId, setCategoryId] = useState(entry?.categoryId || '');
  const [frontmatter, setFrontmatter] = useState<EntryFrontmatter>(
    entry?.frontmatter || defaultFrontmatter
  );
  const [body, setBody] = useState(entry?.body || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<string | undefined>(undefined);
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [showPreview, setShowPreview] = useState(true);

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

  const handleStatusToggle = useCallback(() => {
    setStatus((prev) => (prev === 'draft' ? 'published' : 'draft'));
  }, []);

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
    },
    [selection]
  );

  // Calculate default layout based on visible panels
  // Layout is an object mapping panel IDs to percentages (0-100)
  const getDefaultLayout = (): { [id: string]: number } => {
    if (showAIPanel && showPreview) {
      return { metadata: 20, editor: 30, preview: 25, ai: 25 };
    }
    if (showAIPanel && !showPreview) {
      return { metadata: 25, editor: 50, ai: 25 };
    }
    if (!showAIPanel && showPreview) {
      return { metadata: 20, editor: 40, preview: 40 };
    }
    return { metadata: 25, editor: 75 };
  };

  // Use a key to force remount when panel visibility changes
  const panelKey = `${showAIPanel}-${showPreview}`;

  return (
    <div className="h-full flex flex-col bg-[var(--color-background)]">
      {/* Top Bar */}
      <div className="flex-shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
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
            <button
              onClick={handleStatusToggle}
              className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${
                status === 'published'
                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
              }`}
            >
              {status === 'published' ? 'Published' : 'Draft'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            {error && <span className="text-sm text-[var(--color-error)] mr-2">{error}</span>}
            {onDelete && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3 py-1.5 text-sm font-medium text-[var(--color-error)] hover:bg-[var(--color-error)]/10 rounded-md transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving || !frontmatter.title || !categoryId}
              className="px-4 py-1.5 text-sm font-medium bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => setShowPreview((prev) => !prev)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                showPreview
                  ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                  : 'bg-[var(--color-surface)] text-[var(--color-foreground)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)]'
              }`}
              title={showPreview ? 'Hide Preview' : 'Show Preview'}
            >
              👁 Preview
            </button>
            <button
              onClick={() => setShowAIPanel((prev) => !prev)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                showAIPanel
                  ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                  : 'bg-[var(--color-surface)] text-[var(--color-foreground)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)]'
              }`}
              title={showAIPanel ? 'Hide AI Assistant' : 'Show AI Assistant'}
            >
              🤖 AI
            </button>
          </div>
        </div>
      </div>

      {/* Panel Layout */}
      <div className="flex-1 min-h-0">
        <PanelGroup
          key={panelKey}
          orientation="horizontal"
          style={{ height: '100%' }}
          defaultLayout={getDefaultLayout()}
        >
          {/* Metadata Panel */}
          <Panel id="metadata" minSize={15} maxSize={35}>
            <div className="h-full overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-background-secondary)]">
              <div className="p-4 space-y-4">
                <h3 className="text-sm font-semibold text-[var(--color-foreground)] uppercase tracking-wider">
                  Metadata
                </h3>
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
            </div>
          </Panel>

          <PanelResizeHandle className="w-1 bg-[var(--color-border)] hover:bg-[var(--color-primary)] transition-colors cursor-col-resize" />

          {/* Editor Panel */}
          <Panel id="editor" minSize={20}>
            <div className="h-full overflow-hidden border-r border-[var(--color-border)]">
              <div className="h-full grid grid-rows-[auto_1fr]">
                <div className="px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                  <span className="text-sm font-medium text-[var(--color-foreground)]">Editor</span>
                </div>
                <div className="min-h-0">
                  <MonacoPane
                    value={body}
                    onChange={setBody}
                    theme={theme}
                    onSelectionChange={handleSelectionChange}
                  />
                </div>
              </div>
            </div>
          </Panel>

          {/* Preview Panel */}
          {showPreview && (
            <>
              <PanelResizeHandle className="w-1 bg-[var(--color-border)] hover:bg-[var(--color-primary)] transition-colors cursor-col-resize" />
              <Panel id="preview" minSize={15}>
                <div className="h-full overflow-hidden border-r border-[var(--color-border)]">
                  <div className="h-full grid grid-rows-[auto_1fr]">
                    <div className="px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                      <span className="text-sm font-medium text-[var(--color-foreground)]">
                        Preview
                      </span>
                    </div>
                    <div className="min-h-0 overflow-y-auto">
                      <PreviewPane mdx={body} />
                    </div>
                  </div>
                </div>
              </Panel>
            </>
          )}

          {/* AI Panel */}
          {showAIPanel && (
            <>
              <PanelResizeHandle className="w-1 bg-[var(--color-border)] hover:bg-[var(--color-primary)] transition-colors cursor-col-resize" />
              <Panel id="ai" minSize={15} maxSize={40}>
                <AIWritingPanel
                  body={body}
                  frontmatter={frontmatter}
                  selection={selection}
                  onApply={handleApplyAIContent}
                />
              </Panel>
            </>
          )}
        </PanelGroup>
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
