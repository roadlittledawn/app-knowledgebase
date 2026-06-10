'use client';

/**
 * CategoryManager Component
 * Admin component for managing categories with CRUD, reordering, and restructuring
 *
 * Requirements: 3.10
 * - 3.10: Provide a category management UI for creating, renaming, reordering,
 *         moving (reparenting), and deleting categories
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  onReorderCategories: (parentId: string | null, orderedIds: string[]) => Promise<void>;
  onRefresh: () => Promise<void>;
}

/** Flattened category for move parent picker */
interface FlatCategory {
  _id: string;
  name: string;
  depth: number;
}

/** Collect all descendant IDs (including self) from a tree node */
function collectDescendantIds(node: CategoryTreeNode): Set<string> {
  const ids = new Set<string>();
  ids.add(node._id);
  for (const child of node.children) {
    for (const id of collectDescendantIds(child)) {
      ids.add(id);
    }
  }
  return ids;
}

/** Flatten a tree into a list with depth info */
function flattenTree(nodes: CategoryTreeNode[], depth = 0): FlatCategory[] {
  const result: FlatCategory[] = [];
  for (const node of nodes) {
    result.push({ _id: node._id, name: node.name, depth });
    result.push(...flattenTree(node.children, depth + 1));
  }
  return result;
}

/** Find a node by ID in the tree */
function findNodeById(nodes: CategoryTreeNode[], id: string): CategoryTreeNode | null {
  for (const node of nodes) {
    if (node._id === id) return node;
    const found = findNodeById(node.children, id);
    if (found) return found;
  }
  return null;
}

/** Get the ordered sibling list (the array containing the node) for a given node ID */
function getSiblings(nodes: CategoryTreeNode[], targetId: string): CategoryTreeNode[] | null {
  if (nodes.some((n) => n._id === targetId)) return nodes;
  for (const node of nodes) {
    const found = getSiblings(node.children, targetId);
    if (found) return found;
  }
  return null;
}

/** Order a list of nodes to match the given ID sequence (ignores unknown IDs) */
function orderById(items: CategoryTreeNode[], orderedIds: string[]): CategoryTreeNode[] {
  const map = new Map(items.map((item) => [item._id, item]));
  return orderedIds
    .map((id) => map.get(id))
    .filter((node): node is CategoryTreeNode => Boolean(node));
}

/**
 * Return a new tree with the children of `parentId` (or the root list when
 * parentId is null) reordered to match `orderedIds`. Other branches are left intact.
 */
function reorderSiblings(
  nodes: CategoryTreeNode[],
  parentId: string | null,
  orderedIds: string[]
): CategoryTreeNode[] {
  if (parentId === null) {
    return orderById(nodes, orderedIds);
  }
  return nodes.map((node) =>
    node._id === parentId
      ? { ...node, children: orderById(node.children, orderedIds) }
      : { ...node, children: reorderSiblings(node.children, parentId, orderedIds) }
  );
}

/** Find the parent ID of a node in the tree */
function findParentId(
  nodes: CategoryTreeNode[],
  targetId: string,
  parentId: string | null = null
): string | null | undefined {
  for (const node of nodes) {
    if (node._id === targetId) return parentId;
    const found = findParentId(node.children, targetId, node._id);
    if (found !== undefined) return found;
  }
  return undefined;
}

interface CategoryNodeProps {
  node: CategoryTreeNode;
  level: number;
  expandedIds: Set<string>;
  editingId: string | null;
  deletingId: string | null;
  movingId: string | null;
  onToggle: (categoryId: string) => void;
  onStartEdit: (categoryId: string) => void;
  onCancelEdit: () => void;
  onSubmitEdit: (id: string, name: string) => void;
  onStartDelete: (categoryId: string) => void;
  onConfirmDelete: (categoryId: string) => void;
  onCancelDelete: () => void;
  onStartMove: (categoryId: string) => void;
  onStartCreate: (parentId: string | null) => void;
  creatingParentId: string | null | undefined;
  onCancelCreate: () => void;
  onSubmitCreate: (name: string) => void;
}

