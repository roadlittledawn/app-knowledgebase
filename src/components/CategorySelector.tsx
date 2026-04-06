'use client';

/**
 * CategorySelector Component
 * Searchable dropdown with tree navigation for selecting categories.
 *
 * Features:
 * - Type-to-search with fuzzy matching across all categories
 * - Expandable/collapsible tree navigation in dropdown
 * - Keyboard navigation (arrows, Enter, Escape)
 * - Shows selected category with breadcrumb path
 * - Inline category creation
 * - Click-outside-to-close
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { CategoryTreeNode } from '@/types/category';
import { ChevronRight, ChevronDown, Plus, Search, X, Check, FolderTree } from 'lucide-react';

const ENTRY_COUNT_BADGE_CLASS =
  'text-xs px-1.5 py-0.5 rounded-full bg-[var(--color-surface)] text-[var(--color-foreground-muted)]';

function EntryCountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return <span className={ENTRY_COUNT_BADGE_CLASS}>{count}</span>;
}

function SelectedCheck() {
  return <Check className="w-4 h-4 text-[var(--color-primary)] flex-shrink-0" />;
}

interface CategorySelectorProps {
  tree: CategoryTreeNode[];
  selectedCategoryId: string;
  onChange: (categoryId: string) => void;
  onCreateCategory?: (name: string, parentId: string | null) => Promise<void>;
}

/** Flattened category with path info for search */
interface FlatCategory {
  _id: string;
  name: string;
  path: string[]; // ancestor names from root to this node
  fullPath: string; // "Parent > Child > Grandchild"
  entryCount: number;
}

/** Flatten tree into searchable list */
function flattenTree(
  nodes: CategoryTreeNode[],
  ancestors: string[] = []
): FlatCategory[] {
  const result: FlatCategory[] = [];
  for (const node of nodes) {
    const path = [...ancestors, node.name];
    result.push({
      _id: node._id,
      name: node.name,
      path,
      fullPath: path.join(' › '),
      entryCount: node.entryCount,
    });
    if (node.children.length > 0) {
      result.push(...flattenTree(node.children, path));
    }
  }
  return result;
}

/** Simple fuzzy match: checks if all characters of query appear in order in target */
function fuzzyMatch(query: string, target: string): { match: boolean; score: number } {
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  // Exact substring match gets highest priority
  if (t.includes(q)) {
    const idx = t.indexOf(q);
    // Prefer matches at start of word
    return { match: true, score: idx === 0 ? 100 : 90 };
  }

  // Fuzzy: all chars in order
  let qi = 0;
  let consecutiveBonus = 0;
  let lastMatchIdx = -2;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      if (ti === lastMatchIdx + 1) consecutiveBonus += 5;
      lastMatchIdx = ti;
      qi++;
    }
  }

  if (qi === q.length) {
    return { match: true, score: 50 + consecutiveBonus };
  }

  return { match: false, score: 0 };
}

/** Find category name by ID in tree */
function findCategoryById(
  nodes: CategoryTreeNode[],
  id: string,
  ancestors: string[] = []
): { name: string; path: string[] } | null {
  for (const node of nodes) {
    const path = [...ancestors, node.name];
    if (node._id === id) return { name: node.name, path };
    if (node.children.length > 0) {
      const found = findCategoryById(node.children, id, path);
      if (found) return found;
    }
  }
  return null;
}

/** Collect all ancestor IDs of a target node */
function getAncestorIds(
  nodes: CategoryTreeNode[],
  targetId: string,
  path: string[] = []
): string[] | null {
  for (const node of nodes) {
    if (node._id === targetId) return path;
    if (node.children.length > 0) {
      const found = getAncestorIds(node.children, targetId, [...path, node._id]);
      if (found) return found;
    }
  }
  return null;
}

