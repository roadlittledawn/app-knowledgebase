'use client';

/**
 * FrontmatterForm Component
 * Separate form for editing all frontmatter fields
 *
 * Requirements:
 * - 6.6: Provide a separate form for editing frontmatter fields
 *   (title, tags, languages, skillLevel, needsHelp, isPrivate, resources, relatedEntries)
 */

import { useCallback, useEffect, useState } from 'react';
import type { EntryFrontmatter, Resource } from '@/types/entry';
import type { CategoryTreeNode } from '@/types/category';

interface FrontmatterFormProps {
  frontmatter: EntryFrontmatter;
  onChange: (frontmatter: EntryFrontmatter) => void;
  categoryId: string;
  onCategoryChange: (categoryId: string) => void;
  categories: CategoryTreeNode[];
}

export function FrontmatterForm({
  frontmatter,
  onChange,
  categoryId,
  onCategoryChange,
  categories,
}: FrontmatterFormProps) {
  // Handle frontmatter field changes
  const updateField = useCallback(
    <K extends keyof EntryFrontmatter>(field: K, value: EntryFrontmatter[K]) => {
      onChange({ ...frontmatter, [field]: value });
    },
    [frontmatter, onChange]
  );

  // Local text state for comma-separated inputs so users can type commas
  // without the trailing separator being stripped by filter(Boolean)
  const [tagsText, setTagsText] = useState(frontmatter.tags.join(', '));
  const [languagesText, setLanguagesText] = useState(frontmatter.languages.join(', '));

  // Sync from external frontmatter changes
  useEffect(() => {
    const currentParsed = tagsText.split(',').map((s) => s.trim()).filter(Boolean);
    const tags = frontmatter.tags;
    if (currentParsed.length !== tags.length || currentParsed.some((v, i) => v !== tags[i])) {
      setTagsText(tags.join(', '));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frontmatter.tags]);

  useEffect(() => {
    const currentParsed = languagesText.split(',').map((s) => s.trim()).filter(Boolean);
    const langs = frontmatter.languages;
    if (currentParsed.length !== langs.length || currentParsed.some((v, i) => v !== langs[i])) {
      setLanguagesText(langs.join(', '));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frontmatter.languages]);

  // Handle adding a new resource
  const addResource = useCallback(() => {
    const newResource: Resource = { title: '', linkUrl: '' };
    updateField('resources', [...frontmatter.resources, newResource]);
  }, [frontmatter.resources, updateField]);

  // Handle updating a resource
  const updateResource = useCallback(
    (index: number, field: keyof Resource, value: string) => {
      const updatedResources = frontmatter.resources.map((resource, i) =>
        i === index ? { ...resource, [field]: value } : resource
      );
      updateField('resources', updatedResources);
    },
    [frontmatter.resources, updateField]
  );

  // Handle removing a resource
  const removeResource = useCallback(
    (index: number) => {
      const updatedResources = frontmatter.resources.filter((_, i) => i !== index);
      updateField('resources', updatedResources);
    },
    [frontmatter.resources, updateField]
  );

  // Handle adding a related entry
  const addRelatedEntry = useCallback(() => {
    updateField('relatedEntries', [...frontmatter.relatedEntries, '']);
  }, [frontmatter.relatedEntries, updateField]);

  // Handle updating a related entry
  const updateRelatedEntry = useCallback(
    (index: number, value: string) => {
      const updatedEntries = frontmatter.relatedEntries.map((entry, i) =>
        i === index ? value : entry
      );
      updateField('relatedEntries', updatedEntries);
    },
    [frontmatter.relatedEntries, updateField]
  );

  // Handle removing a related entry
  const removeRelatedEntry = useCallback(
    (index: number) => {
      const updatedEntries = frontmatter.relatedEntries.filter((_, i) => i !== index);
      updateField('relatedEntries', updatedEntries);
    },
    [frontmatter.relatedEntries, updateField]
  );

  return (
    <div className="h-full overflow-y-auto bg-[var(--color-background-secondary)]">
      <div className="p-4 space-y-4">
        <h3 className="text-sm font-semibold text-[var(--color-foreground)] uppercase tracking-wider">
          Metadata
        </h3>

        {/* Title */}
        <div>
          <label
            htmlFor="frontmatter-title"
            className="block text-sm font-medium text-[var(--color-foreground-muted)] mb-1"
          >
            Title *
          </label>
          <input
            id="frontmatter-title"
            type="text"
            value={frontmatter.title}
            onChange={(e) => updateField('title', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-[var(--color-background)] border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            placeholder="Entry title"
          />
        </div>

        {/* Category */}
        <div>
          <label
            htmlFor="frontmatter-category"
            className="block text-sm font-medium text-[var(--color-foreground-muted)] mb-1"
          >
            Category *
          </label>
          <select
            id="frontmatter-category"
            value={categoryId}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-[var(--color-background)] border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="">Select a category</option>
            {renderCategoryOptions(categories)}
          </select>
        </div>

        {/* Tags */}
        <div>
          <label
            htmlFor="frontmatter-tags"
            className="block text-sm font-medium text-[var(--color-foreground-muted)] mb-1"
          >
            Tags
          </label>
          <input
            id="frontmatter-tags"
            type="text"
            value={tagsText}
            onChange={(e) => {
              setTagsText(e.target.value);
              updateField(
                'tags',
                e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
              );
            }}
            onBlur={() => {
              const parsed = tagsText.split(',').map((s) => s.trim()).filter(Boolean);
              setTagsText(parsed.join(', '));
            }}
            className="w-full px-3 py-2 text-sm bg-[var(--color-background)] border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            placeholder="Comma-separated tags"
          />
        </div>

        {/* Languages */}
        <div>
          <label
            htmlFor="frontmatter-languages"
            className="block text-sm font-medium text-[var(--color-foreground-muted)] mb-1"
          >
            Languages
          </label>
          <input
            id="frontmatter-languages"
            type="text"
            value={languagesText}
            onChange={(e) => {
              setLanguagesText(e.target.value);
              updateField(
                'languages',
                e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
              );
            }}
            onBlur={() => {
              const parsed = languagesText.split(',').map((s) => s.trim()).filter(Boolean);
              setLanguagesText(parsed.join(', '));
            }}
            className="w-full px-3 py-2 text-sm bg-[var(--color-background)] border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            placeholder="Comma-separated languages"
          />
        </div>

        {/* Skill Level */}
        <div>
          <label
            htmlFor="frontmatter-skillLevel"
            className="block text-sm font-medium text-[var(--color-foreground-muted)] mb-1"
          >
            Skill Level
          </label>
          <select
            id="frontmatter-skillLevel"
            value={frontmatter.skillLevel}
            onChange={(e) =>
              updateField('skillLevel', parseInt(e.target.value) as 1 | 2 | 3 | 4 | 5)
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
              onChange={(e) => updateField('needsHelp', e.target.checked)}
              className="rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
            />
            <span className="text-sm text-[var(--color-foreground)]">Needs Help</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={frontmatter.isPrivate}
              onChange={(e) => updateField('isPrivate', e.target.checked)}
              className="rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
            />
            <span className="text-sm text-[var(--color-foreground)]">Private</span>
          </label>
        </div>

        {/* Resources Section */}
        <div className="pt-4 border-t border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-[var(--color-foreground-muted)]">
              Resources
            </label>
            <button
              type="button"
              onClick={addResource}
              className="px-2 py-1 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded transition-colors"
            >
              + Add Resource
            </button>
          </div>
          <div className="space-y-3">
            {frontmatter.resources.map((resource, index) => (
              <div
                key={index}
                className="p-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-md space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--color-foreground-muted)]">
                    Resource {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeResource(index)}
                    className="text-xs text-[var(--color-error)] hover:text-[var(--color-error-hover)] transition-colors"
                  >
                    Remove
                  </button>
                </div>
                <input
                  type="text"
                  value={resource.title}
                  onChange={(e) => updateResource(index, 'title', e.target.value)}
                  placeholder="Resource title"
                  className="w-full px-2 py-1.5 text-sm bg-[var(--color-background-secondary)] border border-[var(--color-border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                <input
                  type="url"
                  value={resource.linkUrl}
                  onChange={(e) => updateResource(index, 'linkUrl', e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-2 py-1.5 text-sm bg-[var(--color-background-secondary)] border border-[var(--color-border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
            ))}
            {frontmatter.resources.length === 0 && (
              <p className="text-xs text-[var(--color-foreground-muted)] italic">
                No resources added yet
              </p>
            )}
          </div>
        </div>

        {/* Related Entries Section */}
        <div className="pt-4 border-t border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-[var(--color-foreground-muted)]">
              Related Entries
            </label>
            <button
              type="button"
              onClick={addRelatedEntry}
              className="px-2 py-1 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded transition-colors"
            >
              + Add Entry
            </button>
          </div>
          <div className="space-y-2">
            {frontmatter.relatedEntries.map((entryId, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={entryId}
                  onChange={(e) => updateRelatedEntry(index, e.target.value)}
                  placeholder="Entry ID"
                  className="flex-1 px-2 py-1.5 text-sm bg-[var(--color-background)] border border-[var(--color-border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                <button
                  type="button"
                  onClick={() => removeRelatedEntry(index)}
                  className="px-2 py-1.5 text-xs text-[var(--color-error)] hover:bg-[var(--color-error)]/10 rounded transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
            {frontmatter.relatedEntries.length === 0 && (
              <p className="text-xs text-[var(--color-foreground-muted)] italic">
                No related entries added yet
              </p>
            )}
          </div>
        </div>
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
