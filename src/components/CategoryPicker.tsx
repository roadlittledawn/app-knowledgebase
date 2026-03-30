'use client';

/**
 * CategoryPicker Component
 * Tree-based category selector with inline category creation
 *
 * Requirements:
 * - 3.11: Provide a CategoryPicker component that displays the category tree for selection
 * - 3.12: Allow creating new child categories inline without leaving the editor
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { CategoryTreeNode, ICategory } from '@/types/category';

interface CategoryPickerProps {
  tree: CategoryTreeNode[];
  selectedCategoryId?: string;
  onChange: (categoryId: string) => void;
  onCreateCategory?: (name: string, parentId: string | null) => Promise<ICategory>;
}

interface CategoryPickerNodeProps {
  node: CategoryTreeNode;
  level: number;
  selectedCategoryId?: string;
  expandedIds: Set<string>;
  creatingParentId: string | null;
  onSelect: (categoryId: string) => void;
  onToggle: (categoryId: string) => void;
  onStartCreate: (parentId: string | null) => void;
  onCancelCreate: () => void;
  onSubmitCreate: (name: string) => void;
  canCreate: boolean;
}

function CategoryPickerNode({
  node,
  level,
  selectedCategoryId,
  expandedIds,
  creatingParentId,
  onSelect,
  onToggle,
  onStartCreate,
  onCancelCreate,
  onSubmitCreate,
  canCreate,
}: CategoryPickerNodeProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node._id);
  const isSelected = selectedCategoryId === node._id;
  const isCreatingChild = creatingParentId === node._id;

  const handleClick = () => {
    onSelect(node._id);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(node._id);
  };

  const handleAddChild = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Expand the node when adding a child
    if (!isExpanded) {
      onToggle(node._id);
    }
    onStartCreate(node._id);
  };

  return (
    <div>
      <div
        className={`
          group flex items-center gap-1 px-2 py-1.5 text-sm rounded-md cursor-pointer
          transition-colors duration-150
          ${
            isSelected
              ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
              : 'hover:bg-[var(--color-surface-hover)] text-[var(--color-foreground)]'
          }
        `}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
      >
        {/* Expand/collapse toggle */}
        {hasChildren || isCreatingChild ? (
          <span
            onClick={handleToggle}
            className="flex-shrink-0 w-4 h-4 flex items-center justify-center"
          >
            <svg
              className={`w-3 h-3 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        ) : (
          <span className="w-4" />
        )}

        {/* Category name */}
        <span className="flex-1 truncate">{node.name}</span>

        {/* Entry count badge */}
        {node.entryCount > 0 && (
          <span
            className={`
              text-xs px-1.5 py-0.5 rounded-full
              ${
                isSelected
                  ? 'bg-[var(--color-primary-foreground)]/20 text-[var(--color-primary-foreground)]'
                  : 'bg-[var(--color-surface)] text-[var(--color-foreground-muted)]'
              }
            `}
          >
            {node.entryCount}
          </span>
        )}

        {/* Add child button */}
        {canCreate && (
          <button
            type="button"
            onClick={handleAddChild}
            className={`
              opacity-0 group-hover:opacity-100 flex-shrink-0 w-5 h-5 flex items-center justify-center
              rounded transition-all duration-150
              ${
                isSelected
                  ? 'hover:bg-[var(--color-primary-foreground)]/20 text-[var(--color-primary-foreground)]'
                  : 'hover:bg-[var(--color-surface)] text-[var(--color-foreground-muted)]'
              }
            `}
            title="Add child category"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Children and inline create form */}
      {(hasChildren || isCreatingChild) && isExpanded && (
        <div>
          {node.children.map((child) => (
            <CategoryPickerNode
              key={child._id}
              node={child}
              level={level + 1}
              selectedCategoryId={selectedCategoryId}
              expandedIds={expandedIds}
              creatingParentId={creatingParentId}
              onSelect={onSelect}
              onToggle={onToggle}
              onStartCreate={onStartCreate}
              onCancelCreate={onCancelCreate}
              onSubmitCreate={onSubmitCreate}
              canCreate={canCreate}
            />
          ))}
          {isCreatingChild && (
            <InlineCreateForm
              level={level + 1}
              onCancel={onCancelCreate}
              onSubmit={onSubmitCreate}
            />
          )}
        </div>
      )}
    </div>
  );
}

interface InlineCreateFormProps {
  level: number;
  onCancel: () => void;
  onSubmit: (name: string) => void;
}

function InlineCreateForm({ level, onCancel, onSubmit }: InlineCreateFormProps) {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || isSubmitting) return;

    setIsSubmitting(true);
    try {
      onSubmit(trimmedName);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-1 px-2 py-1"
      style={{ paddingLeft: `${level * 16 + 8}px` }}
    >
      <span className="w-4" />
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Category name"
        disabled={isSubmitting}
        className="flex-1 px-2 py-1 text-sm bg-[var(--color-background)] border border-[var(--color-border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={!name.trim() || isSubmitting}
        className="p-1 text-[var(--color-success)] hover:bg-[var(--color-success)]/10 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Create category"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={isSubmitting}
        className="p-1 text-[var(--color-error)] hover:bg-[var(--color-error)]/10 rounded disabled:opacity-50 transition-colors"
        title="Cancel"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </form>
  );
}

export function CategoryPicker({
  tree,
  selectedCategoryId,
  onChange,
  onCreateCategory,
}: CategoryPickerProps) {
  // Track expanded categories
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    // Auto-expand categories that contain the selected category
    const expanded = new Set<string>();
    if (selectedCategoryId) {
      const findAndExpand = (nodes: CategoryTreeNode[], path: string[] = []): boolean => {
        for (const node of nodes) {
          if (node._id === selectedCategoryId) {
            path.forEach((id) => expanded.add(id));
            return true;
          }
          if (node.children.length > 0) {
            if (findAndExpand(node.children, [...path, node._id])) {
              return true;
            }
          }
        }
        return false;
      };
      findAndExpand(tree);
    }
    return expanded;
  });

  // Track which parent we're creating a child for (null = root level)
  const [creatingParentId, setCreatingParentId] = useState<string | null | undefined>(undefined);

  const handleToggle = useCallback((categoryId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  const handleStartCreate = useCallback((parentId: string | null) => {
    setCreatingParentId(parentId);
  }, []);

  const handleCancelCreate = useCallback(() => {
    setCreatingParentId(undefined);
  }, []);

  const handleSubmitCreate = useCallback(
    async (name: string) => {
      if (!onCreateCategory || creatingParentId === undefined) return;

      try {
        const newCategory = await onCreateCategory(name, creatingParentId);
        // Select the newly created category
        onChange(newCategory._id);
        // Clear the create form
        setCreatingParentId(undefined);
      } catch (error) {
        console.error('Failed to create category:', error);
        // Keep the form open so user can try again
      }
    },
    [onCreateCategory, creatingParentId, onChange]
  );

  const canCreate = !!onCreateCategory;
  const isCreatingAtRoot = creatingParentId === null;

  return (
    <div className="py-1">
      {/* Root level categories */}
      {tree.map((node) => (
        <CategoryPickerNode
          key={node._id}
          node={node}
          level={0}
          selectedCategoryId={selectedCategoryId}
          expandedIds={expandedIds}
          creatingParentId={creatingParentId ?? null}
          onSelect={onChange}
          onToggle={handleToggle}
          onStartCreate={handleStartCreate}
          onCancelCreate={handleCancelCreate}
          onSubmitCreate={handleSubmitCreate}
          canCreate={canCreate}
        />
      ))}

      {/* Root level inline create form */}
      {isCreatingAtRoot && (
        <InlineCreateForm level={0} onCancel={handleCancelCreate} onSubmit={handleSubmitCreate} />
      )}

      {/* Add root category button */}
      {canCreate && !isCreatingAtRoot && (
        <button
          type="button"
          onClick={() => handleStartCreate(null)}
          className="w-full flex items-center gap-2 px-2 py-1.5 mt-1 text-sm text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-hover)] rounded-md transition-colors"
        >
          <span className="w-4" />
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add category</span>
        </button>
      )}

      {/* Empty state */}
      {tree.length === 0 && !isCreatingAtRoot && (
        <div className="px-2 py-4 text-center text-sm text-[var(--color-foreground-muted)]">
          No categories yet.
          {canCreate && (
            <button
              type="button"
              onClick={() => handleStartCreate(null)}
              className="block mx-auto mt-2 text-[var(--color-primary)] hover:underline"
            >
              Create your first category
            </button>
          )}
        </div>
      )}
    </div>
  );
}