function CategoryNode({
  node,
  level,
  expandedIds,
  editingId,
  deletingId,
  movingId,
  onToggle,
  onStartEdit,
  onCancelEdit,
  onSubmitEdit,
  onStartDelete,
  onConfirmDelete,
  onCancelDelete,
  onStartMove,
  onStartCreate,
  creatingParentId,
  onCancelCreate,
  onSubmitCreate,
}: CategoryNodeProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node._id);
  const isEditing = editingId === node._id;
  const isDeleting = deletingId === node._id;
  const isCreatingChild = creatingParentId === node._id;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node._id,
  });
  const sortableStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

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
    <div ref={setNodeRef} style={sortableStyle}>
      <div
        className="group flex items-center gap-1 px-2 py-1.5 text-sm rounded-md hover:bg-[var(--color-surface-hover)] transition-colors"
        style={{ paddingLeft: `${level * 20 + 8}px` }}
      >
        {/* Drag handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity touch-none"
          title="Drag to reorder"
          aria-label={`Drag to reorder ${node.name}`}
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 4a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM7 10a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM7 16a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM16 4a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM16 10a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM16 16a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
          </svg>
        </button>

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

              {/* Move to different parent */}
              <button
                type="button"
                onClick={() => onStartMove(node._id)}
                className={`p-1 rounded ${
                  movingId === node._id
                    ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10'
                    : 'text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface)]'
                }`}
                title="Move to different parent"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
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
          <SortableContext
            items={node.children.map((c) => c._id)}
            strategy={verticalListSortingStrategy}
          >
            {node.children.map((child) => (
              <CategoryNode
                key={child._id}
                node={child}
                level={level + 1}
                expandedIds={expandedIds}
                editingId={editingId}
                deletingId={deletingId}
                movingId={movingId}
                onToggle={onToggle}
                onStartEdit={onStartEdit}
                onCancelEdit={onCancelEdit}
                onSubmitEdit={onSubmitEdit}
                onStartDelete={onStartDelete}
                onConfirmDelete={onConfirmDelete}
                onCancelDelete={onCancelDelete}
                onStartMove={onStartMove}
                onStartCreate={onStartCreate}
                creatingParentId={creatingParentId}
                onCancelCreate={onCancelCreate}
                onSubmitCreate={onSubmitCreate}
              />
            ))}
          </SortableContext>
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

  // Local copy of the tree so drag-and-drop reorders can be applied optimistically
  // (no refetch / page reload). Kept in sync with the prop for other operations.
  const [localTree, setLocalTree] = useState<CategoryTreeNode[]>(tree);
  useEffect(() => {
    setLocalTree(tree);
  }, [tree]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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

  // Reorder within a sibling group via drag-and-drop. Dragging across different
  // parents is ignored here — reparenting is handled by the dedicated "move" control.
  // The new order is applied optimistically and persisted by renumbering the whole
  // sibling group (avoids duplicate/negative order values).
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activeId = String(active.id);
      const overId = String(over.id);

      const activeParent = findParentId(localTree, activeId) ?? null;
      const overParent = findParentId(localTree, overId) ?? null;
      if (activeParent !== overParent) return;

      const siblings = getSiblings(localTree, activeId);
      if (!siblings) return;
      const ids = siblings.map((s) => s._id);
      const oldIndex = ids.indexOf(activeId);
      const newIndex = ids.indexOf(overId);
      if (oldIndex === -1 || newIndex === -1) return;

      const newOrderedIds = arrayMove(ids, oldIndex, newIndex);
      const previousTree = localTree;

      // Optimistic update, then persist; revert on failure.
      setLocalTree(reorderSiblings(localTree, activeParent, newOrderedIds));
      setError(null);
      onReorderCategories(activeParent, newOrderedIds).catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to reorder category');
        setLocalTree(previousTree);
      });
    },
    [localTree, onReorderCategories]
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

  // --- Move (reparent) handlers ---
  const [movingId, setMovingId] = useState<string | null>(null);
  const [selectedNewParentId, setSelectedNewParentId] = useState<string | null | undefined>(
    undefined
  );
  const [isMoving, setIsMoving] = useState(false);

  const handleStartMove = useCallback(
    (categoryId: string) => {
      // Toggle off if already moving this category
      if (movingId === categoryId) {
        setMovingId(null);
        setSelectedNewParentId(undefined);
        return;
      }
      setMovingId(categoryId);
      setEditingId(null);
      setDeletingId(null);
      setCreatingParentId(undefined);
      // Pre-select the current parent
      const currentParentId = findParentId(localTree, categoryId);
      setSelectedNewParentId(currentParentId ?? null);
    },
    [movingId, localTree]
  );

  const handleCancelMove = useCallback(() => {
    setMovingId(null);
    setSelectedNewParentId(undefined);
  }, []);

  const handleConfirmMove = useCallback(async () => {
    if (!movingId || selectedNewParentId === undefined) return;

    // Check if the parent is actually changing
    const currentParentId = findParentId(localTree, movingId);
    if (selectedNewParentId === currentParentId) {
      setMovingId(null);
      setSelectedNewParentId(undefined);
      return;
    }

    try {
      setError(null);
      setIsMoving(true);
      await onUpdateCategory(movingId, { parentId: selectedNewParentId });
      setMovingId(null);
      setSelectedNewParentId(undefined);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move category');
    } finally {
      setIsMoving(false);
    }
  }, [movingId, selectedNewParentId, localTree, onUpdateCategory, onRefresh]);

  // Compute valid parent options for the moving category
  const moveOptions = (() => {
    if (!movingId) return [];
    const movingNode = findNodeById(localTree, movingId);
    if (!movingNode) return [];
    const excludedIds = collectDescendantIds(movingNode);
    const flat = flattenTree(localTree);
    return flat.filter((c) => !excludedIds.has(c._id));
  })();

  const movingNode = movingId ? findNodeById(localTree, movingId) : null;
  const currentParentIdOfMoving = movingId ? (findParentId(localTree, movingId) ?? null) : null;
  const selectedParentName = (() => {
    if (selectedNewParentId === undefined || selectedNewParentId === null) return null;
    const node = findNodeById(localTree, selectedNewParentId);
    return node?.name ?? null;
  })();
  const isParentChanged =
    selectedNewParentId !== undefined && selectedNewParentId !== currentParentIdOfMoving;

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

      {/* Move panel — shown when a category is selected for moving */}
      {movingId && movingNode && (
        <div className="mb-4 p-4 bg-[var(--color-background-secondary)] border border-[var(--color-border)] rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-[var(--color-foreground)]">
              Move &quot;{movingNode.name}&quot;
            </h4>
            <button
              type="button"
              onClick={handleCancelMove}
              className="text-xs text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] transition-colors"
            >
              Cancel
            </button>
          </div>
          <div className="mb-3">
            <label
              htmlFor="move-parent-select"
              className="block text-xs text-[var(--color-foreground-muted)] mb-1"
            >
              Select new parent:
            </label>
            <select
              id="move-parent-select"
              value={selectedNewParentId ?? '__root__'}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedNewParentId(val === '__root__' ? null : val);
              }}
              className="w-full px-3 py-2 text-sm bg-[var(--color-input)] border border-[var(--color-input-border)] text-[var(--color-foreground)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="__root__">— Root level (no parent) —</option>
              {moveOptions.map((opt) => (
                <option key={opt._id} value={opt._id} aria-label={`${opt.name}, depth level ${opt.depth}`}>
                  {'│ '.repeat(opt.depth)}
                  {opt.name}
                </option>
              ))}
            </select>
          </div>
          {isParentChanged && (
            <p className="text-xs text-[var(--color-foreground-muted)] mb-3">
              &quot;{movingNode.name}&quot; will be moved{' '}
              {selectedNewParentId === null ? (
                'to the root level'
              ) : (
                <>
                  under &quot;{selectedParentName}&quot;
                </>
              )}
              .
            </p>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleConfirmMove}
              disabled={!isParentChanged || isMoving}
              className="px-3 py-1.5 text-sm bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-md hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isMoving ? 'Moving…' : 'Confirm Move'}
            </button>
            <button
              type="button"
              onClick={handleCancelMove}
              disabled={isMoving}
              className="px-3 py-1.5 text-sm border border-[var(--color-border)] rounded-md hover:bg-[var(--color-surface-hover)] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-0.5">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={localTree.map((n) => n._id)}
            strategy={verticalListSortingStrategy}
          >
            {localTree.map((node) => (
              <CategoryNode
                key={node._id}
                node={node}
                level={0}
                expandedIds={expandedIds}
                editingId={editingId}
                deletingId={deletingId}
                movingId={movingId}
                onToggle={handleToggle}
                onStartEdit={handleStartEdit}
                onCancelEdit={handleCancelEdit}
                onSubmitEdit={handleSubmitEdit}
                onStartDelete={handleStartDelete}
                onConfirmDelete={handleConfirmDelete}
                onCancelDelete={handleCancelDelete}
                onStartMove={handleStartMove}
                onStartCreate={handleStartCreate}
                creatingParentId={creatingParentId}
                onCancelCreate={handleCancelCreate}
                onSubmitCreate={handleSubmitCreate}
              />
            ))}
          </SortableContext>
        </DndContext>

        {isCreatingAtRoot && (
          <InlineCreateForm level={0} onCancel={handleCancelCreate} onSubmit={handleSubmitCreate} />
        )}

        {localTree.length === 0 && !isCreatingAtRoot && (
          <div className="py-8 text-center text-sm text-[var(--color-foreground-muted)]">
            No categories yet. Click &quot;Add Category&quot; to create your first one.
          </div>
        )}
      </div>
    </div>
  );
}
