'use client';

/**
 * CategoryManager Component
 * Admin component for managing categories with CRUD and reordering
 *
 * Requirements: 3.10
 * - 3.10: Provide a category management UI for creating, renaming, reordering, and deleting categories
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { CategoryTreeNode, ICategory } from '@/types/category';

interface CreateCategoryRequest {
  name: string;
  slug?: string;
  parentId?: string | null;
  order?: number;
  description?: string;
}

interface UpdateCategoryRequest {
  name?: string;
  slug?: string;
  parentId?: string | null;
  order?: number;
  description?: string;
}

interface CategoryManagerProps {
  tree: CategoryTreeNode[];
  onCreateCategory: (data: CreateCategoryRequest) => Promise<ICategory>;
  onUpdateCategory: (id: string, data: UpdateCategoryRequest) => Promise<ICategory>;
  onDeleteCategory: (id: string) => Promise<void>;
  onReorderCategories: (categoryId: string, newOrder: number) => Promise<void>;
  onRefresh: () => Promise<void>;
}

interface CategoryNodeProps {
  node: CategoryTreeNode;
  level: number;
  expandedIds: Set<string>;
  editingId: string | null;
  deletingId: string | null;
  onToggle: (categoryId: string) => void;
  onStartEdit: (categoryId: string) => void;
  onCancelEdit: () => void;
  onSubmitEdit: (id: string, name: string) => void;
  onStartDelete: (categoryId: string) => void;
  onConfirmDelete: (categoryId: string) => void;
  onCancelDelete: () => void;
  onMoveUp: (categoryId: string, currentOrder: number) => void;
  onMoveDown: (categoryId: string, currentOrder: number) => void;
  onStartCreate: (parentId: string | null) => void;
  creatingParentId: string | null | undefined;
  onCancelCreate: () => void;
  onSubmitCreate: (name: string) => void;
  isFirst: boolean;
  isLast: boolean;
}

function CategoryNode({
  node,
  level,
  expandedIds,
  editingId,
  deletingId,
  onToggle,
  onStartEdit,
  onCancelEdit,
  onSubmitEdit,
  onStartDelete,
  onConfirmDelete,
  onCancelDelete,
  onMoveUp,
  onMoveDown,
  onStartCreate,
  creatingParentId,
  onCancelCreate,
  onSubmitCreate,
  isFirst,
  isLast,
}: CategoryNodeProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node._id);
  const isEditing = editingId === node._id;
  const isDeleting = deletingId === node._id;
  const isCreatingChild = creatingParentId === node._id;

  // Use node.name as initial value
  const [editName, setEditName] = useState(node.name);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Focus and select when editing starts
  useEffect(() => {
    if (isEditing) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [isEditing]);

  // Handler for starting edit - resets name and calls parent
  const handleStartEditClick = () => {
    setEditName(node.name);
    onStartEdit(node._id);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(node._id);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = editName.trim();
    if (trimmed && trimmed !== node.name) {
      onSubmitEdit(node._id, trimmed);
    } else {
      onCancelEdit();
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancelEdit();
    }
  };

  const handleAddChild = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isExpanded) {
      onToggle(node._id);
    }
    onStartCreate(node._id);
  };

  return (
    <div>
      <div
        className="group flex items-center gap-1 px-2 py-1.5 text-sm rounded-md hover:bg-[var(--color-surface-hover)] transition-colors"
        style={{ paddingLeft: `${level * 20 + 8}px` }}
      >
        {/* Expand/collapse toggle */}
        {hasChildren || isCreatingChild ? (
          <button
            type="button"
            onClick={handleToggle}
            className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]"
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <span className="w-5" />
        )}

        {/* Category name or edit form */}
        {isEditing ? (
          <form onSubmit={handleEditSubmit} className="flex-1 flex items-center gap-1">
            <input
              ref={editInputRef}
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleEditKeyDown}
              className="flex-1 px-2 py-0.5 text-sm bg-[var(--color-background)] border border-[var(--color-border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            <button
              type="submit"
              disabled={!editName.trim()}
              className="p-1 text-[var(--color-success)] hover:bg-[var(--color-success)]/10 rounded disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={onCancelEdit}
              className="p-1 text-[var(--color-error)] hover:bg-[var(--color-error)]/10 rounded"
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
        ) : isDeleting ? (
          <div className="flex-1 flex items-center gap-2">
            <span className="text-[var(--color-error)]">Delete &quot;{node.name}&quot;?</span>
            <button
              type="button"
              onClick={() => onConfirmDelete(node._id)}
              className="px-2 py-0.5 text-xs bg-[var(--color-error)] text-[var(--color-error-foreground)] rounded hover:bg-[var(--color-error-hover)]"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={onCancelDelete}
              className="px-2 py-0.5 text-xs border border-[var(--color-border)] rounded hover:bg-[var(--color-surface-hover)]"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <span className="flex-1 text-[var(--color-foreground)]">{node.name}</span>

            {/* Entry count badge */}
            {node.entryCount > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-[var(--color-surface)] text-[var(--color-foreground-muted)]">
                {node.entryCount}
              </span>
            )}

            {/* Action buttons */}
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
              {/* Move up */}
              <button
                type="button"
                onClick={() => onMoveUp(node._id, node.order)}
                disabled={isFirst}
                className="p-1 text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface)] rounded disabled:opacity-30 disabled:cursor-not-allowed"
                title="Move up"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 15l7-7 7 7"
                  />
                </svg>
              </button>

              {/* Move down */}
              <button
                type="button"
                onClick={() => onMoveDown(node._id, node.order)}
                disabled={isLast}
                className="p-1 text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface)] rounded disabled:opacity-30 disabled:cursor-not-allowed"
                title="Move down"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Add child */}
              <button
                type="button"
                onClick={handleAddChild}
                className="p-1 text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface)] rounded"
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

              {/* Edit */}
              <button
                type="button"
                onClick={handleStartEditClick}
                className="p-1 text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface)] rounded"
                title="Rename"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>

              {/* Delete */}
              <button
                type="button"
                onClick={() => onStartDelete(node._id)}
                disabled={node.entryCount > 0}
                className="p-1 text-[var(--color-foreground-muted)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                title={node.entryCount > 0 ? 'Cannot delete: has entries' : 'Delete'}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Children */}
      {(hasChildren || isCreatingChild) && isExpanded && (
        <div>
          {node.children.map((child, index) => (
            <CategoryNode
              key={child._id}
              node={child}
              level={level + 1}
              expandedIds={expandedIds}
              editingId={editingId}
              deletingId={deletingId}
              onToggle={onToggle}
              onStartEdit={onStartEdit}
              onCancelEdit={onCancelEdit}
              onSubmitEdit={onSubmitEdit}
              onStartDelete={onStartDelete}
              onConfirmDelete={onConfirmDelete}
              onCancelDelete={onCancelDelete}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              onStartCreate={onStartCreate}
              creatingParentId={creatingParentId}
              onCancelCreate={onCancelCreate}
              onSubmitCreate={onSubmitCreate}
              isFirst={index === 0}
              isLast={index === node.children.length - 1}
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
      className="flex items-center gap-1 px-2 py-1.5"
      style={{ paddingLeft: `${level * 20 + 8}px` }}
    >
      <span className="w-5" />
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Category name"
        disabled={isSubmitting}
        className="flex-1 px-2 py-0.5 text-sm bg-[var(--color-background)] border border-[var(--color-border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={!name.trim() || isSubmitting}
        className="p-1 text-[var(--color-success)] hover:bg-[var(--color-success)]/10 rounded disabled:opacity-50"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={isSubmitting}
        className="p-1 text-[var(--color-error)] hover:bg-[var(--color-error)]/10 rounded disabled:opacity-50"
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

export function CategoryManager({
  tree,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onReorderCategories,
  onRefresh,
}: CategoryManagerProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [creatingParentId, setCreatingParentId] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

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

  const handleStartEdit = useCallback((categoryId: string) => {
    setEditingId(categoryId);
    setDeletingId(null);
    setCreatingParentId(undefined);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  const handleSubmitEdit = useCallback(
    async (id: string, name: string) => {
      try {
        setError(null);
        await onUpdateCategory(id, { name });
        setEditingId(null);
        await onRefresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update category');
      }
    },
    [onUpdateCategory, onRefresh]
  );

  const handleStartDelete = useCallback((categoryId: string) => {
    setDeletingId(categoryId);
    setEditingId(null);
    setCreatingParentId(undefined);
  }, []);

  const handleConfirmDelete = useCallback(
    async (categoryId: string) => {
      try {
        setError(null);
        await onDeleteCategory(categoryId);
        setDeletingId(null);
        await onRefresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete category');
        setDeletingId(null);
      }
    },
    [onDeleteCategory, onRefresh]
  );

  const handleCancelDelete = useCallback(() => {
    setDeletingId(null);
  }, []);

  const handleMoveUp = useCallback(
    async (categoryId: string, currentOrder: number) => {
      try {
        setError(null);
        await onReorderCategories(categoryId, currentOrder - 1);
        await onRefresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to reorder category');
      }
    },
    [onReorderCategories, onRefresh]
  );

  const handleMoveDown = useCallback(
    async (categoryId: string, currentOrder: number) => {
      try {
        setError(null);
        await onReorderCategories(categoryId, currentOrder + 1);
        await onRefresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to reorder category');
      }
    },
    [onReorderCategories, onRefresh]
  );

  const handleStartCreate = useCallback((parentId: string | null) => {
    setCreatingParentId(parentId);
    setEditingId(null);
    setDeletingId(null);
  }, []);

  const handleCancelCreate = useCallback(() => {
    setCreatingParentId(undefined);
  }, []);

  const handleSubmitCreate = useCallback(
    async (name: string) => {
      try {
        setError(null);
        await onCreateCategory({
          name,
          parentId: creatingParentId,
        });
        setCreatingParentId(undefined);
        await onRefresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create category');
      }
    },
    [onCreateCategory, creatingParentId, onRefresh]
  );

  const isCreatingAtRoot = creatingParentId === null;

  return (
    <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[var(--color-foreground)]">Categories</h3>
        <button
          type="button"
          onClick={() => handleStartCreate(null)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-md hover:bg-[var(--color-primary-hover)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Category
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-[var(--color-error-background)] border border-[var(--color-error)] rounded-md">
          <p className="text-sm text-[var(--color-error)]">{error}</p>
        </div>
      )}

      <div className="space-y-0.5">
        {tree.map((node, index) => (
          <CategoryNode
            key={node._id}
            node={node}
            level={0}
            expandedIds={expandedIds}
            editingId={editingId}
            deletingId={deletingId}
            onToggle={handleToggle}
            onStartEdit={handleStartEdit}
            onCancelEdit={handleCancelEdit}
            onSubmitEdit={handleSubmitEdit}
            onStartDelete={handleStartDelete}
            onConfirmDelete={handleConfirmDelete}
            onCancelDelete={handleCancelDelete}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            onStartCreate={handleStartCreate}
            creatingParentId={creatingParentId}
            onCancelCreate={handleCancelCreate}
            onSubmitCreate={handleSubmitCreate}
            isFirst={index === 0}
            isLast={index === tree.length - 1}
          />
        ))}

        {isCreatingAtRoot && (
          <InlineCreateForm level={0} onCancel={handleCancelCreate} onSubmit={handleSubmitCreate} />
        )}

        {tree.length === 0 && !isCreatingAtRoot && (
          <div className="py-8 text-center text-sm text-[var(--color-foreground-muted)]">
            No categories yet. Click &quot;Add Category&quot; to create your first one.
          </div>
        )}
      </div>
    </div>
  );
}