export function CategorySelector({
  tree,
  selectedCategoryId,
  onChange,
  onCreateCategory,
}: CategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    // Auto-expand to show selected category
    if (selectedCategoryId) {
      const ancestors = getAncestorIds(tree, selectedCategoryId);
      return new Set(ancestors || []);
    }
    return new Set();
  });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);

  // Flatten tree for search
  const flatCategories = useMemo(() => flattenTree(tree), [tree]);

  // Get selected category info
  const selectedInfo = useMemo(() => {
    if (!selectedCategoryId) return null;
    return findCategoryById(tree, selectedCategoryId);
  }, [tree, selectedCategoryId]);

  // Filter categories based on search
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.trim();
    return flatCategories
      .map((cat) => {
        // Match against name and full path
        const nameMatch = fuzzyMatch(query, cat.name);
        const pathMatch = fuzzyMatch(query, cat.fullPath);
        const bestScore = Math.max(nameMatch.score, pathMatch.score);
        return {
          ...cat,
          match: nameMatch.match || pathMatch.match,
          score: bestScore,
        };
      })
      .filter((cat) => cat.match)
      .sort((a, b) => b.score - a.score);
  }, [flatCategories, searchQuery]);

  const isSearching = searchQuery.trim().length > 0;

  // Re-expand to selected when tree changes
  useEffect(() => {
    if (selectedCategoryId) {
      const ancestors = getAncestorIds(tree, selectedCategoryId);
      if (ancestors) {
        setExpandedIds((prev) => {
          const next = new Set(prev);
          ancestors.forEach((id) => next.add(id));
          return next;
        });
      }
    }
  }, [tree, selectedCategoryId]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        setShowCreateForm(false);
        setHighlightedIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Focus create input when form appears
  useEffect(() => {
    if (showCreateForm) {
      createInputRef.current?.focus();
    }
  }, [showCreateForm]);

  // Reset highlighted index when search changes
  useEffect(() => {
    setHighlightedIndex(isSearching && searchResults.length > 0 ? 0 : -1);
  }, [searchResults, isSearching]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setSearchQuery('');
    setHighlightedIndex(-1);
    // Focus input after dropdown opens
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const handleSelect = useCallback(
    (categoryId: string) => {
      onChange(categoryId);
      setIsOpen(false);
      setSearchQuery('');
      setShowCreateForm(false);
      setHighlightedIndex(-1);
    },
    [onChange]
  );

  const handleToggleExpand = useCallback((categoryId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
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

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange('');
      setSearchQuery('');
    },
    [onChange]
  );

  const handleCreateCategory = useCallback(async () => {
    if (!onCreateCategory || !newCategoryName.trim()) return;
    setIsCreating(true);
    setCreateError(null);
    try {
      await onCreateCategory(newCategoryName.trim(), createParentId);
      setNewCategoryName('');
      setShowCreateForm(false);
      setCreateParentId(null);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create category');
    } finally {
      setIsCreating(false);
    }
  }, [onCreateCategory, newCategoryName, createParentId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
          e.preventDefault();
          handleOpen();
        }
        return;
      }

      if (isSearching) {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setHighlightedIndex((prev) =>
              prev < searchResults.length - 1 ? prev + 1 : 0
            );
            break;
          case 'ArrowUp':
            e.preventDefault();
            setHighlightedIndex((prev) =>
              prev > 0 ? prev - 1 : searchResults.length - 1
            );
            break;
          case 'Enter':
            e.preventDefault();
            if (highlightedIndex >= 0 && highlightedIndex < searchResults.length) {
              const result = searchResults[highlightedIndex];
              if (result) handleSelect(result._id);
            }
            break;
          case 'Escape':
            e.preventDefault();
            if (searchQuery) {
              setSearchQuery('');
            } else {
              setIsOpen(false);
            }
            break;
        }
      } else {
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsOpen(false);
          setShowCreateForm(false);
        }
      }
    },
    [isOpen, isSearching, searchResults, highlightedIndex, handleOpen, handleSelect, searchQuery]
  );

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && dropdownRef.current) {
      const items = dropdownRef.current.querySelectorAll('[data-search-item]');
      items[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger / Display */}
      <button
        type="button"
        onClick={isOpen ? () => setIsOpen(false) : handleOpen}
        onKeyDown={handleKeyDown}
        className={`
          w-full flex items-center gap-2 px-3 py-2 text-sm text-left
          bg-[var(--color-background)] border rounded-md
          transition-colors cursor-pointer
          ${isOpen ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]' : 'border-[var(--color-border)]'}
          focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]
        `}
      >
        <FolderTree className="w-4 h-4 text-[var(--color-foreground-muted)] flex-shrink-0" />
        {selectedInfo ? (
          <span className="flex-1 truncate">
            {selectedInfo.path.length > 1 ? (
              <>
                <span className="text-[var(--color-foreground-muted)]">
                  {selectedInfo.path.slice(0, -1).join(' › ')}{' › '}
                </span>
                <span className="text-[var(--color-foreground)]">{selectedInfo.name}</span>
              </>
            ) : (
              <span className="text-[var(--color-foreground)]">{selectedInfo.name}</span>
            )}
          </span>
        ) : (
          <span className="flex-1 text-[var(--color-foreground-muted)]">Select a category</span>
        )}
        {selectedCategoryId && (
          <span
            onClick={handleClear}
            className="flex-shrink-0 p-0.5 rounded hover:bg-[var(--color-surface-hover)] text-[var(--color-foreground-muted)]"
            title="Clear selection"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        )}
        <ChevronDown
          className={`w-4 h-4 text-[var(--color-foreground-muted)] flex-shrink-0 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-md shadow-lg max-h-80 flex flex-col">
          {/* Search input */}
          <div className="flex-shrink-0 p-2 border-b border-[var(--color-border)]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-foreground-muted)]" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search categories..."
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                autoComplete="off"
              />
            </div>
          </div>

          {/* Scrollable content area */}
          <div ref={dropdownRef} className="flex-1 overflow-y-auto py-1">
            {isSearching ? (
              // Search results (flat list)
              searchResults.length > 0 ? (
                searchResults.map((cat, idx) => (
                  <button
                    key={cat._id}
                    type="button"
                    data-search-item
                    onClick={() => handleSelect(cat._id)}
                    className={`
                      w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left
                      transition-colors
                      ${
                        cat._id === selectedCategoryId
                          ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                          : highlightedIndex === idx
                            ? 'bg-[var(--color-surface-hover)]'
                            : 'hover:bg-[var(--color-surface-hover)]'
                      }
                    `}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{cat.name}</div>
                      {cat.path.length > 1 && (
                        <div className="truncate text-xs text-[var(--color-foreground-muted)]">
                          {cat.path.slice(0, -1).join(' › ')}
                        </div>
                      )}
                    </div>
                    <EntryCountBadge count={cat.entryCount} />
                    {cat._id === selectedCategoryId && <SelectedCheck />}
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-center text-sm text-[var(--color-foreground-muted)]">
                  No categories match &quot;{searchQuery}&quot;
                </div>
              )
            ) : (
              // Tree view
              <>
                {tree.length > 0 ? (
                  tree.map((node) => (
                    <TreeNode
                      key={node._id}
                      node={node}
                      level={0}
                      selectedCategoryId={selectedCategoryId}
                      expandedIds={expandedIds}
                      onSelect={handleSelect}
                      onToggle={handleToggleExpand}
                      canCreate={!!onCreateCategory}
                      onStartCreate={(parentId) => {
                        setCreateParentId(parentId);
                        setShowCreateForm(true);
                        setCreateError(null);
                        setNewCategoryName('');
                      }}
                    />
                  ))
                ) : (
                  <div className="px-3 py-4 text-center text-sm text-[var(--color-foreground-muted)]">
                    No categories yet
                  </div>
                )}
              </>
            )}
          </div>

          {/* Create category section */}
          {onCreateCategory && (
            <div className="flex-shrink-0 border-t border-[var(--color-border)]">
              {showCreateForm ? (
                <div className="p-2 space-y-2">
                  {createParentId && (
                    <div className="text-xs text-[var(--color-foreground-muted)]">
                      Creating under:{' '}
                      <span className="font-medium">
                        {findCategoryById(tree, createParentId)?.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCreateParentId(null)}
                        className="ml-1 text-[var(--color-primary)] hover:underline"
                      >
                        (change to root)
                      </button>
                    </div>
                  )}
                  <div className="flex gap-1.5">
                    <input
                      ref={createInputRef}
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newCategoryName.trim()) {
                          e.preventDefault();
                          handleCreateCategory();
                        }
                        if (e.key === 'Escape') {
                          setShowCreateForm(false);
                        }
                      }}
                      placeholder="New category name"
                      disabled={isCreating}
                      className="flex-1 px-2 py-1.5 text-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      disabled={!newCategoryName.trim() || isCreating}
                      className="px-2.5 py-1.5 text-sm font-medium bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      {isCreating ? '...' : 'Add'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(false);
                        setCreateError(null);
                      }}
                      className="px-2 py-1.5 text-sm text-[var(--color-foreground-muted)] hover:bg-[var(--color-surface-hover)] rounded transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {createError && (
                    <p className="text-xs text-[var(--color-error)]">{createError}</p>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setCreateParentId(null);
                    setShowCreateForm(true);
                    setCreateError(null);
                    setNewCategoryName('');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New category</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Tree node component for the dropdown */
interface TreeNodeProps {
  node: CategoryTreeNode;
  level: number;
  selectedCategoryId: string;
  expandedIds: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string, e?: React.MouseEvent) => void;
  canCreate: boolean;
  onStartCreate: (parentId: string) => void;
}

function TreeNode({
  node,
  level,
  selectedCategoryId,
  expandedIds,
  onSelect,
  onToggle,
  canCreate,
  onStartCreate,
}: TreeNodeProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node._id);
  const isSelected = node._id === selectedCategoryId;

  return (
    <div>
      <div
        className={`
          group flex items-center gap-1 pr-2 py-1.5 text-sm cursor-pointer
          transition-colors
          ${
            isSelected
              ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
              : 'hover:bg-[var(--color-surface-hover)] text-[var(--color-foreground)]'
          }
        `}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect(node._id)}
      >
        {/* Expand/collapse */}
        {hasChildren ? (
          <span
            onClick={(e) => onToggle(node._id, e)}
            className="flex-shrink-0 w-4 h-4 flex items-center justify-center"
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </span>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}

        {/* Name */}
        <span className="flex-1 truncate">{node.name}</span>

        {/* Entry count */}
        <EntryCountBadge count={node.entryCount} />

        {/* Selected check */}
        {isSelected && <SelectedCheck />}

        {/* Add child button */}
        {canCreate && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              // Expand this node if collapsed
              if (!isExpanded && hasChildren) {
                onToggle(node._id);
              }
              onStartCreate(node._id);
            }}
            className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-0.5 rounded hover:bg-[var(--color-surface)] text-[var(--color-foreground-muted)] transition-all"
            title={`Add child under "${node.name}"`}
          >
            <Plus className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child._id}
              node={child}
              level={level + 1}
              selectedCategoryId={selectedCategoryId}
              expandedIds={expandedIds}
              onSelect={onSelect}
              onToggle={onToggle}
              canCreate={canCreate}
              onStartCreate={onStartCreate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
